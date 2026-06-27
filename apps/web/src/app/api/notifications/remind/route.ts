import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

/**
 * GET /api/notifications/remind
 * Sends push reminders for appointments scheduled tomorrow.
 * Called by Vercel Cron daily at 18:00 IST (12:30 UTC).
 * Auth: Vercel sends Authorization: Bearer <CRON_SECRET>
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = getSupabaseAdmin()

  // Tomorrow's date in IST (UTC+5:30)
  const ISToffset = 5.5 * 60 * 60 * 1000
  const tomorrowIST = new Date(Date.now() + ISToffset)
  tomorrowIST.setUTCDate(tomorrowIST.getUTCDate() + 1)
  const tomorrowStr = tomorrowIST.toISOString().split('T')[0]

  const { data: appointments, error } = await supabase
    .from('appointment')
    .select(`
      id, appointment_date, start_time, type,
      patient:patient_id(auth_user_id, first_name),
      doctor:doctor_id(auth_user_id, first_name, last_name)
    `)
    .eq('appointment_date', tomorrowStr)
    .in('status', ['BOOKED', 'CONFIRMED'])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!appointments?.length) return NextResponse.json({ sent: 0, message: 'No appointments tomorrow' })

  const userIds = new Set<string>()
  for (const apt of appointments) {
    const p = Array.isArray(apt.patient) ? apt.patient[0] : apt.patient
    const d = Array.isArray(apt.doctor)  ? apt.doctor[0]  : apt.doctor
    if (p?.auth_user_id) userIds.add(p.auth_user_id)
    if (d?.auth_user_id) userIds.add(d.auth_user_id)
  }

  const { data: tokens } = await supabase
    .from('device_push_token')
    .select('user_id, token')
    .in('user_id', Array.from(userIds))

  const tokenMap: Record<string, string[]> = {}
  for (const t of tokens ?? []) {
    if (!tokenMap[t.user_id]) tokenMap[t.user_id] = []
    tokenMap[t.user_id].push(t.token)
  }

  function fmtTime(t: string) {
    const [h, m] = t.split(':')
    const hh = parseInt(h)
    return `${hh > 12 ? hh - 12 : hh || 12}:${m} ${hh >= 12 ? 'PM' : 'AM'}`
  }

  const messages: object[] = []
  for (const apt of appointments) {
    const p = Array.isArray(apt.patient) ? apt.patient[0] : apt.patient
    const d = Array.isArray(apt.doctor)  ? apt.doctor[0]  : apt.doctor
    const typeLabel = apt.type === 'TELECONSULT' ? 'Video' : 'In-person'
    const time = fmtTime(apt.start_time)

    for (const token of tokenMap[p?.auth_user_id ?? ''] ?? []) {
      messages.push({
        to: token, sound: 'default',
        title: 'Appointment Tomorrow 📅',
        body: `${typeLabel} consultation with Dr. ${d?.first_name} ${d?.last_name} at ${time}`,
        data: { type: 'APPOINTMENT_REMINDER', appointment_id: apt.id },
      })
    }
    for (const token of tokenMap[d?.auth_user_id ?? ''] ?? []) {
      messages.push({
        to: token, sound: 'default',
        title: 'Appointment Tomorrow 🩺',
        body: `${typeLabel} with ${p?.first_name} at ${time}`,
        data: { type: 'APPOINTMENT_REMINDER', appointment_id: apt.id },
      })
    }
  }

  if (!messages.length) return NextResponse.json({ sent: 0, message: 'No registered devices' })

  let sent = 0
  for (let i = 0; i < messages.length; i += 100) {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages.slice(i, i + 100)),
    })
    sent += Math.min(100, messages.length - i)
  }

  return NextResponse.json({ sent, appointments: appointments.length })
}
