import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

// GET /api/doctors/[id]  — public doctor profile (no auth required)
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabaseAdmin()

  // Doctor profile
  const { data: doctor, error } = await supabase
    .from('doctor')
    .select(`
      id, first_name, last_name,
      ayush_specialization, years_of_experience,
      degrees, registration_number, registration_council,
      languages_spoken, ui_language,
      teleconsult_enabled, teleconsult_fee,
      verification_status,
      address:address_id (city, district, state)
    `)
    .eq('id', params.id)
    .eq('verification_status', 'APPROVED')
    .maybeSingle()

  if (error)   return NextResponse.json({ error: error.message }, { status: 500 })
  if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

  // Hospital affiliations
  const { data: affiliations } = await supabase
    .from('hospital_doctor')
    .select('hospital:hospital_id (id, name, city:address_id(city))')
    .eq('doctor_id', params.id)
    .eq('active', true)

  // Weekly availability (active days only)
  const { data: availability } = await supabase
    .from('doctor_availability')
    .select('day_of_week, start_time, end_time, slot_duration')
    .eq('doctor_id', params.id)
    .eq('active', true)
    .order('day_of_week')

  return NextResponse.json({
    doctor: {
      ...doctor,
      hospitals: affiliations?.map(a => a.hospital) ?? [],
      availability: availability ?? [],
    }
  })
}
