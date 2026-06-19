import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// PATCH /api/appointments/[id]/cancel
// Cancels an appointment. Patient can cancel their own; receptionist/admin can cancel any.
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

  // Fetch appointment to verify ownership or role
  const { data: apt } = await supabase
    .from('appointment')
    .select('id, status, patient_auth_id, doctor_id')
    .eq('id', id)
    .maybeSingle()

  if (!apt) return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
  if (['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(apt.status)) {
    return NextResponse.json({ error: `Cannot cancel a ${apt.status} appointment` }, { status: 409 })
  }

  // Allow: patient (own), or any authenticated user with receptionist/admin role
  // (role check via user_profile table)
  const { data: profile } = await supabase
    .from('user_profile')
    .select('role')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  const role = profile?.role ?? ''
  const isPatientOwner = apt.patient_auth_id === user.id
  const isStaff = ['receptionist', 'hospital-admin', 'doctor-approved'].includes(role)

  if (!isPatientOwner && !isStaff) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await supabase
    .from('appointment')
    .update({
      status: 'CANCELLED',
      cancellation_reason,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fire push notification to doctor
  try {
    const { data: doctor } = await supabase
      .from('doctor')
      .select('auth_user_id')
      .eq('id', apt.doctor_id)
      .maybeSingle()

    if (doctor?.auth_user_id) {
      const { data: token } = await supabase
        .from('device_push_token')
        .select('token')
        .eq('auth_user_id', doctor.auth_user_id)
        .maybeSingle()

      if (token?.token) {
        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: token.token,
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
