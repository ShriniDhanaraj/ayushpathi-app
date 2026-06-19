import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const VALID_STATUSES = ['BOOKED', 'CONFIRMED', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'NO_SHOW', 'CANCELLED']

type Params = { params: { id: string } }

const PUSH_CONFIG: Record<string, { title: string; body: (name: string) => string; notify: 'patient' | 'doctor' | 'both' }> = {
  CONFIRMED:   { title: '✅ Appointment Confirmed',  body: (n) => `Your appointment with Dr. ${n} is confirmed.`,       notify: 'patient' },
  ARRIVED:     { title: '🏥 Patient Has Arrived',    body: (n) => `${n} has arrived at the clinic.`,                    notify: 'doctor'  },
  IN_PROGRESS: { title: '👨‍⚕️ Consultation Started', body: (n) => `Your consultation with Dr. ${n} has begun.`,         notify: 'patient' },
  COMPLETED:   { title: '✅ Consultation Complete',  body: (n) => `Your consultation with Dr. ${n} is complete.`,        notify: 'patient' },
  NO_SHOW:     { title: '⚠️ Marked as No-Show',     body: (_n) => `You were marked as no-show. Contact us to reschedule.`, notify: 'patient' },
  CANCELLED:   { title: '❌ Appointment Cancelled',  body: (_n) => `Your appointment has been cancelled.`,               notify: 'both'    },
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const supabase = getSupabaseAdmin()
  const { status } = await req.json()

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 })
  }

  // Fetch appointment with patient + doctor for push targeting
  const { data: apt, error: fetchErr } = await supabase
    .from('appointment')
    .select(`
      id,
      patient:patient_id ( auth_user_id, first_name, last_name ),
      doctor:doctor_id   ( auth_user_id, first_name, last_name )
    `)
    .eq('id', params.id)
    .single()

  if (fetchErr || !apt) {
    return NextResponse.json({ error: fetchErr?.message ?? 'Appointment not found' }, { status: 404 })
  }

  // Update status
  const { data, error } = await supabase
    .from('appointment')
    .update({ status })
    .eq('id', params.id)
    .select('id, status')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fire push notification (best-effort — don't fail the response if push fails)
  const pushCfg = PUSH_CONFIG[status]
  if (pushCfg) {
    try {
      const patient = Array.isArray(apt.patient) ? apt.patient[0] : apt.patient
      const doctor  = Array.isArray(apt.doctor)  ? apt.doctor[0]  : apt.doctor

      const patientAuthId = patient?.auth_user_id
      const doctorAuthId  = doctor?.auth_user_id
      const doctorName    = doctor  ? `${doctor.first_name} ${doctor.last_name}`   : 'your doctor'
      const patientName   = patient ? `${patient.first_name} ${patient.last_name}` : 'the patient'

      const notifyUserIds: string[] = []
      if ((pushCfg.notify === 'patient' || pushCfg.notify === 'both') && patientAuthId) {
        notifyUserIds.push(patientAuthId)
      }
      if ((pushCfg.notify === 'doctor' || pushCfg.notify === 'both') && doctorAuthId) {
        notifyUserIds.push(doctorAuthId)
      }

      if (notifyUserIds.length > 0) {
        // doctor-targeting uses patientName, patient-targeting uses doctorName
        const bodyName = pushCfg.notify === 'doctor' ? patientName : doctorName
        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://rasbros.com'}/api/push/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_ids: notifyUserIds,
            title: pushCfg.title,
            body: pushCfg.body(bodyName),
            data: { type: 'appointment', appointment_id: params.id, status },
          }),
        })
      }
    } catch (pushErr) {
      console.error('[push] failed to send appointment notification:', pushErr)
    }
  }

  return NextResponse.json({ appointment: data })
}
