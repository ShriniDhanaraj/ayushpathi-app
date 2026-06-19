'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Patient { id: string; first_name: string; last_name: string; mobile: string }
interface Doctor { id: string; first_name: string; last_name: string; ayush_specialization: string }

export default function BookAppointmentPage() {
  const router = useRouter()
  const [patientSearch, setPatientSearch] = useState('')
  const [doctorSearch, setDoctorSearch] = useState('')
  const [patients, setPatients] = useState<Patient[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
  const [form, setForm] = useState({
    appointment_date: new Date().toISOString().split('T')[0],
    start_time: '',
    end_time: '',
    type: 'F2F',
    is_walk_in: false,
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!patientSearch) { setPatients([]); return }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/profile/patient?search=${encodeURIComponent(patientSearch)}`)
      const json = await res.json()
      setPatients(json.patients ?? [])
    }, 300)
    return () => clearTimeout(t)
  }, [patientSearch])

  useEffect(() => {
    if (!doctorSearch) { setDoctors([]); return }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/doctors?search=${encodeURIComponent(doctorSearch)}`)
      const json = await res.json()
      setDoctors(json.doctors ?? [])
    }, 300)
    return () => clearTimeout(t)
  }, [doctorSearch])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedPatient || !selectedDoctor) {
      setError('Please select a patient and a doctor')
      return
    }
    setSubmitting(true)
    setError('')

    const res = await fetch('/api/receptionist/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patient_id: selectedPatient.id,
        doctor_id: selectedDoctor.id,
        appointment_date: form.appointment_date,
        start_time: form.start_time,
        end_time: form.end_time,
        type: form.type,
        is_walk_in: form.is_walk_in,
        notes: form.notes || null,
        booked_by_role: 'RECEPTIONIST',
      }),
    })

    const json = await res.json()
    setSubmitting(false)

    if (!res.ok) {
      setError(json.error ?? 'Failed to book appointment')
      return
    }

    router.push('/receptionist')
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <button onClick={() => router.push('/receptionist')} className="text-green-700 text-sm mb-4 hover:underline">← Back</button>
      <h1 className="text-xl font-bold text-gray-800 mb-6">Book Appointment</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Walk-in toggle */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_walk_in}
            onChange={e => setForm(f => ({ ...f, is_walk_in: e.target.checked }))}
            className="w-4 h-4 accent-green-700"
          />
          <span className="text-sm font-medium text-gray-700">Walk-in patient</span>
        </label>

        {/* Patient search */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">Patient *</label>
          {selectedPatient ? (
            <div className="flex items-center justify-between border rounded p-2 bg-green-50">
              <span className="text-sm">{selectedPatient.first_name} {selectedPatient.last_name} · {selectedPatient.mobile}</span>
              <button type="button" onClick={() => setSelectedPatient(null)} className="text-xs text-red-500 hover:text-red-700">Change</button>
            </div>
          ) : (
            <>
              <input
                value={patientSearch}
                onChange={e => setPatientSearch(e.target.value)}
                placeholder="Search by name or mobile…"
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              {patients.length > 0 && (
                <div className="absolute z-10 w-full bg-white border rounded shadow-lg mt-1 max-h-48 overflow-y-auto">
                  {patients.map(p => (
                    <button key={p.id} type="button"
                      onClick={() => { setSelectedPatient(p); setPatientSearch(''); setPatients([]) }}
                      className="w-full text-left px-3 py-2 hover:bg-green-50 text-sm border-b last:border-0"
                    >
                      {p.first_name} {p.last_name} · {p.mobile}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Doctor search */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">Doctor *</label>
          {selectedDoctor ? (
            <div className="flex items-center justify-between border rounded p-2 bg-green-50">
              <span className="text-sm">Dr. {selectedDoctor.first_name} {selectedDoctor.last_name} · {selectedDoctor.ayush_specialization}</span>
              <button type="button" onClick={() => setSelectedDoctor(null)} className="text-xs text-red-500 hover:text-red-700">Change</button>
            </div>
          ) : (
            <>
              <input
                value={doctorSearch}
                onChange={e => setDoctorSearch(e.target.value)}
                placeholder="Search doctor by name…"
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              {doctors.length > 0 && (
                <div className="absolute z-10 w-full bg-white border rounded shadow-lg mt-1 max-h-48 overflow-y-auto">
                  {doctors.map(d => (
                    <button key={d.id} type="button"
                      onClick={() => { setSelectedDoctor(d); setDoctorSearch(''); setDoctors([]) }}
                      className="w-full text-left px-3 py-2 hover:bg-green-50 text-sm border-b last:border-0"
                    >
                      Dr. {d.first_name} {d.last_name} · {d.ayush_specialization}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Date & time */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
            <input type="date" required value={form.appointment_date}
              onChange={e => setForm(f => ({ ...f, appointment_date: e.target.value }))}
              className="w-full border rounded px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start *</label>
            <input type="time" required value={form.start_time}
              onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
              className="w-full border rounded px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End *</label>
            <input type="time" required value={form.end_time}
              onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
              className="w-full border rounded px-2 py-1.5 text-sm"
            />
          </div>
        </div>

        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
            className="border rounded px-2 py-1.5 text-sm">
            <option value="F2F">Face to Face</option>
            <option value="TELECONSULT">Teleconsult</option>
          </select>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            rows={2} placeholder="Optional notes for the doctor…"
            className="w-full border rounded px-3 py-2 text-sm resize-none"
          />
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="flex gap-3">
          <button type="button" onClick={() => router.push('/receptionist')}
            className="flex-1 border rounded py-2 text-sm hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={submitting}
            className="flex-1 bg-green-700 text-white rounded py-2 text-sm hover:bg-green-800 disabled:opacity-50">
            {submitting ? 'Booking…' : 'Book Appointment'}
          </button>
        </div>
      </form>
    </div>
  )
}
