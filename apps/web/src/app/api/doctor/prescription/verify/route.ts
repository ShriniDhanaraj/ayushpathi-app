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

// GET /api/doctor/prescription/verify — list prescriptions pending the calling doctor's sign-off
export async function GET(req: NextRequest) {
  const doctor = await getDoctor(req)
  if (!doctor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseAdmin()

  // Find appointments belonging to this doctor
  const { data: appts } = await supabase
    .from('appointment')
    .select('id')
    .eq('doctor_id', doctor.id)

  const apptIds = (appts ?? []).map(a => a.id)
  if (apptIds.length === 0) return NextResponse.json({ prescriptions: [] })

  const { data: prescriptions, error } = await supabase
    .from('prescription')
    .select(`
      id, medicines, notes, entry_method, created_at,
      appointment:appointment_id (
        appointment_date, start_time,
        patient:patient_id ( first_name, last_name )
      )
    `)
    .in('appointment_id', apptIds)
    .eq('verified_by_doctor', false)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ prescriptions: prescriptions ?? [] })
}

// PATCH /api/doctor/prescription/verify — verify a prescription by ID
// Body: { prescription_id: string }
export async function PATCH(req: NextRequest) {
  const doctor = await getDoctor(req)
  if (!doctor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { prescription_id } = await req.json()
  if (!prescription_id) return NextResponse.json({ error: 'prescription_id required' }, { status: 400 })

  const supabase = getSupabaseAdmin()

  // Confirm this prescription belongs to one of the doctor's appointments
  const { data: rx } = await supabase
    .from('prescription')
    .select('id, appointment:appointment_id ( doctor_id )')
    .eq('id', prescription_id)
    .maybeSingle()

  if (!rx) return NextResponse.json({ error: 'Prescription not found' }, { status: 404 })

  const apptDoctorId = (rx.appointment as any)?.doctor_id
  if (apptDoctorId !== doctor.id) {
    return NextResponse.json({ error: 'Forbidden — not your patient' }, { status: 403 })
  }

  const { error } = await supabase
    .from('prescription')
    .update({
      verified_by_doctor: true,
      verified_by_doctor_id: doctor.id,
      updated_at: new Date().toISOString(),
      updated_by: doctor.id,
    })
    .eq('id', prescription_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
