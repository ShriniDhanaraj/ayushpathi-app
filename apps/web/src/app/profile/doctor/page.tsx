import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

const SPEC_LABELS: Record<string, string> = {
  AYU: 'Ayurveda', YOG: 'Yoga & Naturopathy',
  UNA: 'Unani', SID: 'Siddha', HOM: 'Homeopathy',
}

export default async function DoctorProfilePage() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: doctor } = await supabase
    .from('doctor')
    .select(`
      id, first_name, last_name, email, mobile,
      ayush_specialization, years_of_experience, degrees,
      languages_spoken, registration_number, registration_council,
      verification_status, teleconsult_enabled, teleconsult_fee,
      ui_language
    `)
    .eq('auth_user_id', user.id)
    .single()

  if (!doctor) redirect('/dashboard/patient')

  // Hospitals this doctor is linked to
  const { data: hospitals } = await supabase
    .from('hospital_doctor')
    .select('hospital:hospital_id(id, name, phone)')
    .eq('doctor_id', doctor.id)

  const spec = SPEC_LABELS[doctor.ayush_specialization] ?? doctor.ayush_specialization

  const infoRow = (label: string, value: string | null | undefined) =>
    value ? { label, value } : null

  const rows = [
    infoRow('Email', doctor.email),
    infoRow('Mobile', doctor.mobile),
    infoRow('Specialization', spec),
    infoRow('Experience', doctor.years_of_experience ? `${doctor.years_of_experience} years` : null),
    infoRow('Degrees', (doctor.degrees as string[] | null)?.join(', ')),
    infoRow('Languages', (doctor.languages_spoken as string[] | null)?.join(', ')),
    infoRow('Registration No.', doctor.registration_number),
    infoRow('Council', doctor.registration_council),
    infoRow('Verification', doctor.verification_status),
    infoRow('Teleconsult Fee', doctor.teleconsult_enabled
      ? (doctor.teleconsult_fee > 0 ? `₹${doctor.teleconsult_fee} per session` : 'Free')
      : 'Teleconsult disabled'),
  ].filter(Boolean) as { label: string; value: string }[]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-3">
        <a href="/dashboard/doctor" className="text-gray-400 hover:text-gray-600 text-sm">← Dashboard</a>
        <span className="font-semibold text-gray-900">My Profile</span>
      </header>

      <main className="max-w-2xl mx-auto p-6 space-y-5">

        {/* Identity card */}
        <div className="card p-6 flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-bold text-brand-700">
              {doctor.first_name[0]}{doctor.last_name[0]}
            </span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Dr. {doctor.first_name} {doctor.last_name}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">{spec} · Ayushpathi</p>
            <span className={`inline-block mt-1.5 text-xs font-medium px-2 py-0.5 rounded-full
              ${doctor.verification_status === 'APPROVED'
                ? 'bg-green-100 text-green-700'
                : doctor.verification_status === 'PENDING'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-red-100 text-red-600'}`}>
              {doctor.verification_status === 'APPROVED' ? '✓ Verified' : doctor.verification_status}
            </span>
          </div>
        </div>

        {/* Profile details */}
        <div className="card divide-y">
          {rows.map(r => (
            <div key={r.label} className="flex justify-between px-5 py-3.5">
              <span className="text-sm text-gray-500 w-40 flex-shrink-0">{r.label}</span>
              <span className="text-sm text-gray-900 text-right">{r.value}</span>
            </div>
          ))}
        </div>

        {/* Hospital affiliations */}
        {hospitals && hospitals.length > 0 && (
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b">
              <h2 className="font-semibold text-gray-900 text-sm">Hospital Affiliations</h2>
            </div>
            <div className="divide-y">
              {hospitals.map((h, i) => {
                const hospRaw = h.hospital
                const hosp = (Array.isArray(hospRaw) ? (hospRaw[0] ?? null) : hospRaw) as { id: string; name: string; phone: string } | null
                return hosp ? (
                  <div key={i} className="px-5 py-3.5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{hosp.name}</p>
                      {hosp.phone && <p className="text-xs text-gray-500 mt-0.5">{hosp.phone}</p>}
                    </div>
                    <span className="text-xs text-brand-600">Affiliated</span>
                  </div>
                ) : null
              })}
            </div>
          </div>
        )}

        {/* Availability shortcut */}
        <a href="/availability" className="card p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
          <span className="text-2xl">🗓</span>
          <div>
            <p className="font-semibold text-gray-900 text-sm">Manage Availability</p>
            <p className="text-xs text-gray-500 mt-0.5">Set your weekly schedule and slot duration</p>
          </div>
          <span className="ml-auto text-gray-300">›</span>
        </a>

        <p className="text-center text-xs text-gray-400 pb-4">
          To update profile details, contact support@ayushpathi.in
        </p>
      </main>
    </div>
  )
}
