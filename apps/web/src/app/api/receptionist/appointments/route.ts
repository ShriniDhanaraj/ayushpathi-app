import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

// GET /api/receptionist/appointments?hospital_id=&date=YYYY-MM-DD
export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  const { searchParams } = new URL(req.url)
  const hospital_id = searchParams.get('hospital_id')
  const date = searchParams.get('date') ?? new Date().toISOString().split('T')[0]

  let query = supabase
    .from('appointment')
    .select(`
      id, appointment_date, start_time, end_time, status, type, is_walk_in, notes,
      patient:patient_id(id, first_name, last_name, mobile),
      doctor:doctor_id(id, first_name, last_name, ayush_specialization)
    `)
    .eq('appointment_date', date)
    .order('start_time')

  if (hospital_id) {
    query = query.eq('hospital_id', hospital_id)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ appointments: data })
}

// POST /api/receptionist/appointments — book on behalf of patient
export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  const body = await req.json()

  const {
    patient_id, doctor_id, hospital_id,
    appointment_date, start_time, end_time,
    type = 'F2F', notes, is_walk_in = false,
    booked_by_id,
  } = body

  if (!patient_id || !doctor_id || !appointment_date || !start_time || !end_time) {
    return NextResponse.json({ error: 'patient_id, doctor_id, appointment_date, start_time, end_time are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('appointment')
    .insert({
      patient_id, doctor_id, hospital_id: hospital_id ?? null,
      appointment_date, start_time, end_time,
      type, status: 'BOOKED',
      booked_by_role: 'RECEPTIONIST',
      booked_by_id: booked_by_id ?? null,
      notes: notes ?? null,
      is_walk_in,
    })
    .select(`
      id, appointment_date, start_time, status,
      patient:patient_id(first_name, last_name),
      doctor:doctor_id(first_name, last_name)
    `)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ appointment: data }, { status: 201 })
}
