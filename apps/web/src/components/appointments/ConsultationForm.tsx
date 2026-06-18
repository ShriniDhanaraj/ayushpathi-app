'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'

interface Medicine { name: string; dosage: string; frequency: string; duration: string; notes: string }

const EMPTY_MED: Medicine = { name: '', dosage: '', frequency: '', duration: '', notes: '' }

const FREQUENCIES = ['Once daily', 'Twice daily', 'Three times daily', 'Before food', 'After food', 'At bedtime', 'As needed']

export default function ConsultationForm({
  appointmentId, patientId, doctorId
}: { appointmentId: string; patientId: string; doctorId: string }) {
  const router = useRouter()
  const [chiefComplaint, setChiefComplaint] = useState('')
  const [symptoms, setSymptoms] = useState('')
  const [diagnosis, setDiagnosis] = useState('')
  const [notes, setNotes] = useState('')
  const [nextVisit, setNextVisit] = useState('')
  const [medicines, setMedicines] = useState<Medicine[]>([{ ...EMPTY_MED }])
  const [instructions, setInstructions] = useState('')
  const [isRepeat, setIsRepeat] = useState(false)
  const [saving, setSaving] = useState(false)

  function updateMed(i: number, field: keyof Medicine, value: string) {
    setMedicines(ms => ms.map((m, idx) => idx === i ? { ...m, [field]: value } : m))
  }

  function addMed() { setMedicines(ms => [...ms, { ...EMPTY_MED }]) }
  function removeMed(i: number) { setMedicines(ms => ms.filter((_, idx) => idx !== i)) }

  async function save() {
    setSaving(true)
    const supabase = getSupabaseClient()

    // Insert consultation (every write is logged via audit_log trigger)
    const { data: consult, error } = await supabase.from('consultation').insert({
      appointment_id: appointmentId,
      patient_id: patientId,
      doctor_id: doctorId,
      chief_complaint: chiefComplaint,
      symptoms: symptoms.split(',').map(s => s.trim()).filter(Boolean),
      diagnosis,
      notes,
      next_visit_date: nextVisit || null,
    }).select().single()

    if (error) { alert(error.message); setSaving(false); return }

    // Insert prescription if medicines added
    const validMeds = medicines.filter(m => m.name.trim())
    if (validMeds.length > 0) {
      await supabase.from('prescription').insert({
        consultation_id: consult.id,
        patient_id: patientId,
        doctor_id: doctorId,
        medicines: validMeds,
        instructions,
        is_repeat: isRepeat,
      })
    }

    // Mark appointment complete
    await supabase.from('appointment').update({ status: 'COMPLETED' }).eq('id', appointmentId)

    router.push('/dashboard/doctor?completed=1')
  }

  return (
    <div className="space-y-5">
      <div className="card p-6 space-y-4">
        <h3 className="font-semibold text-gray-900">Consultation Notes</h3>
        <div>
          <label className="label">Chief complaint</label>
          <input className="input" placeholder="What brings the patient in today?"
            value={chiefComplaint} onChange={e => setChiefComplaint(e.target.value)} />
        </div>
        <div>
          <label className="label">Symptoms <span className="text-gray-400 font-normal">(comma-separated)</span></label>
          <input className="input" placeholder="headache, fatigue, joint pain"
            value={symptoms} onChange={e => setSymptoms(e.target.value)} />
        </div>
        <div>
          <label className="label">Diagnosis</label>
          <textarea className="input h-20 resize-none" placeholder="Clinical assessment and diagnosis"
            value={diagnosis} onChange={e => setDiagnosis(e.target.value)} />
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea className="input h-20 resize-none" placeholder="Additional observations, lifestyle advice..."
            value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
        <div>
          <label className="label">Next visit date (optional)</label>
          <input type="date" className="input" value={nextVisit}
            min={new Date().toISOString().split('T')[0]}
            onChange={e => setNextVisit(e.target.value)} />
        </div>
      </div>

      {/* Prescription */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Prescription</h3>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="repeat" className="w-4 h-4 accent-brand-600"
              checked={isRepeat} onChange={e => setIsRepeat(e.target.checked)} />
            <label htmlFor="repeat" className="text-sm text-gray-600">Repeat prescription</label>
          </div>
        </div>

        {medicines.map((med, i) => (
          <div key={i} className="border border-gray-200 rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Medicine {i + 1}</span>
              {medicines.length > 1 && (
                <button onClick={() => removeMed(i)} className="text-red-400 hover:text-red-600 text-xs">Remove</button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="label">Medicine name</label>
                <input className="input" placeholder="e.g. Triphala Churnam"
                  value={med.name} onChange={e => updateMed(i, 'name', e.target.value)} />
              </div>
              <div>
                <label className="label">Dosage</label>
                <input className="input" placeholder="e.g. 5g"
                  value={med.dosage} onChange={e => updateMed(i, 'dosage', e.target.value)} />
              </div>
              <div>
                <label className="label">Frequency</label>
                <select className="input" value={med.frequency}
                  onChange={e => updateMed(i, 'frequency', e.target.value)}>
                  <option value="">Select</option>
                  {FREQUENCIES.map(f => <option key={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Duration</label>
                <input className="input" placeholder="e.g. 30 days"
                  value={med.duration} onChange={e => updateMed(i, 'duration', e.target.value)} />
              </div>
              <div>
                <label className="label">Notes</label>
                <input className="input" placeholder="e.g. Mix with warm water"
                  value={med.notes} onChange={e => updateMed(i, 'notes', e.target.value)} />
              </div>
            </div>
          </div>
        ))}

        <button onClick={addMed}
          className="w-full border-2 border-dashed border-gray-300 hover:border-brand-400 rounded-xl py-3 text-sm text-gray-500 hover:text-brand-600 transition-colors">
          + Add another medicine
        </button>

        <div>
          <label className="label">Patient instructions</label>
          <textarea className="input h-16 resize-none" placeholder="Diet, lifestyle, follow-up instructions..."
            value={instructions} onChange={e => setInstructions(e.target.value)} />
        </div>
      </div>

      <button onClick={save} disabled={saving || !chiefComplaint}
        className="btn-primary w-full py-3 text-base">
        {saving ? 'Saving…' : 'Complete Consultation & Save ✓'}
      </button>
      <p className="text-xs text-gray-400 text-center">
        All entries are timestamped and audit-logged per DPDP Act 2023.
      </p>
    </div>
  )
}
