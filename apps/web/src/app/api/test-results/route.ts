import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const appointmentId = searchParams.get('appointment_id')
  const patientId = searchParams.get('patient_id')

  if (!appointmentId && !patientId) {
    return NextResponse.json({ error: 'appointment_id or patient_id required' }, { status: 400 })
  }

  // Ownership / access check
  // Patients: may only query their own records
  // Doctors, receptionists, hospital admins: may query any
  const { data: myPatient } = await supabaseAdmin
    .from('patient').select('id').eq('auth_user_id', user.id).maybeSingle()

  const isPatient = !!myPatient

  if (isPatient) {
    // Resolve the patient_id in scope
    const targetPatientId = patientId ?? (
      appointmentId
        ? await supabaseAdmin
            .from('appointment').select('patient_id').eq('id', appointmentId).maybeSingle()
            .then(r => r.data?.patient_id ?? null)
        : null
    )
    if (targetPatientId && targetPatientId !== myPatient!.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  } else {
    // Verify user is staff (doctor, receptionist, or admin)
    const [{ data: doc }, { data: rec }, { data: adm }] = await Promise.all([
      supabaseAdmin.from('doctor').select('id').eq('auth_user_id', user.id).maybeSingle(),
      supabaseAdmin.from('receptionist').select('id').eq('auth_user_id', user.id).eq('is_active', true).maybeSingle(),
      supabaseAdmin.from('hospital_admin').select('id').eq('auth_user_id', user.id).eq('is_active', true).maybeSingle(),
    ])
    if (!doc && !rec && !adm) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  let query = supabaseAdmin.from('test_result').select('*').order('created_at', { ascending: false })
  if (appointmentId) query = query.eq('appointment_id', appointmentId)
  if (patientId) query = query.eq('patient_id', patientId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ test_results: data ?? [] })
}
