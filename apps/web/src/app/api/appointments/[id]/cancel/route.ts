import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// PATCH /api/appointments/[id]/cancel
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user }, error: authErr } = await supabaseAnon.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const cancellation_reason: string = body.cancellation_reason ?? 'Patient cancelled'

  const supabase = getSupabaseAdmin()
  const { id } = params

  // FIX: was selecting non-existent 'patient_auth_id' — join patient to get auth_user_id
  const { data: apt, error: aptErr } = await supabase
    .from('appointment')
    .select('id, status, doctor_id, patient:patient_id(id, auth_user_id)')
    .eq('id', id)
    .maybeSingle()

  if (aptErr || !apt) return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })

  if (['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(apt.status)) {
    return NextResponse.json({ error: `Cannot cancel a ${apt.status} appointment` }, { status: 409 })
  }

  // Check if user is the patient who owns this appointment
  const patient = Array.isArray(apt.patient) ? apt.patient[0] : apt.patient
  const isPatientOwner = patient?.auth_user_id === user.id

  // Check if user is staff (receptionist or hospital admin)
  const { data: rec } = await supabase
    .from('receptionist')
    .select('id')
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  const { data: admin } = await supabase
    .from('hospital_admin')
    .select('id')
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  const { data: doctor } = await supabase
    .from('doctor')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  const isStaff = !!(rec || admin || doctor)

  if (!isPatientOwner && !isStaff) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await supabase
    .from('appointment')
    .update({
      status: 'CANCELLED',
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fire push notification to doctor
  try {
    const { data: doctorData } = await supabase
      .from('doctor')
      .select('auth_user_id')
      .eq('id', apt.doctor_id)
      .maybeSingle()

    if (doctorData?.auth_user_id) {
      const { data: pushToken } = await supabase
        .from('device_push_token')
        .select('token')
        .eq('auth_user_id', doctorData.auth_user_id)
        .maybeSingle()

      if (pushToken?.token) {
        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: pushToken.token,
            title: 'Appointment Cancelled',
            body: `A patient cancelled their appointment (${cancellation_reason})`,
            data: { type: 'APPOINTMENT_CANCELLED', appointment_id: id },
          }),
        })
      }
    }
  } catch {}

  return NextResponse.json({ ok: true })
}
