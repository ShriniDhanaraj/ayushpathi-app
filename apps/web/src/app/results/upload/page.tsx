'use client'
import { useState, useRef, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Appointment {
  id: string
  appointment_date: string
  start_time: string
  patient: { id: string; first_name: string; last_name: string } | null
  doctor: { first_name: string; last_name: string } | null
}

export default function UploadTestResultPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loadingAppts, setLoadingAppts] = useState(true)
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [notes, setNotes] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function loadAppts() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const today = new Date().toISOString().split('T')[0]
      // Last 7 days appointments
      const since = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
      const res = await fetch(`/api/receptionist/appointments?date=${today}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await res.json()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = (data.appointments ?? []).map((a: any) => ({
        ...a,
        patient: Array.isArray(a.patient) ? (a.patient[0] ?? null) : (a.patient ?? null),
        doctor:  Array.isArray(a.doctor)  ? (a.doctor[0]  ?? null) : (a.doctor  ?? null),
      }))
      setAppointments(rows)
      setLoadingAppts(false)
    }
    loadAppts()
  }, [])

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    if (f && f.size > 52428800) {
      setError('File too large — max 50 MB'); return
    }
    setFile(f); setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedAppt) { setError('Please select an appointment'); return }
    if (!file) { setError('Please choose a file'); return }
    if (!selectedAppt.patient) { setError('Appointment has no linked patient'); return }

    setUploading(true); setError(null)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setError('Not logged in'); setUploading(false); return }

    const fd = new FormData()
    fd.append('file', file)
    fd.append('appointment_id', selectedAppt.id)
    fd.append('patient_id', selectedAppt.patient.id)
    fd.append('uploaded_by_role', 'RECEPTIONIST')
    if (notes) fd.append('notes', notes)

    const res = await fetch('/api/test-results/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: fd,
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Upload failed'); setUploading(false); return }
    setSuccess(true)
    setUploading(false)
  }

  function reset() {
    setSuccess(false); setSelectedAppt(null); setFile(null); setNotes(''); setError(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b px-6 py-4 flex items-center gap-3">
          <a href="/dashboard/receptionist" className="text-gray-400 hover:text-gray-600 text-sm">← Dashboard</a>
          <span className="font-semibold text-gray-900">Attach Test Results</span>
        </header>
        <main className="max-w-lg mx-auto p-10 text-center space-y-4">
          <p className="text-4xl">✅</p>
          <h2 className="font-semibold text-gray-900 text-xl">Result uploaded</h2>
          <p className="text-sm text-gray-500">
            {file?.name} attached to{' '}
            {selectedAppt?.patient?.first_name} {selectedAppt?.patient?.last_name}&apos;s appointment.
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <button onClick={reset} className="btn-primary text-sm px-5 py-2">Upload another</button>
            <a href="/dashboard/receptionist" className="text-sm text-gray-500 hover:underline self-center">← Dashboard</a>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-3">
        <a href="/dashboard/receptionist" className="text-gray-400 hover:text-gray-600 text-sm">← Dashboard</a>
        <span className="font-semibold text-gray-900">Attach Test Results</span>
      </header>

      <main className="max-w-xl mx-auto p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          )}

          {/* Appointment selector */}
          <div className="card p-5 space-y-3">
            <h2 className="font-semibold text-gray-900">Select appointment</h2>
            {loadingAppts ? (
              <p className="text-sm text-gray-400">Loading today&apos;s appointments…</p>
            ) : appointments.length === 0 ? (
              <p className="text-sm text-gray-400">No appointments found for today.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {appointments.map(a => (
                  <button
                    key={a.id} type="button"
                    onClick={() => setSelectedAppt(a)}
                    className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors ${
                      selectedAppt?.id === a.id
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <p className="font-medium text-gray-900">
                      {a.patient ? `${a.patient.first_name} ${a.patient.last_name}` : 'Unknown patient'}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {a.start_time.slice(0, 5)} · {a.appointment_date}
                      {a.doctor ? ` · Dr. ${a.doctor.first_name} ${a.doctor.last_name}` : ''}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* File picker */}
          <div className="card p-5 space-y-3">
            <h2 className="font-semibold text-gray-900">File</h2>
            <div
              className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-brand-400 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {file ? (
                <div>
                  <p className="text-sm font-medium text-gray-900">{file.name}</p>
                  <p className="text-xs text-gray-400 mt-1">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-2xl">📎</p>
                  <p className="text-sm text-gray-600">Click to choose a file</p>
                  <p className="text-xs text-gray-400">JPG, PNG, PDF, HEIC · max 50 MB</p>
                </div>
              )}
            </div>
            <input
              ref={fileRef} type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf,image/heic,image/heif"
              onChange={handleFile} className="hidden"
            />
          </div>

          {/* Notes */}
          <div className="card p-5 space-y-2">
            <h2 className="font-semibold text-gray-900">Notes <span className="text-xs font-normal text-gray-400">(optional)</span></h2>
            <textarea
              value={notes} onChange={e => setNotes(e.target.value)}
              rows={3} className="input w-full resize-none"
              placeholder="e.g. Blood test results from Apollo Diagnostics, 25 Jun 2026"
            />
          </div>

          <button type="submit" disabled={uploading || !selectedAppt || !file}
            className="btn-primary w-full py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed">
            {uploading ? 'Uploading…' : 'Upload Result'}
          </button>
        </form>
      </main>
    </div>
  )
}
