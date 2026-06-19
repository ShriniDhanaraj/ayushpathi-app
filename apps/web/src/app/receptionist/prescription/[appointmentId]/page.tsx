'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { openWhatsApp, buildPrescriptionReady } from '@/lib/whatsapp'

interface Medicine { name: string; dosage: string; frequency: string; duration: string; notes: string }
interface AppointmentInfo {
  id: string; appointment_date: string
  patient: { id: string; first_name: string; last_name: string; mobile: string } | null
  doctor: { id: string; first_name: string; last_name: string } | null
}
interface TestResultRow { id: string; file_name: string; file_type: string; notes: string | null }

const EMPTY_MED: Medicine = { name: '', dosage: '', frequency: '', duration: '', notes: '' }

export default function PrescriptionEntryPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>()
  const router = useRouter()

  const [apt, setApt] = useState<AppointmentInfo | null>(null)
  const [form, setForm] = useState({
    chief_complaint: '', diagnosis: '', notes: '', next_visit_date: '', instructions: '', is_repeat: false,
  })
  const [medicines, setMedicines] = useState<Medicine[]>([{ ...EMPTY_MED }])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [savedPrescription, setSavedPrescription] = useState<{ medicineCount: number } | null>(null)

  // Test result attachment state
  const [testResults, setTestResults] = useState<TestResultRow[]>([])
  const [uploading, setUploading] = useState(false)
  const [attachNote, setAttachNote] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch(`/api/receptionist/appointments?date=`)
      .then(r => r.json())
      .then(json => {
        const found = (json.appointments ?? []).find((a: AppointmentInfo) => a.id === appointmentId)
        if (found) setApt(found)
      })
  }, [appointmentId])

  function addMedicine() { setMedicines(m => [...m, { ...EMPTY_MED }]) }
  function removeMedicine(i: number) { setMedicines(m => m.filter((_, idx) => idx !== i)) }
  function updateMedicine(i: number, field: keyof Medicine, value: string) {
    setMedicines(m => m.map((med, idx) => idx === i ? { ...med, [field]: value } : med))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validMeds = medicines.filter(m => m.name.trim())
    if (!validMeds.length) { setError('Add at least one medicine'); return }
    setSubmitting(true); setError('')

    const res = await fetch('/api/receptionist/prescription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appointment_id: appointmentId,
        ...form,
        next_visit_date: form.next_visit_date || null,
        medicines: validMeds,
        entered_by_role: 'RECEPTIONIST',
        entry_method: 'RECEPTIONIST',
      }),
    })
    const json = await res.json()
    setSubmitting(false)
    if (!res.ok) { setError(json.error ?? 'Failed to save'); return }
    setSavedPrescription({ medicineCount: validMeds.length })
  }

  async function handleFileUpload(files: FileList | null) {
    if (!files || !apt?.patient?.id) return
    const allowed = ['image/jpeg','image/png','image/webp','application/pdf','image/heic','image/heif']
    for (const file of Array.from(files)) {
      if (!allowed.includes(file.type)) { alert(`${file.name}: unsupported type`); continue }
      if (file.size > 52428800) { alert(`${file.name}: too large (max 50 MB)`); continue }
      setUploading(true)
      const fd = new FormData()
      fd.append('file', file)
      fd.append('appointment_id', appointmentId)
      fd.append('patient_id', apt.patient.id)
      fd.append('uploaded_by_role', 'RECEPTIONIST')
      if (attachNote.trim()) fd.append('notes', attachNote.trim())
      const res = await fetch('/api/test-results/upload', { method: 'POST', body: fd })
      const json = await res.json()
      setUploading(false)
      if (res.ok) {
        setTestResults(prev => [...prev, json.test_result])
        setAttachNote('')
      } else {
        alert('Upload failed: ' + (json.error ?? 'Unknown error'))
      }
    }
  }

  function sendPrescriptionWA() {
    if (!apt?.patient?.mobile || !savedPrescription) return
    const msg = buildPrescriptionReady({
      patientName: `${apt.patient.first_name} ${apt.patient.last_name}`,
      doctorName: `${apt.doctor?.first_name} ${apt.doctor?.last_name}`,
      date: apt.appointment_date,
      medicineCount: savedPrescription.medicineCount,
      nextVisitDate: form.next_visit_date || undefined,
    })
    openWhatsApp(apt.patient.mobile, msg)
  }

  if (savedPrescription) {
    return (
      <div className="max-w-lg mx-auto p-6 pt-12">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Prescription Saved</h2>
          <p className="text-gray-500">
            {savedPrescription.medicineCount} medicine{savedPrescription.medicineCount !== 1 ? 's' : ''} saved for{' '}
            {apt?.patient?.first_name} {apt?.patient?.last_name}
          </p>
        </div>

        {/* Test Result Attachment */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <h3 className="font-semibold text-amber-900 mb-1 text-sm">📎 Attach Test Results (optional)</h3>
          <p className="text-xs text-amber-700 mb-3">Attach lab reports, X-rays, or scans to this visit.</p>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={attachNote}
              onChange={e => setAttachNote(e.target.value)}
              placeholder="e.g. CBC report, Chest X-ray…"
              className="flex-1 border rounded px-3 py-1.5 text-sm"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="bg-amber-700 text-white rounded px-4 py-1.5 text-sm hover:bg-amber-800 disabled:opacity-50 whitespace-nowrap"
            >
              {uploading ? 'Uploading…' : '+ Attach File'}
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.pdf,.heic"
            multiple
            className="hidden"
            onChange={e => handleFileUpload(e.target.files)}
          />
          {testResults.length > 0 && (
            <div className="space-y-1.5">
              {testResults.map(r => (
                <div key={r.id} className="flex items-center gap-2 bg-white rounded px-3 py-2 text-sm border">
                  <span>{r.file_type === 'application/pdf' ? '📄' : '🖼️'}</span>
                  <span className="flex-1 text-gray-700 truncate">{r.file_name}</span>
                  {r.notes && <span className="text-xs text-gray-400">{r.notes}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          {apt?.patient?.mobile && (
            <button onClick={sendPrescriptionWA}
              className="w-full bg-[#25D366] text-white rounded-lg py-3 font-semibold text-sm hover:bg-[#1ea352] flex items-center justify-center gap-2">
              💬 Send Prescription Ready on WhatsApp
            </button>
          )}
          <button onClick={() => router.push('/receptionist')}
            className="w-full border rounded-lg py-3 text-sm text-gray-700 hover:bg-gray-50">
            Back to Queue
          </button>
        </div>
      </div>
    )
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

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-gray-50 border rounded p-4 space-y-3">
          <h2 className="font-semibold text-gray-700 text-sm">Consultation Details</h2>
          {([['chief_complaint','Chief Complaint','e.g. Fever for 3 days'],['diagnosis','Diagnosis','e.g. Viral fever']] as const).map(([key,label,ph]) => (
            <div key={key}>
              <label className="block text-xs text-gray-600 mb-1">{label}</label>
              <input value={(form as Record<string, string | boolean>)[key] as string}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder={ph} className="w-full border rounded px-3 py-1.5 text-sm" />
            </div>
          ))}
          <div>
            <label className="block text-xs text-gray-600 mb-1">Doctor&apos;s Notes</label>
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

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-700 text-sm">Medicines *</h2>
            <button type="button" onClick={addMedicine}
              className="text-xs text-green-700 border border-green-300 rounded px-2 py-1 hover:bg-green-50">+ Add</button>
          </div>
          <div className="space-y-3">
            {medicines.map((med, i) => (
              <div key={i} className="border rounded p-3 bg-white">
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-500 mb-0.5">Medicine Name *</label>
                    <input value={med.name} onChange={e => updateMedicine(i, 'name', e.target.value)}
                      placeholder="e.g. Paracetamol 500mg" className="w-full border rounded px-2 py-1 text-sm" required />
                  </div>
                  {(['dosage','frequency','duration','notes'] as const).map(f => (
                    <div key={f}>
                      <label className="block text-xs text-gray-500 mb-0.5 capitalize">{f === 'notes' ? 'Special Notes' : f}</label>
                      <input value={med[f]} onChange={e => updateMedicine(i, f, e.target.value)}
                        placeholder={f === 'dosage' ? '1 tablet' : f === 'frequency' ? '3×/day' : f === 'duration' ? '5 days' : 'after meals'}
                        className="w-full border rounded px-2 py-1 text-sm" />
                    </div>
                  ))}
                </div>
                {medicines.length > 1 && (
                  <button type="button" onClick={() => removeMedicine(i)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">General Instructions</label>
          <textarea value={form.instructions} onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))}
            rows={2} placeholder="e.g. Rest, avoid spicy food…" className="w-full border rounded px-3 py-2 text-sm resize-none" />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.is_repeat} onChange={e => setForm(f => ({ ...f, is_repeat: e.target.checked }))}
            className="w-4 h-4 accent-green-700" />
          <span className="text-sm text-gray-700">Repeat prescription</span>
        </label>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="flex gap-3">
          <button type="button" onClick={() => router.push('/receptionist')} className="flex-1 border rounded py-2 text-sm hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={submitting} className="flex-1 bg-green-700 text-white rounded py-2 text-sm hover:bg-green-800 disabled:opacity-50">
            {submitting ? 'Saving…' : 'Save Prescription'}
          </button>
        </div>
      </form>
    </div>
  )
}
