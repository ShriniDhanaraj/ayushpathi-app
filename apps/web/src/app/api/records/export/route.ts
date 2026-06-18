/**
 * DPDP Act 2023 — Right to Data Portability
 * Patient downloads their full health record as JSON
 * GET /api/records/export
 */
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: patient } = await supabase
    .from('patient').select('*, address(*)').eq('auth_user_id', user.id).single()
  if (!patient) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const [healthProfile, consultations, appointments, consents] = await Promise.all([
    supabase.from('patient_health_profile').select('*').eq('patient_id', patient.id).single().then(r => r.data),
    supabase.from('consultation').select('*, prescription(*)').eq('patient_id', patient.id).order('created_at', { ascending: false }).then(r => r.data),
    supabase.from('appointment').select('*, doctor:doctor_id(first_name, last_name, ayush_specialization)').eq('patient_id', patient.id).order('appointment_date', { ascending: false }).then(r => r.data),
    supabase.from('patient_doctor_consent').select('*, doctor:doctor_id(first_name, last_name)').eq('patient_id', patient.id).then(r => r.data),
  ])

  const payload = {
    exported_at: new Date().toISOString(),
    platform: 'Ayushpathi',
    dpdp_notice: 'Provided under India DPDP Act 2023 — Right to Data Portability.',
    patient: { name: `${patient.first_name} ${patient.last_name}`, date_of_birth: patient.date_of_birth, gender: patient.gender, email: patient.email, mobile: patient.mobile, abha_id: patient.abha_id, address: patient.address },
    health_profile: healthProfile,
    consultations,
    appointments,
    doctor_consent_history: consents,
  }

  await supabase.from('data_export_request').insert({
    patient_id: patient.id, status: 'READY',
    expires_at: new Date(Date.now() + 86400000).toISOString(),
  })

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="ayushpathi-health-record-${new Date().toISOString().split('T')[0]}.json"`,
    },
  })
}
