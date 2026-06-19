import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function getDoctor(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data: { user }, error } = await supabaseAnon.auth.getUser(token)
  if (error || !user) return null
  const supabase = getSupabaseAdmin()
  const { data: doctor } = await supabase
    .from('doctor')
    .select('id, first_name, last_name')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  return doctor ?? null
}

// GET — list prescriptions pending this doctor's sign-off
// FIX: prescription.consultation_id → consultation.doctor_id (not appointment_id)
export async function GET(req: NextRequest) {
  const doctor = await getDoctor(req)
  if (!doctor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseAdmin()

  // Find consultations belonging to this doctor
  const { data: consultations } = await supabase
    .from('consultation')
    .select('id')
    .eq('doctor_id', doctor.id)

  const consultationIds = (consultations ?? []).map(c => c.id)
  if (consultationIds.length === 0) return NextResponse.json({ prescriptions: [] })

  const { data: prescriptions, error } = await supabase
    .from('prescription')
    .select(`
      id, medicines, instructions, entry_method, verified_by_doctor, created_at,
      consultation:consultation_id (
        id, chief_complaint, diagnosis,
        appointment:appointment_id (
          appointment_date, start_time,
          patient:patient_id ( first_name, last_name )
        )
      )
    `)
    .in('consultation_id', consultationIds)
    .eq('verified_by_doctor', false)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ prescriptions: prescriptions ?? [] })
}

// PATCH — verify a prescription by ID
// FIX: was joining via appointment_id (non-existent); now joins via consultation_id
export async function PATCH(req: NextRequest) {
  const doctor = await getDoctor(req)
  if (!doctor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { prescription_id } = await req.json()
  if (!prescription_id) return NextResponse.json({ error: 'prescription_id required' }, { status: 400 })

  const supabase = getSupabaseAdmin()

  // Confirm this prescription belongs to one of this doctor's consultations
  const { data: rx } = await supabase
    .from('prescription')
    .select('id, consultation:consultation_id ( doctor_id )')
    .eq('id', prescription_id)
    .maybeSingle()

  if (!rx) return NextResponse.json({ error: 'Prescription not found' }, { status: 404 })

  const consultationDoctorId = (rx.consultation as any)?.doctor_id
  if (consultationDoctorId !== doctor.id) {
    return NextResponse.json({ error: 'Forbidden — not your patient' }, { status: 403 })
  }

  const { error } = await supabase
    .from('prescription')
    .update({
      verified_by_doctor: true,
      verified_by_doctor_id: doctor.id,
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      updated_by: doctor.id,
    })
    .eq('id', prescription_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
