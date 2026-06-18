'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'

interface Stats { upcoming: number; activeDoctors: number; prescriptions: number; hasHealthProfile: boolean }

export default function PatientDashboard() {
  const router = useRouter()
  const [name,  setName]  = useState('')
  const [stats, setStats] = useState<Stats>({ upcoming: 0, activeDoctors: 0, prescriptions: 0, hasHealthProfile: false })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data: patient } = await supabase
        .from('patient').select('id, first_name').eq('auth_user_id', user.id).single()
      if (!patient) { setLoading(false); return }
      setName(patient.first_name)

      const [upcomingRes, doctorsRes, prescriptionsRes, profileRes] = await Promise.all([
        supabase.from('appointment')
          .select('id', { count: 'exact', head: true })
          .eq('patient_id', patient.id)
          .in('status', ['CONFIRMED', 'PENDING'])
          .gte('appointment_date', new Date().toISOString().split('T')[0]),
        supabase.from('patient_doctor_consent')
          .select('id', { count: 'exact', head: true })
          .eq('patient_id', patient.id).eq('status', 'ACTIVE'),
        supabase.from('prescription')
          .select('consultation_id', { count: 'exact', head: true })
          .eq('patient_id', patient.id),
        supabase.from('patient_health_profile')
          .select('patient_id').eq('patient_id', patient.id).maybeSingle(),
      ])

      setStats({
        upcoming:        upcomingRes.count   ?? 0,
        activeDoctors:   doctorsRes.count    ?? 0,
        prescriptions:   prescriptionsRes.count ?? 0,
        hasHealthProfile: !!profileRes.data,
      })
      setLoading(false)
    }
    load()
  }, [router])

  const cards = [
    { label: 'Upcoming appointments', value: stats.upcoming,      icon: '📅', href: '/appointments/new', cta: 'Book new', color: 'blue' },
    { label: 'Active doctor consents', value: stats.activeDoctors, icon: '👨‍⚕️', href: '/doctors',          cta: 'Manage',   color: 'green' },
    { label: 'Prescriptions',          value: stats.prescriptions, icon: '💊', href: '/records',          cta: 'View all', color: 'purple' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {loading ? 'Loading…' : `Namaste, ${name} 🙏`}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Ayushpathi Patient Portal</p>
        </div>
        <a href="/api/auth/signout" className="text-sm text-gray-400 hover:text-gray-600">Sign out</a>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Health profile nudge */}
        {!loading && !stats.hasHealthProfile && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-medium text-amber-900 text-sm">Complete your health profile</p>
              <p className="text-amber-700 text-xs mt-0.5">Add your conditions, allergies and medications so doctors can give you better care.</p>
              <a href="/profile/health" className="mt-2 inline-block text-xs font-medium text-amber-800 underline">Update now →</a>
            </div>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          {cards.map(c => (
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
            { icon: '🔍', title: 'Find doctors near me',  desc: 'Search by specialization and location', href: '/doctors/near-me' },
            { icon: '📋', title: 'Health records',         desc: 'View all consultations and prescriptions', href: '/records' },
            { icon: '💚', title: 'Health profile',         desc: 'Update conditions, allergies, medications', href: '/profile/health' },
            { icon: '🔒', title: 'Consent & privacy',      desc: 'Manage which doctors can see your data', href: '/doctors' },
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
      </main>
    </div>
  )
}
