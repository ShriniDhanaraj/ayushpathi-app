'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Appointment {
  id: string
  appointment_date: string
  start_time: string
  end_time: string
  status: string
  type: string
  is_walk_in: boolean
  notes: string | null
  patient: { id: string; first_name: string; last_name: string; mobile: string } | null
  doctor: { id: string; first_name: string; last_name: string; ayush_specialization: string } | null
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  BOOKED:      { label: 'Booked',      color: 'bg-blue-100 text-blue-700' },
  CONFIRMED:   { label: 'Confirmed',   color: 'bg-indigo-100 text-indigo-700' },
  ARRIVED:     { label: 'Arrived',     color: 'bg-yellow-100 text-yellow-700' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-orange-100 text-orange-700' },
  COMPLETED:   { label: 'Completed',   color: 'bg-green-100 text-green-700' },
  NO_SHOW:     { label: 'No Show',     color: 'bg-red-100 text-red-700' },
  CANCELLED:   { label: 'Cancelled',   color: 'bg-gray-100 text-gray-500' },
}

const NEXT_STATUS: Record<string, string[]> = {
  BOOKED:      ['ARRIVED', 'NO_SHOW', 'CANCELLED'],
  CONFIRMED:   ['ARRIVED', 'NO_SHOW', 'CANCELLED'],
  ARRIVED:     ['IN_PROGRESS', 'NO_SHOW'],
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED:   [],
  NO_SHOW:     [],
  CANCELLED:   [],
}

export default function ReceptionistPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/receptionist/appointments?date=${date}`)
    const json = await res.json()
    setAppointments(json.appointments ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [date])

  async function updateStatus(id: string, status: string) {
    setUpdating(id)
    await fetch(`/api/receptionist/appointments/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setUpdating(null)
    load()
  }

  const stats = {
    total: appointments.length,
    arrived: appointments.filter(a => a.status === 'ARRIVED' || a.status === 'IN_PROGRESS').length,
    completed: appointments.filter(a => a.status === 'COMPLETED').length,
    pending: appointments.filter(a => ['BOOKED', 'CONFIRMED'].includes(a.status)).length,
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-green-800">Reception Desk</h1>
        <Link href="/receptionist/book">
          <button className="bg-green-700 text-white px-4 py-2 rounded hover:bg-green-800 text-sm">
            + Book Appointment
          </button>
        </Link>
      </div>

      {/* Date picker */}
      <div className="flex items-center gap-3 mb-6">
        <label className="text-sm font-medium text-gray-600">Date</label>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <button onClick={load} className="text-sm text-green-700 hover:underline">Refresh</button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total', value: stats.total, color: 'bg-gray-50' },
          { label: 'Pending', value: stats.pending, color: 'bg-blue-50' },
          { label: 'In Clinic', value: stats.arrived, color: 'bg-yellow-50' },
          { label: 'Completed', value: stats.completed, color: 'bg-green-50' },
        ].map(s => (
          <div key={s.label} className={`${s.color} border rounded p-3 text-center`}>
            <p className="text-2xl font-bold text-gray-800">{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : appointments.length === 0 ? (
        <p className="text-gray-500">No appointments for this date.</p>
      ) : (
        <div className="space-y-3">
          {appointments.map(apt => {
            const statusCfg = STATUS_CONFIG[apt.status] ?? { label: apt.status, color: 'bg-gray-100 text-gray-600' }
            const nextStatuses = NEXT_STATUS[apt.status] ?? []

            return (
              <div key={apt.id} className="bg-white border rounded p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-800">
                        {apt.patient?.first_name} {apt.patient?.last_name}
                      </p>
                      {apt.is_walk_in && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Walk-in</span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusCfg.color}`}>{statusCfg.label}</span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {apt.start_time?.slice(0, 5)} – {apt.end_time?.slice(0, 5)} &nbsp;·&nbsp;
                      Dr. {apt.doctor?.first_name} {apt.doctor?.last_name}
                    </p>
                    {apt.patient?.mobile && (
                      <p className="text-xs text-gray-400 mt-0.5">{apt.patient.mobile}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                    {nextStatuses.map(s => (
                      <button
                        key={s}
                        onClick={() => updateStatus(apt.id, s)}
                        disabled={updating === apt.id}
                        className="text-xs border border-gray-300 rounded px-2 py-1 hover:bg-gray-50 disabled:opacity-50"
                      >
                        {STATUS_CONFIG[s]?.label ?? s}
                      </button>
                    ))}
                    {apt.status === 'COMPLETED' && (
                      <Link href={`/receptionist/prescription/${apt.id}`}>
                        <button className="text-xs bg-green-700 text-white rounded px-2 py-1 hover:bg-green-800">
                          + Prescription
                        </button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
