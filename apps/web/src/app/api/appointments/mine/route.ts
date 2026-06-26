import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// GET /api/appointments/mine?view=upcoming|past
export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user }, error: authErr } = await supabaseAnon.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseAdmin()
  const { searchParams } = new URL(req.url)
  const view = searchParams.get('view') ?? 'upcoming'

  const { data: patient } = await supabase
    .from('patient')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 })

  const today = new Date().toISOString().split('T')[0]

  let query = supabase
    .from('appointment')
    .select(`
      id, appointment_date, start_time, end_time,
      status, type, notes, teleconsult_url,
      doctor:doctor_id(id, first_name, last_name, ayush_specialization),
      hospital:hospital_id(id, name)
    `)
    .eq('patient_id', patient.id)

  if (view === 'upcoming') {
    query = query
      .gte('appointment_date', today)
      .in('status', ['BOOKED', 'CONFIRMED', 'PENDING'])
      .order('appointment_date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(20)
  } else {
    query = query
      .or(`appointment_date.lt.${today},status.in.(CANCELLED,COMPLETED,NO_SHOW)`)
      .order('appointment_date', { ascending: false })
      .order('start_time', { ascending: false })
      .limit(40)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ appointments: data ?? [] })
}
