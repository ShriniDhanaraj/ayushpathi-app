'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function authFetch(path: string) {
  const { data: { session } } = await supabase.auth.getSession()
  return fetch(path, { headers: { Authorization: `Bearer ${session?.access_token ?? ''}` } })
}

interface Appointment {
  id: string
  appointment_date: string
  start_time: string
  end_time: string
  status: string
  type: string
  is_walk_in: boolean
  booked_by_role: string
  notes: string | null
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
  patient: { first_name: string; last_name: string; mobile: string } | null
  doctor: { first_name: string; last_name: string; ayush_specialization: string } | null
  hospital: { name: string } | null
}

const STATUS_COLOR: Record<string, string> = {
  BOOKED: 'bg-blue-100 text-blue-700', CONFIRMED: 'bg-indigo-100 text-indigo-700',
  ARRIVED: 'bg-yellow-100 text-yellow-700', IN_PROGRESS: 'bg-orange-100 text-orange-700',
  COMPLETED: 'bg-green-100 text-green-700', NO_SHOW: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
}

export default function AdminAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  async function load(p = page) {
    setLoading(true)
    const params = new URLSearchParams({ date, page: String(p), limit: '20' })
    if (status) params.set('status', status)
    const res = await authFetch(`/api/hospital-admin/appointments?${params}`)
    const json = await res.json()
    setAppointments(json.appointments ?? [])
    setTotalPages(json.pages ?? 1)
    setTotal(json.total ?? 0)
    setLoading(false)
  }

  useEffect(() => { setPage(1); load(1) }, [date, status])

  return (
    <div className="max-w-5xl mx-auto p-6">
      <Link href="/hospital-admin"><p className="text-green-700 text-sm mb-4 hover:underline">← Dashboard</p></Link>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-800">Appointments</h1>
        <p className="text-sm text-gray-500">{total} total</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm" />
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm">
          <option value="">All Statuses</option>
          {['BOOKED','CONFIRMED','ARRIVED','IN_PROGRESS','COMPLETED','NO_SHOW','CANCELLED'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button onClick={() => load()} className="text-sm text-green-700 hover:underline">Refresh</button>
      </div>

      {loading ? <p className="text-gray-400">Loading…</p> : (
        <>
          <div className="space-y-3">
            {appointments.length === 0 && <p className="text-gray-500">No appointments found.</p>}
            {appointments.map(apt => (
              <div key={apt.id} className="bg-white border rounded p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-800">
                        {apt.patient?.first_name} {apt.patient?.last_name}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[apt.status] ?? 'bg-gray-100'}`}>
                        {apt.status}
                      </span>
                      {apt.is_walk_in && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Walk-in</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {apt.start_time?.slice(0, 5)} – {apt.end_time?.slice(0, 5)}
                      &nbsp;·&nbsp;Dr. {apt.doctor?.first_name} {apt.doctor?.last_name}
                      &nbsp;·&nbsp;{apt.type}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Patient mobile: {apt.patient?.mobile}
                      &nbsp;·&nbsp;Booked by: {apt.booked_by_role}
                    </p>
                    {/* Full audit trail */}
                    <p className="text-xs text-gray-400 mt-0.5">
                      Created: {new Date(apt.created_at).toLocaleString('en-IN')}
                      {apt.updated_at !== apt.created_at && (
                        <> · Updated: {new Date(apt.updated_at).toLocaleString('en-IN')}</>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-6">
              <button onClick={() => { setPage(p => Math.max(1, p - 1)); load(page - 1) }}
                disabled={page === 1} className="px-3 py-1 border rounded text-sm disabled:opacity-40">← Prev</button>
              <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
              <button onClick={() => { setPage(p => Math.min(totalPages, p + 1)); load(page + 1) }}
                disabled={page === totalPages} className="px-3 py-1 border rounded text-sm disabled:opacity-40">Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
