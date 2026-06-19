import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function getDoctorId(req: NextRequest): Promise<string | null> {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data: { user }, error } = await supabaseAnon.auth.getUser(token)
  if (error || !user) return null
  const supabase = getSupabaseAdmin()
  const { data: doctor } = await supabase
    .from('doctor')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  return doctor?.id ?? null
}

// GET /api/doctor/availability — fetch current schedule
export async function GET(req: NextRequest) {
  const doctorId = await getDoctorId(req)
  if (!doctorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('doctor_availability')
    .select('day_of_week, active, start_time, end_time, slot_duration')
    .eq('doctor_id', doctorId)
    .order('day_of_week')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ availability: data ?? [] })
}

// POST /api/doctor/availability — upsert full weekly schedule
export async function POST(req: NextRequest) {
  const doctorId = await getDoctorId(req)
  if (!doctorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { schedule } = body as {
    schedule: Array<{
      day_of_week: string
      active: boolean
      start_time: string
      end_time: string
      slot_duration: number
    }>
  }

  if (!Array.isArray(schedule) || schedule.length === 0) {
    return NextResponse.json({ error: 'schedule array required' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  const rows = schedule.map(d => ({
    doctor_id: doctorId,
    day_of_week: d.day_of_week,
    active: d.active,
    start_time: d.start_time,
    end_time: d.end_time,
    slot_duration: d.slot_duration,
    updated_at: new Date().toISOString(),
  }))

  const { error } = await supabase
    .from('doctor_availability')
    .upsert(rows, { onConflict: 'doctor_id,day_of_week' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
