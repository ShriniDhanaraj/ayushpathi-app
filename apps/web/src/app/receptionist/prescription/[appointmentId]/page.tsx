'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

interface Medicine {
  name: string
  dosage: string
  frequency: string
  duration: string
  notes: string
}

interface AppointmentInfo {
  id: string
  appointment_date: string
  patient: { first_name: string; last_name: string } | null
  doctor: { id: string; first_name: string; last_name: string } | null
}

const EMPTY_MED: Medicine = { name: '', dosage: '', frequency: '', duration: '', notes: '' }

export default function PrescriptionEntryPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>()
  const router = useRouter()

  const [apt, setApt] = useState<AppointmentInfo | null>(null)
  const [form, setForm] = useState({
    chief_complaint: '',
    diagnosis: '',
    notes: '',
    next_visit_date: '',
    instructions: '',
    is_repeat: false,
  })
  const [medicines, setMedicines] = useState<Medicine[]>([{ ...EMPTY_MED }])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetch(`/api/receptionist/appointments?date=`)
      .then(r => r.json())
      .then(json => {
        const found = (json.appointments ?? []).find((a: AppointmentInfo) => a.id === appointmentId)
        if (found) setApt(found)
      })
  }, [appointmentId])

  function addMedicine() {
    setMedicines(m => [...m, { ...EMPTY_MED }])
  }

  function removeMedicine(i: number) {
    setMedicines(m => m.filter((_, idx) => idx !== i))
  }

  function updateMedicine(i: number, field: keyof Medicine, value: string) {
    setMedicines(m => m.map((med, idx) => idx === i ? { ...med, [field]: value } : med))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validMeds = medicines.filter(m => m.name.trim())
    if (!validMeds.length) { setError('Add at least one medicine'); return }

    setSubmitting(true)
    setError('')

    const res = await fetch('/api/receptionist/prescription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appointment_id: appointmentId,
        patient_id: apt?.patient ? undefined : undefined, // fetched server-side from appointment
        doctor_id: apt?.doctor?.id,
        ...form,
        next_visit_date: form.next_visit_date || null,
        medicines: validMeds,
      }),
    })

    const json = await res.json()
    setSubmitting(false)

    if (!res.ok) { setError(json.error ?? 'Failed to save'); return }
    setSuccess(true)
    setTimeout(() => router.push('/receptionist'), 1500)
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <button onClick={() => router.push('/receptionist')} className="text-green-700 text-sm mb-4 hover:underline">← Back</button>
      <h1 className="text-xl font-bold text-gray-800 mb-1">Enter Prescription</h1>
      {apt && (
        <p className="text-sm text-gray-500 mb-6">
          Patient: <span className="font-medium text-gray-700">{apt.patient?.first_name} {apt.patient?.last_name}</span>
          &nbsp;·&nbsp;Dr. {apt.doctor?.first_name} {apt.doctor?.last_name}
          &nbsp;·&nbsp;{apt.appointment_date}
        </p>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded p-3 text-green-700 text-sm mb-4">
          Prescription saved! Redirecting…
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Consultation details */}
        <div className="bg-gray-50 border rounded p-4 space-y-3">
          <h2 className="font-semibold text-gray-700 text-sm">Consultation Details</h2>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Chief Complaint</label>
            <input value={form.chief_complaint}
              onChange={e => setForm(f => ({ ...f, chief_complaint: e.target.value }))}
              className="w-full border rounded px-3 py-1.5 text-sm" placeholder="e.g. Fever for 3 days" />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Diagnosis</label>
            <input value={form.diagnosis}
              onChange={e => setForm(f => ({ ...f, diagnosis: e.target.value }))}
              className="w-full border rounded px-3 py-1.5 text-sm" placeholder="e.g. Viral fever" />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Doctor's Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2} className="w-full border rounded px-3 py-1.5 text-sm resize-none" />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Next Visit Date</label>
            <input type="date" value={form.next_visit_date}
              onChange={e => setForm(f => ({ ...f, next_visit_date: e.target.value }))}
              className="border rounded px-3 py-1.5 text-sm" />
          </div>
        </div>

        {/* Medicines */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-700 text-sm">Medicines *</h2>
            <button type="button" onClick={addMedicine}
              className="text-xs text-green-700 border border-green-300 rounded px-2 py-1 hover:bg-green-50">
              + Add Medicine
            </button>
          </div>

          <div className="space-y-3">
            {medicines.map((med, i) => (
              <div key={i} className="border rounded p-3 bg-white">
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-500 mb-0.5">Medicine Name *</label>
                    <input value={med.name} onChange={e => updateMedicine(i, 'name', e.target.value)}
                      placeholder="e.g. Paracetamol 500mg"
                      className="w-full border rounded px-2 py-1 text-sm" required />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-0.5">Dosage</label>
                    <input value={med.dosage} onChange={e => updateMedicine(i, 'dosage', e.target.value)}
                      placeholder="e.g. 1 tablet"
                      className="w-full border rounded px-2 py-1 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-0.5">Frequency</label>
                    <input value={med.frequency} onChange={e => updateMedicine(i, 'frequency', e.target.value)}
                      placeholder="e.g. 3 times a day"
                      className="w-full border rounded px-2 py-1 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-0.5">Duration</label>
                    <input value={med.duration} onChange={e => updateMedicine(i, 'duration', e.target.value)}
                      placeholder="e.g. 5 days"
                      className="w-full border rounded px-2 py-1 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-0.5">Special Notes</label>
                    <input value={med.notes} onChange={e => updateMedicine(i, 'notes', e.target.value)}
                      placeholder="e.g. after meals"
                      className="w-full border rounded px-2 py-1 text-sm" />
                  </div>
                </div>
                {medicines.length > 1 && (
                  <button type="button" onClick={() => removeMedicine(i)}
                    className="text-xs text-red-500 hover:text-red-700">Remove</button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* General instructions */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">General Instructions</label>
          <textarea value={form.instructions}
            onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))}
            rows={2} placeholder="e.g. Rest, avoid spicy food, drink plenty of fluids…"
            className="w-full border rounded px-3 py-2 text-sm resize-none" />
        </div>

        {/* Repeat prescription */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.is_repeat}
            onChange={e => setForm(f => ({ ...f, is_repeat: e.target.checked }))}
            className="w-4 h-4 accent-green-700" />
          <span className="text-sm text-gray-700">This is a repeat prescription</span>
        </label>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="flex gap-3">
          <button type="button" onClick={() => router.push('/receptionist')}
            className="flex-1 border rounded py-2 text-sm hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={submitting || success}
            className="flex-1 bg-green-700 text-white rounded py-2 text-sm hover:bg-green-800 disabled:opacity-50">
            {submitting ? 'Saving…' : 'Save Prescription'}
          </button>
        </div>
      </form>
    </div>
  )
}
