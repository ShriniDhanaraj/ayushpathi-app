import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import SignOutButton from '@/components/auth/SignOutButton'

interface DoctorStats {
  todayCount: number
  upcomingCount: number
  activePatients: number
}

interface TeleconsultAppt {
  id: string
  appointment_date: string
  start_time: string
  teleconsult_url: string | null
  patient: { first_name: string; last_name: string } | null
}

const SPEC_LABELS: Record<string, string> = {
  AYU: 'Ayurveda', YOG: 'Yoga & Naturopathy',
  UNA: 'Unani', SID: 'Siddha', HOM: 'Homeopathy',
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}
function formatTime(t: string) {
  const [h, m] = t.split(':')
  const hh = parseInt(h)
  return `${hh > 12 ? hh - 12 : hh || 12}:${m} ${hh >= 12 ? 'PM' : 'AM'}`
}

async function getDoctorData(doctorId: string) {
  const supabase = createSupabaseServerClient()
  const today = new Date().toISOString().split('T')[0]
  const next7 = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

  const [todayRes, upcomingRes, patientsRes, teleconsultsRes] = await Promise.all([
    supabase.from('appointment')
      .select('id', { count: 'exact', head: true })
      .eq('doctor_id', doctorId).eq('appointment_date', today).neq('status', 'CANCELLED'),
    supabase.from('appointment')
      .select('id', { count: 'exact', head: true })
      .eq('doctor_id', doctorId).gt('appointment_date', today).in('status', ['BOOKED', 'CONFIRMED']),
    supabase.from('patient_doctor_consent')
      .select('id', { count: 'exact', head: true })
      .eq('doctor_id', doctorId).eq('status', 'ACTIVE'),
    // Upcoming TELECONSULT appointments in next 7 days
    supabase.from('appointment')
      .select('id, appointment_date, start_time, teleconsult_url, patient:patient_id(first_name, last_name)')
      .eq('doctor_id', doctorId)
      .eq('type', 'TELECONSULT')
      .gte('appointment_date', today)
      .lte('appointment_date', next7)
      .in('status', ['BOOKED', 'CONFIRMED', 'PENDING'])
      .order('appointment_date').order('start_time')
      .limit(5),
  ])

  const teleconsults: TeleconsultAppt[] = (teleconsultsRes.data ?? []).map(a => ({
    ...a,
    patient: Array.isArray(a.patient) ? a.patient[0] : a.patient,
  }))

  return {
    stats: {
      todayCount:     todayRes.count    ?? 0,
      upcomingCount:  upcomingRes.count ?? 0,
      activePatients: patientsRes.count ?? 0,
    } as DoctorStats,
    teleconsults,
  }
}

export default async function DoctorDashboard() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: doctor } = await supabase
    .from('doctor')
    .select('id, first_name, last_name, verification_status, ayush_specialization')
    .eq('auth_user_id', user.id)
    .single()

  if (!doctor) redirect('/dashboard/patient')

  const isPending  = doctor.verification_status === 'PENDING'
  const isRejected = doctor.verification_status === 'REJECTED'
  const isApproved = doctor.verification_status === 'APPROVED'

  const { stats, teleconsults } = isApproved
    ? await getDoctorData(doctor.id)
    : { stats: { todayCount: 0, upcomingCount: 0, activePatients: 0 }, teleconsults: [] }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-4 sm:px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900">
            Namaste, Dr. {doctor.first_name} 🙏
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            {SPEC_LABELS[doctor.ayush_specialization] ?? 'AYUSH'} · Ayushpathi
          </p>
        </div>
        <SignOutButton className="text-sm text-gray-400 hover:text-gray-600" />
      </header>

      <main className="max-w-4xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Verification banners */}
        {isPending && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <span className="text-xl">🕐</span>
            <div>
              <p className="font-medium text-amber-900 text-sm">Verification pending</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Our team is reviewing your credentials. You&apos;ll be able to accept appointments once approved (usually within 48 hours).
              </p>
            </div>
          </div>
        )}
        {isRejected && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <span className="text-xl">❌</span>
            <div>
              <p className="font-medium text-red-900 text-sm">Verification unsuccessful</p>
              <p className="text-xs text-red-700 mt-0.5">
                Your registration was not approved. Please contact support@ayushpathi.in with your credentials.
              </p>
            </div>
          </div>
        )}

        {/* Stats */}
        {isApproved && (
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            {[
              { label: "Today's patients", value: stats.todayCount,     icon: '📅', href: '/appointments/today' },
              { label: 'Upcoming',         value: stats.upcomingCount,  icon: '🗓', href: '/appointments/today' },
              { label: 'Active patients',  value: stats.activePatients, icon: '👥', href: '/appointments/today' },
            ].map(c => (
              <a key={c.label} href={c.href} className="card p-3 sm:p-5 space-y-2 sm:space-y-3 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="text-xl sm:text-2xl">{c.icon}</span>
                  <span className="text-2xl sm:text-3xl font-bold text-gray-900">{c.value}</span>
                </div>
                <p className="text-xs text-gray-500 leading-tight">{c.label}</p>
              </a>
            ))}
          </div>
        )}

        {/* Teleconsult section */}
        {isApproved && teleconsults.length > 0 && (
          <div className="card overflow-hidden">
            <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3 border-b flex items-center gap-2">
              <span className="text-lg">💻</span>
              <h2 className="font-semibold text-gray-900 text-sm sm:text-base">Upcoming Video Consultations</h2>
              <span className="ml-auto text-xs text-gray-400">Next 7 days</span>
            </div>
            <div className="divide-y">
              {teleconsults.map(apt => (
                <div key={apt.id} className="p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">
                      {apt.patient?.first_name} {apt.patient?.last_name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatDate(apt.appointment_date)} · {formatTime(apt.start_time)}
                    </p>
                    {apt.teleconsult_url && (
                      <p className="text-xs text-purple-600 mt-1 truncate">{apt.teleconsult_url}</p>
                    )}
                  </div>
                  {apt.teleconsult_url ? (
                    <a
                      href={apt.teleconsult_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 bg-purple-600 text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      Join Now
                    </a>
                  ) : (
                    <span className="flex-shrink-0 text-xs text-gray-400 italic">Link pending</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick actions */}
        {isApproved && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { icon: '📋', title: "Today's schedule",   desc: "View and manage today's appointments", href: '/appointments/today' },
              { icon: '💊', title: 'Write prescription', desc: 'After a consultation',                 href: '/consultation/new'   },
              { icon: '👤', title: 'My profile',         desc: 'Update bio, availability, fees',       href: '/profile/doctor'     },
              { icon: '📊', title: 'Patient records',    desc: 'View consented patient histories',     href: '/patients'           },
            ].map(a => (
              <a key={a.href} href={a.href}
                className="card p-4 sm:p-5 hover:shadow-md transition-shadow flex items-center sm:items-start gap-3 sm:gap-4 active:scale-[0.98]"
              >
                <span className="text-2xl sm:text-3xl flex-shrink-0">{a.icon}</span>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{a.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{a.desc}</p>
                </div>
                <span className="ml-auto text-gray-300 flex-shrink-0">›</span>
              </a>
            ))}
          </div>
        )}

        <p className="text-center text-xs text-gray-400 pb-4">
          Data stored securely in India · DPDP Act 2023
        </p>
      </main>
    </div>
  )
}
