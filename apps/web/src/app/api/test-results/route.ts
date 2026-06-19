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

  let query = supabaseAdmin.from('test_result').select('*').order('created_at', { ascending: false })
  if (appointmentId) query = query.eq('appointment_id', appointmentId)
  if (patientId) query = query.eq('patient_id', patientId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ test_results: data ?? [] })
}
