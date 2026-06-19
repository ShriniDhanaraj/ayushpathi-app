import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

// POST /api/receptionist/prescription
// Receptionist enters a paper prescription into the system on behalf of the doctor
export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  const body = await req.json()

  const {
    appointment_id,
    patient_id,
    doctor_id,
    // Consultation fields
    chief_complaint,
    diagnosis,
    notes,
    next_visit_date,
    // Prescription fields
    medicines,       // [{name, dosage, frequency, duration, notes}]
    instructions,
    is_repeat = false,
  } = body

  if (!patient_id || !doctor_id || !medicines?.length) {
    return NextResponse.json({ error: 'patient_id, doctor_id, and medicines are required' }, { status: 400 })
  }

  // Upsert consultation (one per appointment)
  let consultation_id: string

  if (appointment_id) {
    const { data: existing } = await supabase
      .from('consultation')
      .select('id')
      .eq('appointment_id', appointment_id)
      .maybeSingle()

    if (existing) {
      // Update existing consultation
      const { error } = await supabase
        .from('consultation')
        .update({ chief_complaint, diagnosis, notes, next_visit_date: next_visit_date ?? null })
        .eq('id', existing.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      consultation_id = existing.id
    } else {
      const { data, error } = await supabase
        .from('consultation')
        .insert({ appointment_id, patient_id, doctor_id, chief_complaint, diagnosis, notes, next_visit_date: next_visit_date ?? null })
        .select('id')
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      consultation_id = data.id
    }
  } else {
    const { data, error } = await supabase
      .from('consultation')
      .insert({ patient_id, doctor_id, chief_complaint, diagnosis, notes, next_visit_date: next_visit_date ?? null })
      .select('id')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    consultation_id = data.id
  }

  // Insert prescription
  const { data: rx, error: rxErr } = await supabase
    .from('prescription')
    .insert({ consultation_id, patient_id, doctor_id, medicines, instructions: instructions ?? null, is_repeat })
    .select()
    .single()

  if (rxErr) return NextResponse.json({ error: rxErr.message }, { status: 500 })

  // Mark appointment as COMPLETED if appointment_id given
  if (appointment_id) {
    await supabase.from('appointment').update({ status: 'COMPLETED' }).eq('id', appointment_id)
  }

  return NextResponse.json({ consultation_id, prescription: rx }, { status: 201 })
}
