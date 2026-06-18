'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'

interface Stats { today: number; upcoming: number; totalPatients: number; pendingReview: boolean }

export default function DoctorDashboard() {
  const router = useRouter()
  const [name, setName]   = useState('')
  const [status, setStatus] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | ''>('')
  const [stats, setStats]  = useState<Stats>({ today: 0, upcoming: 0, totalPatients: 0, pendingReview: false })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data: doctor } = await supabase
        .from('doctor').select('id, first_name, verification_status').eq('auth_user_id', user.id).single()
      if (!doctor) { setLoading(false); return }

      setName(doctor.first_name)
      setStatus(doctor.verification_status)

      if (doctor.verification_status !== 'APPROVED') { setLoading(false); return }

      const today = new Date().toISOString().split('T')[0]

      const [todayRes, upcomingRes, patientsRes] = await Promise.all([
        supabase.from('appointment')
          .select('id', { count: 'exact', head: true })
          .eq('doctor_id', doctor.id).eq('appointment_date', today)
          .in('status', ['CONFIRMED', 'IN_PROGRESS']),
        supabase.from('appointment')
          .select('id', { count: 'exact', head: true })
          .eq('doctor_id', doctor.id)
          .in('status', ['CONFIRMED', 'PENDING'])
          .gt('appointment_date', today),
        supabase.from('patient_doctor_consent')
          .select('id', { count: 'exact', head: true })
          .eq('doctor_id', doctor.id).eq('status', 'ACTIVE'),
      ])

      setStats({
        today:         todayRes.count   ?? 0,
        upcoming:      upcomingRes.count ?? 0,
        totalPatients: patientsRes.count ?? 0,
        pendingReview: false,
      })
      setLoading(false)
    }
    load()
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {loading ? 'Loading…' : `Dr. ${name}`}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Ayushpathi Doctor Portal</p>
        </div>
        <a href="/api/auth/signout" className="text-sm text-gray-400 hover:text-gray-600">Sign out</a>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Status banners */}
        {status === 'PENDING' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
            <span className="text-2xl">⏳</span>
            <div>
              <p className="font-medium text-amber-900 text-sm">Account under review</p>
              <p className="text-amber-700 text-xs mt-0.5">Our team is verifying your credentials. You'll be notified once approved and can start seeing patients.</p>
            </div>
          </div>
        )}
        {status === 'REJECTED' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
            <span className="text-2xl">❌</span>
            <div>
              <p className="font-medium text-red-900 text-sm">Verification not approved</p>
              <p className="text-red-700 text-xs mt-0.5">Please re-upload your documents or contact support.</p>
            </div>
          </div>
        )}

        {status === 'APPROVED' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Today's appointments", value: stats.today,         icon: '📅', href: '/appointments/today', cta: "View today's schedule" },
                { label: 'Upcoming appointments', value: stats.upcoming,     icon: '🗓️', href: '/appointments/today', cta: 'View upcoming' },
                { label: 'Active patients',       value: stats.totalPatients, icon: '👥', href: '#',                   cta: 'Patient list' },
              ].map(c => (
                <div key={c.label} className="card p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{c.icon}</span>
                    <span className="text-3xl font-bold text-gray-900">{loading ? '–' : c.value}</span>
                  </div>
                  <p className="text-sm text-gray-500">{c.label}</p>
                  <a href={c.href} className="block text-center btn-primary text-sm py-2">{c.cta}</a>
                </div>
              ))}
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: '📅', title: "Today's schedule",    desc: 'View and start consultations for today', href: '/appointments/today' },
                { icon: '🕐', title: 'Set availability',    desc: 'Configure your days, hours, and slot duration', href: '/availability' },
                { icon: '📋', title: 'Consultation notes',  desc: 'Complete notes for recent appointments', href: '/appointments/today' },
                { icon: '🏥', title: 'My profile',          desc: 'Update specialization and practice details', href: '#' },
              ].map(a => (
                <a key={a.href} href={a.href} className="card p-5 hover:shadow-md transition-shadow flex items-start gap-4">
                  <span className="text-3xl">{a.icon}</span>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{a.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{a.desc}</p>
                  </div>
                </a>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
