import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  const body = await req.json()

  const {
    appointment_id,
    chief_complaint, diagnosis, notes, next_visit_date,
    medicines, instructions, is_repeat = false,
  } = body

  if (!medicines?.length) {
    return NextResponse.json({ error: 'medicines array is required' }, { status: 400 })
  }

  // Resolve patient_id + doctor_id from appointment (receptionist doesn't pass them directly)
  let patient_id: string
  let doctor_id: string

  if (appointment_id) {
    const { data: apt, error: aptErr } = await supabase
      .from('appointment')
      .select('patient_id, doctor_id')
      .eq('id', appointment_id)
      .single()
    if (aptErr || !apt) return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    patient_id = apt.patient_id
    doctor_id = apt.doctor_id
  } else {
    // Fallback: caller must supply them
    if (!body.patient_id || !body.doctor_id) {
      return NextResponse.json({ error: 'appointment_id or patient_id+doctor_id required' }, { status: 400 })
    }
    patient_id = body.patient_id
    doctor_id = body.doctor_id
  }

  // Upsert consultation
  let consultation_id: string

  if (appointment_id) {
    const { data: existing } = await supabase
      .from('consultation')
      .select('id')
      .eq('appointment_id', appointment_id)
      .maybeSingle()

    if (existing) {
      await supabase.from('consultation')
        .update({ chief_complaint, diagnosis, notes, next_visit_date: next_visit_date ?? null })
        .eq('id', existing.id)
      consultation_id = existing.id
    } else {
      const { data, error } = await supabase.from('consultation')
        .insert({ appointment_id, patient_id, doctor_id, chief_complaint, diagnosis, notes, next_visit_date: next_visit_date ?? null })
        .select('id').single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      consultation_id = data.id
    }
  } else {
    const { data, error } = await supabase.from('consultation')
      .insert({ patient_id, doctor_id, chief_complaint, diagnosis, notes, next_visit_date: next_visit_date ?? null })
      .select('id').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    consultation_id = data.id
  }

  // Insert prescription
  const { data: rx, error: rxErr } = await supabase.from('prescription')
    .insert({ consultation_id, patient_id, doctor_id, medicines, instructions: instructions ?? null, is_repeat })
    .select().single()
  if (rxErr) return NextResponse.json({ error: rxErr.message }, { status: 500 })

  // Mark appointment completed
  if (appointment_id) {
    await supabase.from('appointment').update({ status: 'COMPLETED' }).eq('id', appointment_id)
  }

  return NextResponse.json({ consultation_id, prescription: rx }, { status: 201 })
}
