'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  openWhatsApp,
  buildAppointmentConfirmation,
  buildAppointmentReminder,
  buildWalkInToken,
} from '@/lib/whatsapp'

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


// ── Caller Identity types ─────────────────────────────────────────
type IdentifyStep = 'form' | 'confirm' | 'done'
interface IdentifyResult {
  found: boolean
  type?: 'patient' | 'doctor'
  record_id?: string
  masked_address?: string
  error?: string
}
interface ConfirmedProfile {
  id: string
  first_name: string
  last_name: string
  mobile: string
  email: string
  address: string | null
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
  COMPLETED: [], NO_SHOW: [], CANCELLED: [],
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

  function sendConfirmationWA(apt: Appointment) {
    if (!apt.patient?.mobile) return
    const msg = buildAppointmentConfirmation({
      patientName: `${apt.patient.first_name} ${apt.patient.last_name}`,
      doctorName: `${apt.doctor?.first_name} ${apt.doctor?.last_name}`,
      specialization: apt.doctor?.ayush_specialization,
      date: apt.appointment_date,
      startTime: apt.start_time,
      type: apt.type as 'F2F' | 'TELECONSULT',
      appointmentId: apt.id,
    })
    openWhatsApp(apt.patient.mobile, msg)
  }

  function sendReminderWA(apt: Appointment) {
    if (!apt.patient?.mobile) return
    const msg = buildAppointmentReminder({
      patientName: `${apt.patient.first_name} ${apt.patient.last_name}`,
      doctorName: `${apt.doctor?.first_name} ${apt.doctor?.last_name}`,
      date: apt.appointment_date,
      startTime: apt.start_time,
      appointmentId: apt.id,
    })
    openWhatsApp(apt.patient.mobile, msg)
  }

  function sendWalkInTokenWA(apt: Appointment, position: number) {
    if (!apt.patient?.mobile) return
    const msg = buildWalkInToken({
      patientName: `${apt.patient.first_name} ${apt.patient.last_name}`,
      doctorName: `${apt.doctor?.first_name} ${apt.doctor?.last_name}`,
      position,
    })
    openWhatsApp(apt.patient.mobile, msg)
  }


  // ── Caller identity lookup ────────────────────────────────────
  const [identifyOpen, setIdentifyOpen] = useState(false)
  const [identifyStep, setIdentifyStep] = useState<IdentifyStep>('form')
  const [identifyForm, setIdentifyForm] = useState({ mobile: '', date_of_birth: '', first_name: '', last_name: '' })
  const [identifyResult, setIdentifyResult] = useState<IdentifyResult | null>(null)
  const [identifyAddressInput, setIdentifyAddressInput] = useState('')
  const [identifyProfile, setIdentifyProfile] = useState<ConfirmedProfile | null>(null)
  const [identifyLoading, setIdentifyLoading] = useState(false)
  const [identifyWarning, setIdentifyWarning] = useState<string | null>(null)

  async function handleIdentify() {
    setIdentifyLoading(true)
    const res = await fetch('/api/receptionist/identify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(identifyForm),
    })
    const json: IdentifyResult = await res.json()
    setIdentifyResult(json)
    setIdentifyLoading(false)
    if (json.found) setIdentifyStep('confirm')
  }

  async function handleConfirm() {
    if (!identifyResult?.record_id || !identifyResult?.type) return
    setIdentifyLoading(true)
    const res = await fetch('/api/receptionist/identify/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        record_id: identifyResult.record_id,
        type: identifyResult.type,
        address_input: identifyAddressInput,
      }),
    })
    const json = await res.json()
    setIdentifyLoading(false)
    if (json.confirmed) {
      setIdentifyProfile(json.profile)
      setIdentifyWarning(json.warning ?? null)
      setIdentifyStep('done')
    } else {
      alert('Address does not match. Please ask the caller to confirm their details.')
    }
  }

  function resetIdentify() {
    setIdentifyOpen(false)
    setIdentifyStep('form')
    setIdentifyForm({ mobile: '', date_of_birth: '', first_name: '', last_name: '' })
    setIdentifyResult(null)
    setIdentifyAddressInput('')
    setIdentifyProfile(null)
    setIdentifyWarning(null)
  }

  const stats = {
    total: appointments.length,
    arrived: appointments.filter(a => ['ARRIVED','IN_PROGRESS'].includes(a.status)).length,
    completed: appointments.filter(a => a.status === 'COMPLETED').length,
    pending: appointments.filter(a => ['BOOKED','CONFIRMED'].includes(a.status)).length,
  }

  // Walk-in queue position counter
  let walkInCount = 0

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-green-800">Reception Desk</h1>
        <div className="flex gap-2">
          <button onClick={() => setIdentifyOpen(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 text-sm">
            🔍 Identify Caller
          </button>
          <Link href="/receptionist/book">
            <button className="bg-green-700 text-white px-4 py-2 rounded hover:bg-green-800 text-sm">
              + Book Appointment
            </button>
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <label className="text-sm font-medium text-gray-600">Date</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
        <button onClick={load} className="text-sm text-green-700 hover:underline">Refresh</button>
      </div>

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

      {loading ? <p className="text-gray-500">Loading…</p> : appointments.length === 0 ? (
        <p className="text-gray-500">No appointments for this date.</p>
      ) : (
        <div className="space-y-3">
          {appointments.map((apt, idx) => {
            const statusCfg = STATUS_CONFIG[apt.status] ?? { label: apt.status, color: 'bg-gray-100 text-gray-600' }
            const nextStatuses = NEXT_STATUS[apt.status] ?? []
            if (apt.is_walk_in) walkInCount++
            const walkInPosition = apt.is_walk_in ? walkInCount : 0

            return (
              <div key={apt.id} className="bg-white border rounded p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="font-semibold text-gray-800">
                        {apt.patient?.first_name} {apt.patient?.last_name}
                      </p>
                      {apt.is_walk_in && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Walk-in #{walkInPosition}</span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusCfg.color}`}>{statusCfg.label}</span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {apt.start_time?.slice(0, 5)} – {apt.end_time?.slice(0, 5)} · Dr. {apt.doctor?.first_name} {apt.doctor?.last_name}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{apt.patient?.mobile}</p>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 ml-4">
                    {/* Status action buttons */}
                    <div className="flex gap-1.5 flex-wrap justify-end">
                      {nextStatuses.map(s => (
                        <button key={s} onClick={() => updateStatus(apt.id, s)}
                          disabled={updating === apt.id}
                          className="text-xs border border-gray-300 rounded px-2 py-1 hover:bg-gray-50 disabled:opacity-50">
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

                    {/* WhatsApp buttons */}
                    {apt.patient?.mobile && (
                      <div className="flex gap-1.5 flex-wrap justify-end">
                        {['BOOKED','CONFIRMED'].includes(apt.status) && (
                          <button onClick={() => sendConfirmationWA(apt)}
                            className="text-xs bg-[#25D366] text-white rounded px-2 py-1 hover:bg-[#1ea352]">
                            💬 Confirm
                          </button>
                        )}
                        {['BOOKED','CONFIRMED','ARRIVED'].includes(apt.status) && (
                          <button onClick={() => sendReminderWA(apt)}
                            className="text-xs border border-[#25D366] text-[#1ea352] rounded px-2 py-1 hover:bg-green-50">
                            💬 Reminder
                          </button>
                        )}
                        {apt.is_walk_in && apt.status === 'BOOKED' && (
                          <button onClick={() => sendWalkInTokenWA(apt, walkInPosition)}
                            className="text-xs border border-purple-300 text-purple-700 rounded px-2 py-1 hover:bg-purple-50">
                            💬 Token
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      {/* ── Identify Caller Modal ─────────────────────────────── */}
      {identifyOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">
                {identifyStep === 'form' && '🔍 Identify Caller'}
                {identifyStep === 'confirm' && '🔒 Confirm Identity (GDPR)'}
                {identifyStep === 'done' && '✅ Caller Identified'}
              </h2>
              <button onClick={resetIdentify} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            {identifyStep === 'form' && (
              <div className="space-y-3">
                <p className="text-xs text-gray-500">Ask the caller for these 4 details:</p>
                {[
                  { key: 'first_name', label: 'First Name', type: 'text', placeholder: 'Raj' },
                  { key: 'last_name', label: 'Last Name', type: 'text', placeholder: 'Kumar' },
                  { key: 'date_of_birth', label: 'Date of Birth', type: 'date', placeholder: '' },
                  { key: 'mobile', label: 'WhatsApp Mobile', type: 'tel', placeholder: '9876543210' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs font-medium text-gray-600 block mb-0.5">{f.label}</label>
                    <input
                      type={f.type}
                      placeholder={f.placeholder}
                      value={identifyForm[f.key as keyof typeof identifyForm]}
                      onChange={e => setIdentifyForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                ))}
                {identifyResult?.found === false && (
                  <p className="text-xs text-red-600 bg-red-50 rounded px-3 py-2">
                    {identifyResult.error ?? 'No record found. Check spelling or mobile number.'}
                  </p>
                )}
                <button onClick={handleIdentify} disabled={identifyLoading}
                  className="w-full bg-indigo-600 text-white rounded py-2 text-sm hover:bg-indigo-700 disabled:opacity-50 mt-1">
                  {identifyLoading ? 'Searching…' : 'Find Record'}
                </button>
              </div>
            )}

            {identifyStep === 'confirm' && identifyResult && (
              <div className="space-y-3">
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800">
                  <p className="font-medium mb-1">GDPR Verification Required</p>
                  <p>Ask the caller: <em>"Can you confirm the first line of your registered address?"</em></p>
                  <p className="mt-2 text-xs text-gray-500">Our record starts with: <strong>{identifyResult.masked_address}</strong></p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-0.5">Caller's address (type what they say)</label>
                  <input
                    type="text"
                    placeholder="e.g. 42 Gandhi Street"
                    value={identifyAddressInput}
                    onChange={e => setIdentifyAddressInput(e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setIdentifyStep('form')} className="flex-1 border rounded py-2 text-sm text-gray-600 hover:bg-gray-50">
                    ← Back
                  </button>
                  <button onClick={handleConfirm} disabled={identifyLoading || !identifyAddressInput.trim()}
                    className="flex-1 bg-indigo-600 text-white rounded py-2 text-sm hover:bg-indigo-700 disabled:opacity-50">
                    {identifyLoading ? 'Verifying…' : 'Confirm Identity'}
                  </button>
                </div>
              </div>
            )}

            {identifyStep === 'done' && identifyProfile && (
              <div className="space-y-3">
                {identifyWarning && (
                  <p className="text-xs bg-yellow-50 text-yellow-700 rounded px-3 py-2">{identifyWarning}</p>
                )}
                <div className="bg-green-50 border border-green-200 rounded p-4 space-y-1.5">
                  <p className="text-sm"><span className="text-gray-500 text-xs">Name</span><br/>
                    <strong>{identifyProfile.first_name} {identifyProfile.last_name}</strong>
                    <span className="ml-2 text-xs text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full">
                      {identifyResult?.type === 'doctor' ? 'Doctor' : 'Patient'}
                    </span>
                  </p>
                  <p className="text-sm"><span className="text-gray-500 text-xs">Mobile</span><br/>{identifyProfile.mobile}</p>
                  <p className="text-sm"><span className="text-gray-500 text-xs">Email</span><br/>{identifyProfile.email}</p>
                  {identifyProfile.address && (
                    <p className="text-sm"><span className="text-gray-500 text-xs">Address</span><br/>{identifyProfile.address}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => identifyProfile.mobile && openWhatsApp(identifyProfile.mobile, `Hi ${identifyProfile.first_name}, this is Ayushpathi reception. How can we help you today?`)}
                    className="flex-1 bg-[#25D366] text-white rounded py-2 text-sm hover:bg-[#1ea352]">
                    💬 Open WhatsApp
                  </button>
                  <button onClick={resetIdentify} className="flex-1 border rounded py-2 text-sm text-gray-600 hover:bg-gray-50">
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
