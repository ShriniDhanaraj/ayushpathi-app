import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * POST /api/appointments/teleconsult
 * Body: { appointment_id }
 * Generates a Jitsi Meet room URL for a TELECONSULT appointment,
 * stores it on the row, and returns it.
 * Only the patient who owns the appointment or any staff may call this.
 */
export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user }, error: authErr } = await supabaseAnon.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { appointment_id } = await req.json()
  if (!appointment_id) return NextResponse.json({ error: 'appointment_id required' }, { status: 400 })

  const supabase = getSupabaseAdmin()

  const { data: apt, error: aptErr } = await supabase
    .from('appointment')
    .select('id, type, status, teleconsult_url, patient:patient_id(auth_user_id)')
    .eq('id', appointment_id)
    .maybeSingle()

  if (aptErr || !apt) return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
  if (apt.type !== 'TELECONSULT') {
    return NextResponse.json({ error: 'Not a TELECONSULT appointment' }, { status: 400 })
  }

  // Auth: must be the patient or staff
  const patient = Array.isArray(apt.patient) ? apt.patient[0] : apt.patient
  const isPatient = patient?.auth_user_id === user.id

  if (!isPatient) {
    const { data: staff } = await supabase
      .from('doctor').select('id').eq('auth_user_id', user.id).maybeSingle()
    const { data: rec } = await supabase
      .from('receptionist').select('id').eq('auth_user_id', user.id).maybeSingle()
    const { data: adm } = await supabase
      .from('hospital_admin').select('id').eq('auth_user_id', user.id).maybeSingle()
    if (!staff && !rec && !adm) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Return existing URL if already generated
  if (apt.teleconsult_url) return NextResponse.json({ url: apt.teleconsult_url })

  // Generate Jitsi Meet URL
  // Room name: ayushpathi-<first 8 chars of appointment UUID>-<random 6 hex>
  const roomSuffix = Math.random().toString(16).slice(2, 8)
  const roomName = `ayushpathi-${appointment_id.slice(0, 8)}-${roomSuffix}`
  const teleconsult_url = `https://meet.jit.si/${roomName}`

  const { error: updateErr } = await supabase
    .from('appointment')
    .update({ teleconsult_url, updated_at: new Date().toISOString(), updated_by: user.id })
    .eq('id', appointment_id)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })
  return NextResponse.json({ url: teleconsult_url })
}
