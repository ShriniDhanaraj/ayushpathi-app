import { getSupabaseAdmin } from './supabase-admin'

export interface DoctorProfile {
  id: string
  first_name: string
  last_name: string
  ayush_specialization: string
  years_of_experience: number
  degrees: string[]
  registration_number: string
  registration_council: string
  languages_spoken: string[]
  teleconsult_enabled: boolean
  teleconsult_fee: number
  address: { city: string; district: string; state: string } | null
  hospitals: Array<{ id: string; name: string; city?: { city: string } }>
  availability: Array<{ day_of_week: string; start_time: string; end_time: string; slot_duration: number }>
}

export const SPEC_LABELS: Record<string, string> = {
  AYU: 'Ayurveda', YOG: 'Yoga & Naturopathy',
  UNA: 'Unani', SID: 'Siddha', HOM: 'Homeopathy',
}

// Public doctor profile (APPROVED doctors only). Returns null if not found / invalid id.
export async function getDoctorProfile(id: string): Promise<DoctorProfile | null> {
  const supabase = getSupabaseAdmin()

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
    .eq('id', id)
    .eq('verification_status', 'APPROVED')
    .maybeSingle()

  // Invalid UUID or query error → treat as not found rather than crashing the page
  if (error || !doctor) return null

  const { data: affiliations } = await supabase
    .from('hospital_doctor')
    .select('hospital:hospital_id (id, name, city:address_id(city))')
    .eq('doctor_id', id)
    .eq('active', true)

  const { data: availability } = await supabase
    .from('doctor_availability')
    .select('day_of_week, start_time, end_time, slot_duration')
    .eq('doctor_id', id)
    .eq('active', true)
    .order('day_of_week')

  return {
    ...(doctor as unknown as Omit<DoctorProfile, 'hospitals' | 'availability'>),
    hospitals: (affiliations?.map(a => a.hospital) ?? []) as unknown as DoctorProfile['hospitals'],
    availability: availability ?? [],
  }
}
