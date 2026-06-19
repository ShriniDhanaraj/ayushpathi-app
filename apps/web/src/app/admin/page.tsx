'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function authFetch(path: string) {
  const { data: { session } } = await supabase.auth.getSession()
  return fetch(path, { headers: { Authorization: `Bearer ${session?.access_token ?? ''}` } })
}

interface GlobalStats {
  scope: 'GROUP' | 'GLOBAL'
  date: string
  hospitals: number
  appointments: { total: number; completed: number; in_clinic: number; cancelled: number; pending: number }
  doctors: number
  prescriptions_pending_verification: number
}

interface HospitalRow {
  id: string
  name: string
  city: string
  state: string
  whatsapp_number: string | null
  stats: { appointments_today: number; completed: number; in_clinic: number; cancelled: number; doctors: number }
}

function StatCard({ label, value, sub, color }: { label: string; value: number; sub?: string; color: string }) {
  return (
    <div className={`rounded-xl border p-4 ${color}`}>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm font-medium text-gray-700 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  )
}

export default function AdminPage() {
  const [stats, setStats] = useState<GlobalStats | null>(null)
  const [hospitals, setHospitals] = useState<HospitalRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      authFetch('/api/admin/stats').then(r => r.json()),
      authFetch('/api/admin/hospitals').then(r => r.json()),
    ]).then(([s, h]) => {
      if (s.error) { setError(s.error); setLoading(false); return }
      setStats(s)
      setHospitals(h.hospitals ?? [])
      setLoading(false)
    }).catch(() => { setError('Failed to load data'); setLoading(false) })
  }, [])

  const filtered = hospitals.filter(h =>
    h.name.toLowerCase().includes(search.toLowerCase()) ||
    h.city?.toLowerCase().includes(search.toLowerCase()) ||
    h.state?.toLowerCase().includes(search.toLowerCase())
  )

  const scopeLabel = stats?.scope === 'GLOBAL' ? 'Platform Overview' : 'Group Overview'

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400 text-sm">Loading…</p>
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-red-600 font-medium">{error}</p>
        <p className="text-sm text-gray-500 mt-2">Make sure you're signed in as a GROUP or GLOBAL admin.</p>
        <Link href="/hospital-admin" className="text-green-700 text-sm underline mt-3 block">
          Try Hospital Admin instead
        </Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-green-800">Ayushpathi Admin</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {scopeLabel} · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
            stats?.scope === 'GLOBAL'
              ? 'bg-purple-50 border-purple-200 text-purple-700'
              : 'bg-blue-50 border-blue-200 text-blue-700'
          }`}>
            {stats?.scope} ADMIN
          </span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Aggregate stats */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Today's Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Hospitals"
              value={stats!.hospitals}
              sub="active in scope"
              color="border-green-200 bg-green-50"
            />
            <StatCard
              label="Appointments"
              value={stats!.appointments.total}
              sub={`${stats!.appointments.completed} completed · ${stats!.appointments.pending} pending`}
              color="border-blue-200 bg-blue-50"
            />
            <StatCard
              label="Active Doctors"
              value={stats!.doctors}
              sub="across all hospitals"
              color="border-emerald-200 bg-emerald-50"
            />
            <StatCard
              label="Rx Pending Review"
              value={stats!.prescriptions_pending_verification}
              sub="awaiting doctor sign-off"
              color="border-amber-200 bg-amber-50"
            />
          </div>
          {/* Secondary stats row */}
          <div className="grid grid-cols-3 gap-4 mt-4">
            <StatCard
              label="In Clinic Now"
              value={stats!.appointments.in_clinic}
              color="border-yellow-200 bg-yellow-50"
            />
            <StatCard
              label="Completed Today"
              value={stats!.appointments.completed}
              color="border-teal-200 bg-teal-50"
            />
            <StatCard
              label="Cancelled Today"
              value={stats!.appointments.cancelled}
              color="border-red-200 bg-red-50"
            />
          </div>
        </section>

        {/* Hospital list */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Hospitals ({filtered.length})
            </h2>
            <input
              type="search"
              placeholder="Search hospitals…"
              className="border rounded-lg px-3 py-1.5 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-green-300"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {filtered.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-12">No hospitals found.</p>
          ) : (
            <div className="space-y-3">
              {filtered.map(h => (
                <div key={h.id} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-4">
                    {/* Hospital info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">🏥</span>
                        <div>
                          <p className="font-semibold text-gray-900">{h.name}</p>
                          <p className="text-sm text-gray-500">
                            {[h.city, h.state].filter(Boolean).join(', ')}
                            {h.whatsapp_number && (
                              <a
                                href={`https://wa.me/${h.whatsapp_number}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-3 text-green-600 hover:underline"
                              >
                                WhatsApp
                              </a>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Today's mini stats */}
                    <div className="flex items-center gap-6 text-center flex-shrink-0">
                      <div>
                        <p className="text-lg font-bold text-gray-900">{h.stats.appointments_today}</p>
                        <p className="text-xs text-gray-500">appts today</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-teal-700">{h.stats.completed}</p>
                        <p className="text-xs text-gray-500">done</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-yellow-700">{h.stats.in_clinic}</p>
                        <p className="text-xs text-gray-500">in clinic</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-green-700">{h.stats.doctors}</p>
                        <p className="text-xs text-gray-500">doctors</p>
                      </div>

                      {/* Drill-in link (passes hospital id as query param to hospital-admin) */}
                      <Link
                        href={`/hospital-admin?hospital_id=${h.id}`}
                        className="ml-2 text-sm text-green-700 font-medium hover:underline whitespace-nowrap"
                      >
                        Manage →
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Quick links */}
        {stats?.scope === 'GLOBAL' && (
          <section className="border-t pt-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Platform Tools</h2>
            <div className="flex gap-3 flex-wrap">
              <Link href="/admin/verify" className="bg-white border rounded-lg px-4 py-3 text-sm font-medium text-gray-700 hover:border-green-400 hover:text-green-700 transition-colors">
                ✅ Doctor Verification Queue
              </Link>
              <Link href="/hospital-admin" className="bg-white border rounded-lg px-4 py-3 text-sm font-medium text-gray-700 hover:border-green-400 hover:text-green-700 transition-colors">
                🏥 Hospital Admin View
              </Link>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
