'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'

interface Med  { name: string; dosage: string; frequency: string; since: string }
interface Surg { procedure: string; year: string; hospital: string }
interface Fam  { relation: string; condition: string }

export default function HealthProfilePage() {
  const router = useRouter()
  const [patientId, setPatientId]   = useState<string | null>(null)
  const [conditions, setConditions] = useState('')
  const [allergies,  setAllergies]  = useState('')
  const [meds,   setMeds]   = useState<Med[]>([{ name: '', dosage: '', frequency: '', since: '' }])
  const [surgs,  setSurgs]  = useState<Surg[]>([])
  const [family, setFamily] = useState<Fam[]>([])
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: patient } = await supabase.from('patient').select('id').eq('auth_user_id', user.id).single()
      if (!patient) return
      setPatientId(patient.id)
      const { data: hp } = await supabase.from('patient_health_profile').select('*').eq('patient_id', patient.id).single()
      if (hp) {
        setConditions((hp.known_conditions ?? []).join(', '))
        setAllergies((hp.allergies ?? []).join(', '))
        if (hp.current_medications?.length) setMeds(hp.current_medications)
        if (hp.past_surgeries?.length) setSurgs(hp.past_surgeries)
        if (hp.family_history?.length) setFamily(hp.family_history)
      }
    }
    load()
  }, [])

  function addMed()  { setMeds(m => [...m, { name: '', dosage: '', frequency: '', since: '' }]) }
  function addSurg() { setSurgs(s => [...s, { procedure: '', year: '', hospital: '' }]) }
  function addFam()  { setFamily(f => [...f, { relation: '', condition: '' }]) }
  function updateMed(i: number, k: keyof Med, v: string)  { setMeds(m => m.map((x, idx) => idx === i ? { ...x, [k]: v } : x)) }
  function updateSurg(i: number, k: keyof Surg, v: string){ setSurgs(s => s.map((x, idx) => idx === i ? { ...x, [k]: v } : x)) }
  function updateFam(i: number, k: keyof Fam, v: string)  { setFamily(f => f.map((x, idx) => idx === i ? { ...x, [k]: v } : x)) }

  async function save() {
    if (!patientId) return
    setSaving(true)
    const supabase = getSupabaseClient()
    const payload = {
      patient_id: patientId,
      known_conditions: conditions.split(',').map(s => s.trim()).filter(Boolean),
      allergies: allergies.split(',').map(s => s.trim()).filter(Boolean),
      current_medications: meds.filter(m => m.name.trim()),
      past_surgeries: surgs.filter(s => s.procedure.trim()),
      family_history: family.filter(f => f.relation.trim() && f.condition.trim()),
    }
    await supabase.from('patient_health_profile').upsert(payload, { onConflict: 'patient_id' })
    setSaving(false); setSaved(true)
    setTimeout(() => { setSaved(false); router.push('/dashboard/patient') }, 1500)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-3">
        <a href="/dashboard/patient" className="text-gray-400 hover:text-gray-600 text-sm">← Dashboard</a>
        <span className="font-semibold text-gray-900">Update Health Profile</span>
      </header>
      <main className="max-w-2xl mx-auto p-6 space-y-5">
        <p className="text-sm text-gray-500">This information helps doctors give you better care. Only doctors you've consented to can see this.</p>

        {/* Known Conditions */}
        <div className="card p-5 space-y-3">
          <h3 className="font-semibold text-gray-900">Known health conditions</h3>
          <p className="text-xs text-gray-400">Separate with commas</p>
          <input className="input" placeholder="e.g. Type 2 diabetes, hypertension, asthma"
            value={conditions} onChange={e => setConditions(e.target.value)} />
        </div>

        {/* Allergies */}
        <div className="card p-5 space-y-3">
          <h3 className="font-semibold text-gray-900">Allergies</h3>
          <p className="text-xs text-gray-400">Food, medicine, environmental — separate with commas</p>
          <input className="input" placeholder="e.g. Penicillin, peanuts, dust"
            value={allergies} onChange={e => setAllergies(e.target.value)} />
        </div>

        {/* Current Medications */}
        <div className="card p-5 space-y-4">
          <h3 className="font-semibold text-gray-900">Current medications</h3>
          {meds.map((m, i) => (
            <div key={i} className="grid grid-cols-2 gap-3 border border-gray-100 rounded-lg p-3">
              <div className="col-span-2"><label className="label">Medicine name</label>
                <input className="input" placeholder="Triphala" value={m.name} onChange={e => updateMed(i, 'name', e.target.value)} /></div>
              <div><label className="label">Dosage</label>
                <input className="input" placeholder="5g" value={m.dosage} onChange={e => updateMed(i, 'dosage', e.target.value)} /></div>
              <div><label className="label">Frequency</label>
                <input className="input" placeholder="Twice daily" value={m.frequency} onChange={e => updateMed(i, 'frequency', e.target.value)} /></div>
              <div className="col-span-2"><label className="label">Taking since</label>
                <input className="input" placeholder="Jan 2023" value={m.since} onChange={e => updateMed(i, 'since', e.target.value)} /></div>
            </div>
          ))}
          <button onClick={addMed} className="w-full border-2 border-dashed border-gray-200 hover:border-brand-400 rounded-lg py-2.5 text-sm text-gray-400 hover:text-brand-600 transition-colors">
            + Add medication
          </button>
        </div>

        {/* Past Surgeries */}
        <div className="card p-5 space-y-4">
          <h3 className="font-semibold text-gray-900">Past surgeries / procedures</h3>
          {surgs.map((s, i) => (
            <div key={i} className="grid grid-cols-2 gap-3 border border-gray-100 rounded-lg p-3">
              <div className="col-span-2"><label className="label">Procedure</label>
                <input className="input" placeholder="Appendectomy" value={s.procedure} onChange={e => updateSurg(i, 'procedure', e.target.value)} /></div>
              <div><label className="label">Year</label>
                <input className="input" placeholder="2018" value={s.year} onChange={e => updateSurg(i, 'year', e.target.value)} /></div>
              <div><label className="label">Hospital</label>
                <input className="input" placeholder="Hospital name" value={s.hospital} onChange={e => updateSurg(i, 'hospital', e.target.value)} /></div>
            </div>
          ))}
          <button onClick={addSurg} className="w-full border-2 border-dashed border-gray-200 hover:border-brand-400 rounded-lg py-2.5 text-sm text-gray-400 hover:text-brand-600 transition-colors">
            + Add surgery / procedure
          </button>
        </div>

        {/* Family History */}
        <div className="card p-5 space-y-4">
          <h3 className="font-semibold text-gray-900">Family health history</h3>
          {family.map((f, i) => (
            <div key={i} className="grid grid-cols-2 gap-3 border border-gray-100 rounded-lg p-3">
              <div><label className="label">Relation</label>
                <input className="input" placeholder="Father" value={f.relation} onChange={e => updateFam(i, 'relation', e.target.value)} /></div>
              <div><label className="label">Condition</label>
                <input className="input" placeholder="Diabetes" value={f.condition} onChange={e => updateFam(i, 'condition', e.target.value)} /></div>
            </div>
          ))}
          <button onClick={addFam} className="w-full border-2 border-dashed border-gray-200 hover:border-brand-400 rounded-lg py-2.5 text-sm text-gray-400 hover:text-brand-600 transition-colors">
            + Add family history
          </button>
        </div>

        <button onClick={save} disabled={saving || !patientId} className="btn-primary w-full py-3">
          {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save Health Profile'}
        </button>
      </main>
    </div>
  )
}
