'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'
import SignOutButton from '@/components/auth/SignOutButton'

interface Appointment {
  id: string
  appointment_date: string
  start_time: string
  end_time: string
  status: string
  type: string
  notes: string | null
  teleconsult_url: string | null
  doctor: { id: string; first_name: string; last_name: string; ayush_specialization: string } | null
  hospital: { id: string; name: string } | null
}

const SPEC_LABELS: Record<string, string> = {
  AYU: 'Ayurveda', YOG: 'Yoga & Naturopathy',
  UNA: 'Unani', SID: 'Siddha', HOM: 'Homeopathy',
}

const STATUS_COLORS: Record<string, string> = {
  BOOKED:    'bg-blue-100 text-blue-700',
  CONFIRMED: 'bg-green-100 text-green-700',
  PENDING:   'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-red-100 text-red-600',
  NO_SHOW:   'bg-orange-100 text-orange-600',
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  })
}
function formatTime(t: string) {
  const [h, m] = t.split(':')
  const hh = parseInt(h)
  return `${hh > 12 ? hh - 12 : hh || 12}:${m} ${hh >= 12 ? 'PM' : 'AM'}`
}

function PatientDashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [name, setName] = useState('')
  const [hasHealthProfile, setHasHealthProfile] = useState(true)
  const [loading, setLoading] = useState(true)
  const [upcoming, setUpcoming] = useState<Appointment[]>([])
  const [past, setPast] = useState<Appointment[]>([])
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')
  const [aptsLoading, setAptsLoading] = useState(true)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [bookedBanner, setBookedBanner] = useState(searchParams.get('booked') === '1')

  useEffect(() => {
    async function init() {
      const supabase = getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth/login'); return }
      setToken(session.access_token)

      const { data: patient } = await supabase
        .from('patient').select('id, first_name').eq('auth_user_id', session.user.id).single()
      if (!patient) { setLoading(false); return }
      setName(patient.first_name)

      const { data: profile } = await supabase
        .from('patient_health_profile').select('patient_id').eq('patient_id', patient.id).maybeSingle()
      setHasHealthProfile(!!profile)
      setLoading(false)
    }
    init()
  }, [router])

  const fetchAppointments = useCallback(async (view: 'upcoming' | 'past') => {
    if (!token) return
    setAptsLoading(true)
    try {
      const res = await fetch(`/api/appointments/mine?view=${view}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (view === 'upcoming') setUpcoming(json.appointments ?? [])
      else setPast(json.appointments ?? [])
    } catch {}
    setAptsLoading(false)
  }, [token])

  useEffect(() => {
    if (token) fetchAppointments('upcoming')
  }, [token, fetchAppointments])

  useEffect(() => {
    if (token && tab === 'past' && past.length === 0) fetchAppointments('past')
  }, [tab, token, past.length, fetchAppointments])

  async function handleCancel(id: string) {
    if (!confirm('Cancel this appointment?')) return
    setCancellingId(id)
    try {
      const res = await fetch(`/api/appointments/${id}/cancel`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ cancellation_reason: 'Patient cancelled via portal' }),
      })
      if (res.ok) {
        setUpcoming(prev => prev.filter(a => a.id !== id))
      } else {
        const j = await res.json()
        alert(j.error ?? 'Could not cancel')
      }
    } catch {
      alert('Network error')
    }
    setCancellingId(null)
  }

  const aptsToShow = tab === 'upcoming' ? upcoming : past

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-4 sm:px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900">
            {loading ? 'Loading…' : `Namaste, ${name} 🙏`}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Ayushpathi Patient Portal</p>
        </div>
        <SignOutButton className="text-sm text-gray-400 hover:text-gray-600" />
      </header>

      <main className="max-w-4xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Booking success banner */}
        {bookedBanner && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">✅</span>
              <p className="text-green-800 text-sm font-medium">Appointment booked! Your doctor will confirm shortly.</p>
            </div>
            <button onClick={() => setBookedBanner(false)} className="text-green-600 text-xs hover:underline">Dismiss</button>
          </div>
        )}

        {/* Health profile nudge */}
        {!loading && !hasHealthProfile && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div className="flex-1">
              <p className="font-medium text-amber-900 text-sm">Complete your health profile</p>
              <p className="text-amber-700 text-xs mt-0.5 hidden sm:block">
                Add conditions, allergies and medications so doctors can give you better care.
              </p>
              <a href="/profile/health" className="mt-2 inline-block text-xs font-medium text-amber-800 underline">Update now →</a>
            </div>
          </div>
        )}

        {/* Quick actions row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {[
            { icon: '📅', label: 'Book Appointment', href: '/appointments/new' },
            { icon: '🔍', label: 'Browse Doctors', href: '/doctors/browse' },
            { icon: '📋', label: 'Health Records', href: '/records' },
            { icon: '👨‍👩‍👧', label: 'Family Members', href: '/records' },
          ].map(a => (
            <a key={a.href + a.label} href={a.href}
              className="card p-3 sm:p-4 flex flex-col items-center gap-2 text-center hover:shadow-md transition-shadow active:scale-[0.98]"
            >
              <span className="text-2xl">{a.icon}</span>
              <span className="text-xs font-medium text-gray-700">{a.label}</span>
            </a>
          ))}
        </div>

        {/* Appointments section */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-4 sm:px-5 pt-4 sm:pt-5 pb-3 border-b">
            <h2 className="font-semibold text-gray-900 text-sm sm:text-base">My Appointments</h2>
            <a href="/appointments/new" className="btn-primary text-xs sm:text-sm py-1.5 px-3">+ Book New</a>
          </div>

          {/* Tabs */}
          <div className="flex border-b">
            {(['upcoming', 'past'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2.5 text-xs sm:text-sm font-medium capitalize transition-colors ${
                  tab === t
                    ? 'border-b-2 border-brand-600 text-brand-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t === 'upcoming' ? '📅 Upcoming' : '🕐 Past'}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="divide-y">
            {aptsLoading ? (
              <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
            ) : aptsToShow.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-400 text-sm">
                  {tab === 'upcoming' ? 'No upcoming appointments.' : 'No past appointments.'}
                </p>
                {tab === 'upcoming' && (
                  <a href="/appointments/new" className="text-brand-600 text-sm font-medium mt-2 inline-block hover:underline">
                    Book your first appointment →
                  </a>
                )}
              </div>
            ) : (
              aptsToShow.map(apt => {
                const doctor = Array.isArray(apt.doctor) ? apt.doctor[0] : apt.doctor
                const hospital = Array.isArray(apt.hospital) ? apt.hospital[0] : apt.hospital
                const canCancel = ['BOOKED', 'CONFIRMED', 'PENDING'].includes(apt.status)
                const isTeleconsult = apt.type === 'TELECONSULT'

                return (
                  <div key={apt.id} className="p-4 sm:p-5 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-brand-50 flex items-center justify-center">
                        <span className="text-lg sm:text-xl">{isTeleconsult ? '💻' : '🏥'}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-gray-900 text-sm">
                            Dr. {doctor?.first_name} {doctor?.last_name}
                          </p>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[apt.status] ?? 'bg-gray-100 text-gray-500'}`}>
                            {apt.status}
                          </span>
                          {isTeleconsult && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                              VIDEO
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {SPEC_LABELS[doctor?.ayush_specialization ?? ''] ?? doctor?.ayush_specialization}
                          {hospital ? ` · ${hospital.name}` : ''}
                        </p>
                        <p className="text-xs text-gray-600 mt-1 font-medium">
                          {formatDate(apt.appointment_date)} · {formatTime(apt.start_time)} – {formatTime(apt.end_time)}
                        </p>
                      </div>
                    </div>

                    {/* Teleconsult join link */}
                    {isTeleconsult && apt.teleconsult_url && canCancel && (
                      <div className="mt-3 ml-13 sm:ml-16 bg-purple-50 border border-purple-200 rounded-lg p-3 flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold text-purple-900">Video Consultation Link</p>
                          <p className="text-xs text-purple-600 mt-0.5 truncate max-w-[200px] sm:max-w-none">{apt.teleconsult_url}</p>
                        </div>
                        <a
                          href={apt.teleconsult_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0 bg-purple-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-purple-700 transition-colors"
                        >
                          Join Now
                        </a>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="mt-3 flex items-center gap-2 flex-wrap ml-13 sm:ml-16">
                      {canCancel && (
                        <button
                          onClick={() => handleCancel(apt.id)}
                          disabled={cancellingId === apt.id}
                          className="text-xs text-red-600 border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {cancellingId === apt.id ? 'Cancelling…' : 'Cancel'}
                        </button>
                      )}
                      {doctor && (
                        <a
                          href={`/appointments/new?doctor=${doctor.id}`}
                          className="text-xs text-brand-600 border border-brand-200 hover:bg-brand-50 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Book Again
                        </a>
                      )}
                      <a
                        href={`/doctors/${doctor?.id}`}
                        className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        View Doctor
                      </a>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* More links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { icon: '💊', title: 'Prescriptions & Consultations', desc: 'View your health records', href: '/records' },
            { icon: '💚', title: 'Health Profile', desc: 'Conditions, allergies, medications', href: '/profile/health' },
            { icon: '👨‍⚕️', title: 'My Doctors', desc: 'Manage doctor access & consent', href: '/doctors' },
            { icon: '🔍', title: 'Find Doctors', desc: 'Browse by specialization or location', href: '/doctors/browse' },
          ].map(a => (
            <a key={a.href + a.title} href={a.href}
              className="card p-4 hover:shadow-md transition-shadow flex items-center gap-3 active:scale-[0.98]"
            >
              <span className="text-2xl flex-shrink-0">{a.icon}</span>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 text-sm">{a.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{a.desc}</p>
              </div>
              <span className="ml-auto text-gray-300 flex-shrink-0">›</span>
            </a>
          ))}
        </div>

        <p className="text-center text-xs text-gray-400 pb-4">
          Data stored securely in India · DPDP Act 2023
        </p>
      </main>
    </div>
  )
}

export default function PatientDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading…</p>
      </div>
    }>
      <PatientDashboardContent />
    </Suspense>
  )
}
