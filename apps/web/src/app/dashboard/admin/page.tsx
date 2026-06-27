'use client'
import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import SignOutButton from '@/components/auth/SignOutButton'

interface PendingDoctor { id: string; first_name: string; last_name: string; ayush_specialization: string; created_at: string }

export default function AdminDashboard() {
  const [pending, setPending] = useState<PendingDoctor[]>([])
  const [counts, setCounts] = useState({ doctors: 0, patients: 0, hospitals: 0, appointments: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = getSupabaseClient()
      const [pendingRes, doctorsRes, patientsRes, hospitalsRes, appointmentsRes] = await Promise.all([
        supabase.from('doctor').select('id, first_name, last_name, ayush_specialization, created_at')
          .eq('verification_status', 'PENDING').order('created_at'),
        supabase.from('doctor').select('id', { count: 'exact', head: true }).eq('verification_status', 'APPROVED'),
        supabase.from('patient').select('id', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('hospital').select('id', { count: 'exact', head: true }),
        supabase.from('appointment').select('id', { count: 'exact', head: true }),
      ])
      setPending(pendingRes.data ?? [])
      setCounts({
        doctors:      doctorsRes.count   ?? 0,
        patients:     patientsRes.count  ?? 0,
        hospitals:    hospitalsRes.count ?? 0,
        appointments: appointmentsRes.count ?? 0,
      })
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Ayushpathi Admin</h1>
          <p className="text-sm text-gray-500 mt-0.5">Platform management</p>
        </div>
        <SignOutButton className="text-sm text-gray-400 hover:text-gray-600" />
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Platform stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Approved doctors', value: counts.doctors,      icon: '👨‍⚕️' },
            { label: 'Patients',          value: counts.patients,     icon: '👥' },
            { label: 'Hospitals',         value: counts.hospitals,    icon: '🏥' },
            { label: 'Appointments',      value: counts.appointments, icon: '📅' },
          ].map(c => (
            <div key={c.label} className="card p-5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xl">{c.icon}</span>
                <span className="text-2xl font-bold text-gray-900">{loading ? '–' : c.value}</span>
              </div>
              <p className="text-xs text-gray-500">{c.label}</p>
            </div>
          ))}
        </div>

        {/* Pending verifications */}
        <div className="card">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Pending doctor verifications</h2>
            {pending.length > 0 && (
              <span className="bg-red-100 text-red-700 text-xs font-semibold px-2.5 py-1 rounded-full">{pending.length} pending</span>
            )}
          </div>
          {loading ? (
            <div className="p-6 text-center text-gray-400 text-sm">Loading…</div>
          ) : pending.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">✅ No pending verifications</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {pending.map(d => (
                <li key={d.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">Dr. {d.first_name} {d.last_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{d.ayush_specialization} · Applied {new Date(d.created_at).toLocaleDateString('en-IN')}</p>
                  </div>
                  <a href={`/admin/verify/${d.id}`} className="btn-primary text-sm py-2 px-4">Review →</a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  )
}
