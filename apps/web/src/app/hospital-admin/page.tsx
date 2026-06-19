'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Stats {
  date: string
  appointments: { total: number; completed: number; in_clinic: number; no_show: number; pending: number }
  doctors: number
  receptionists: number
  prescriptions_pending_verification: number
}

async function authFetch(path: string) {
  const { data: { session } } = await supabase.auth.getSession()
  return fetch(path, {
    headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
  })
}

export default function HospitalAdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authFetch('/api/hospital-admin/stats')
      .then(r => r.json())
      .then(json => { setStats(json); setLoading(false) })
  }, [])

  const nav = [
    { label: 'Doctors', href: '/hospital-admin/doctors', icon: '👨‍⚕️', desc: 'Manage linked doctors' },
    { label: 'Receptionists', href: '/hospital-admin/receptionists', icon: '🗂️', desc: 'Manage front desk staff' },
    { label: 'Appointments', href: '/hospital-admin/appointments', icon: '📅', desc: 'View all appointments' },
  ]

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-green-800 mb-1">Hospital Admin Dashboard</h1>
      <p className="text-sm text-gray-500 mb-6">
        {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </p>

      {loading ? (
        <p className="text-gray-400">Loading stats…</p>
      ) : stats ? (
        <>
          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Today's Appointments", value: stats.appointments.total, sub: `${stats.appointments.pending} pending`, color: 'border-blue-200 bg-blue-50' },
              { label: 'In Clinic Now', value: stats.appointments.in_clinic, sub: `${stats.appointments.completed} completed`, color: 'border-yellow-200 bg-yellow-50' },
              { label: 'No Shows', value: stats.appointments.no_show, sub: 'today', color: 'border-red-200 bg-red-50' },
              { label: 'Rx Pending Review', value: stats.prescriptions_pending_verification, sub: 'awaiting doctor sign-off', color: 'border-orange-200 bg-orange-50' },
              { label: 'Active Doctors', value: stats.doctors, sub: 'at this hospital', color: 'border-green-200 bg-green-50' },
              { label: 'Receptionists', value: stats.receptionists, sub: 'active staff', color: 'border-purple-200 bg-purple-50' },
            ].map(s => (
              <div key={s.label} className={`border rounded-xl p-4 ${s.color}`}>
                <p className="text-3xl font-bold text-gray-800">{s.value}</p>
                <p className="text-sm font-medium text-gray-700 mt-1">{s.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Navigation cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {nav.map(n => (
              <Link key={n.href} href={n.href}>
                <div className="border rounded-xl p-5 bg-white hover:shadow-md transition cursor-pointer">
                  <p className="text-3xl mb-2">{n.icon}</p>
                  <p className="font-semibold text-gray-800">{n.label}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{n.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </>
      ) : (
        <p className="text-red-500">Failed to load stats.</p>
      )}
    </div>
  )
}
