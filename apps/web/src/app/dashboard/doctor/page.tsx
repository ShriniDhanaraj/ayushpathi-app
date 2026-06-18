import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

interface DoctorStats {
  todayCount: number
  upcomingCount: number
  activePatients: number
  verificationStatus: string
  firstName: string
}

async function getDoctorStats(doctorId: string): Promise<Omit<DoctorStats, 'verificationStatus' | 'firstName'>> {
  const supabase = createSupabaseServerClient()
  const today = new Date().toISOString().split('T')[0]

  const [todayRes, upcomingRes, patientsRes] = await Promise.all([
    supabase.from('appointment')
      .select('id', { count: 'exact', head: true })
      .eq('doctor_id', doctorId)
      .eq('appointment_date', today)
      .neq('status', 'CANCELLED'),
    supabase.from('appointment')
      .select('id', { count: 'exact', head: true })
      .eq('doctor_id', doctorId)
      .gt('appointment_date', today)
      .in('status', ['BOOKED', 'CONFIRMED']),
    supabase.from('patient_doctor_consent')
      .select('id', { count: 'exact', head: true })
      .eq('doctor_id', doctorId)
      .eq('status', 'ACTIVE'),
  ])

  return {
    todayCount:     todayRes.count    ?? 0,
    upcomingCount:  upcomingRes.count ?? 0,
    activePatients: patientsRes.count ?? 0,
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

  const stats = isApproved ? await getDoctorStats(doctor.id) : { todayCount: 0, upcomingCount: 0, activePatients: 0 }

  const SPEC_LABELS: Record<string, string> = {
    AYU: 'Ayurveda', YOG: 'Yoga & Naturopathy',
    UNA: 'Unani', SID: 'Siddha', HOM: 'Homeopathy',
  }

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
        <a href="/api/auth/signout" className="text-sm text-gray-400 hover:text-gray-600">Sign out</a>
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
              { label: "Today's patients", value: stats.todayCount,    icon: '📅', href: '/appointments/today' },
              { label: 'Upcoming',         value: stats.upcomingCount, icon: '🗓', href: '/appointments/today' },
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

        {/* Quick actions */}
        {isApproved && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { icon: '📋', title: "Today's schedule",    desc: 'View and manage today\'s appointments', href: '/appointments/today' },
              { icon: '💊', title: 'Write prescription',  desc: 'After a consultation', href: '/consultation/new' },
              { icon: '👤', title: 'My profile',          desc: 'Update bio, availability, fees', href: '/profile/doctor' },
              { icon: '📊', title: 'Patient records',     desc: 'View consented patient histories', href: '/patients' },
            ].map(a => (
              <a
                key={a.href}
                href={a.href}
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
