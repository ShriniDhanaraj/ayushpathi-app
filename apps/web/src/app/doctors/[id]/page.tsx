import type { Metadata } from 'next'
import Link from 'next/link'
import { cache } from 'react'
import { getDoctorProfile, SPEC_LABELS } from '@/lib/doctor-profile'
import { LANGUAGES } from '@/lib/shared/languages'

// Re-render at most every 5 minutes — keeps profiles fresh and crawlable
export const revalidate = 300

const getProfile = cache(getDoctorProfile)

const DAY_ORDER = ['MON','TUE','WED','THU','FRI','SAT','SUN']
const DAY_LABELS: Record<string, string> = {
  MON: 'Monday', TUE: 'Tuesday', WED: 'Wednesday',
  THU: 'Thursday', FRI: 'Friday', SAT: 'Saturday', SUN: 'Sunday',
}

export async function generateMetadata(
  { params }: { params: { id: string } }
): Promise<Metadata> {
  const doctor = await getProfile(params.id)
  if (!doctor) return { title: 'Doctor not found' }

  const spec = SPEC_LABELS[doctor.ayush_specialization] ?? doctor.ayush_specialization
  const city = doctor.address?.city
  const title = `Dr. ${doctor.first_name} ${doctor.last_name} — ${spec}${city ? ` in ${city}` : ''}`
  const langs = Array.from(new Set(
    (doctor.languages_spoken ?? []).map(code => LANGUAGES.find(l => l.code === code)?.label ?? code)
  )).join(', ')
  const description =
    `Book an appointment with Dr. ${doctor.first_name} ${doctor.last_name}, ` +
    `${spec} practitioner with ${doctor.years_of_experience} years of experience` +
    `${city ? ` in ${city}, ${doctor.address?.state}` : ''}.` +
    `${langs ? ` Speaks ${langs}.` : ''}` +
    `${doctor.teleconsult_enabled ? ' Video consultation available.' : ''}`

  return {
    title,
    description,
    openGraph: { title, description },
    alternates: { canonical: `/doctors/${doctor.id}` },
  }
}

export default async function DoctorProfilePage(
  { params }: { params: { id: string } }
) {
  const doctor = await getProfile(params.id)

  if (!doctor) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-gray-900 font-medium">Doctor not found</p>
          <Link href="/doctors" className="text-brand-600 text-sm hover:underline">← Browse doctors</Link>
        </div>
      </div>
    )
  }

  const sortedAvail = [...(doctor.availability ?? [])].sort(
    (a, b) => DAY_ORDER.indexOf(a.day_of_week) - DAY_ORDER.indexOf(b.day_of_week)
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-3">
        <Link href="/doctors" className="text-gray-400 hover:text-gray-600 text-sm">← Doctors</Link>
        <span className="font-semibold text-gray-900">Doctor Profile</span>
      </header>

      <main className="max-w-2xl mx-auto p-6 space-y-5">

        {/* Hero card */}
        <div className="card p-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
              <span className="text-brand-700 font-bold text-xl">
                {doctor.first_name[0]}{doctor.last_name[0]}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-gray-900">
                Dr. {doctor.first_name} {doctor.last_name}
              </h1>
              <p className="text-brand-700 font-medium mt-0.5">
                {SPEC_LABELS[doctor.ayush_specialization] ?? doctor.ayush_specialization}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {doctor.years_of_experience} years experience
                {doctor.address ? ` · ${doctor.address.city}, ${doctor.address.state}` : ''}
              </p>
            </div>
          </div>

          {/* Badges row */}
          <div className="flex flex-wrap gap-2 mt-4">
            {doctor.teleconsult_enabled && (
              <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full">
                📹 Teleconsult available
                {doctor.teleconsult_fee > 0 ? ` · ₹${doctor.teleconsult_fee}` : ' · Free'}
              </span>
            )}
            {(doctor.degrees ?? []).map(d => (
              <span key={d} className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full">{d}</span>
            ))}
          </div>

          {/* Book button */}
          <Link
            href={`/appointments/new?doctor=${doctor.id}`}
            className="btn-primary w-full text-center mt-5 block"
          >
            Book Appointment
          </Link>
        </div>

        {/* Languages */}
        {doctor.languages_spoken?.length > 0 && (
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Languages spoken</h2>
            <div className="flex flex-wrap gap-2">
              {doctor.languages_spoken.map(code => {
                const lang = LANGUAGES.find(l => l.code === code)
                return (
                  <span key={code} className="text-sm bg-brand-50 text-brand-700 border border-brand-200 px-3 py-1 rounded-full">
                    {lang ? `${lang.nativeLabel} (${lang.label})` : code}
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {/* Availability */}
        {sortedAvail.length > 0 && (
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Availability</h2>
            <div className="space-y-2">
              {sortedAvail.map(slot => (
                <div key={slot.day_of_week} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 w-28">{DAY_LABELS[slot.day_of_week] ?? slot.day_of_week}</span>
                  <span className="text-gray-500">
                    {slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}
                  </span>
                  <span className="text-xs text-gray-400">{slot.slot_duration} min slots</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hospitals */}
        {doctor.hospitals?.length > 0 && (
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Practises at</h2>
            <div className="space-y-2">
              {doctor.hospitals.map(h => (
                <div key={h.id} className="flex items-center gap-3">
                  <span className="text-lg">🏥</span>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{h.name}</p>
                    {h.city && <p className="text-xs text-gray-400">{h.city.city}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Registration */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Registration</h2>
          <p className="text-sm text-gray-600">{doctor.registration_council}</p>
          <p className="text-xs text-gray-400 mt-1">Reg. No: {doctor.registration_number}</p>
        </div>

      </main>
    </div>
  )
}
