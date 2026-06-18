'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'

interface Med  { name: string; dosage: string; frequency: string; since: string }
interface Surg { procedure: string; year: string; hospital: string }
interface Fam  { relation: string; condition: string }

function Skeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      {[1, 2, 3].map(i => (
        <div key={i} className="card p-5 space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/3" />
          <div className="h-10 bg-gray-100 rounded" />
        </div>
      ))}
    </div>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-4 sm:p-5 space-y-4">
      <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{title}</h3>
      {children}
    </div>
  )
}

export default function HealthProfilePage() {
  const router = useRouter()
  const [patientId, setPatientId]   = useState<string | null>(null)
  const [conditions, setConditions] = useState('')
  const [allergies,  setAllergies]  = useState('')
  const [meds,   setMeds]   = useState<Med[]>([])
  const [surgs,  setSurgs]  = useState<Surg[]>([])
  const [family, setFamily] = useState<Fam[]>([])
  const [pageLoading, setPageLoading] = useState(true)
  const [saving, setSaving]  = useState(false)
  const [saved,  setSaved]   = useState(false)
  const [error,  setError]   = useState('')

  useEffect(() => {
    async function load() {
      const supabase = getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const { data: patient } = await supabase.from('patient').select('id').eq('auth_user_id', user.id).single()
      if (!patient) { router.push('/dashboard/patient'); return }
      setPatientId(patient.id)
      const { data: hp } = await supabase.from('patient_health_profile').select('*').eq('patient_id', patient.id).maybeSingle()
      if (hp) {
        setConditions((hp.known_conditions ?? []).join(', '))
        setAllergies((hp.allergies ?? []).join(', '))
        if (hp.current_medications?.length) setMeds(hp.current_medications)
        if (hp.past_surgeries?.length) setSurgs(hp.past_surgeries)
        if (hp.family_history?.length) setFamily(hp.family_history)
      }
      setPageLoading(false)
    }
    load()
  }, [router])

  function addMed()  { setMeds(m => [...m, { name: '', dosage: '', frequency: '', since: '' }]) }
  function addSurg() { setSurgs(s => [...s, { procedure: '', year: '', hospital: '' }]) }
  function addFam()  { setFamily(f => [...f, { relation: '', condition: '' }]) }
  function removeMed(i: number)  { setMeds(m => m.filter((_, idx) => idx !== i)) }
  function removeSurg(i: number) { setSurgs(s => s.filter((_, idx) => idx !== i)) }
  function removeFam(i: number)  { setFamily(f => f.filter((_, idx) => idx !== i)) }
  function updateMed(i: number, k: keyof Med, v: string)   { setMeds(m => m.map((x, idx) => idx === i ? { ...x, [k]: v } : x)) }
  function updateSurg(i: number, k: keyof Surg, v: string) { setSurgs(s => s.map((x, idx) => idx === i ? { ...x, [k]: v } : x)) }
  function updateFam(i: number, k: keyof Fam, v: string)   { setFamily(f => f.map((x, idx) => idx === i ? { ...x, [k]: v } : x)) }

  async function save() {
    if (!patientId) return
    setSaving(true); setError(''); setSaved(false)
    const supabase = getSupabaseClient()
    const payload = {
      patient_id: patientId,
      known_conditions: conditions.split(',').map(s => s.trim()).filter(Boolean),
      allergies: allergies.split(',').map(s => s.trim()).filter(Boolean),
      current_medications: meds.filter(m => m.name.trim()),
      past_surgeries: surgs.filter(s => s.procedure.trim()),
      family_history: family.filter(f => f.relation.trim() && f.condition.trim()),
    }
    const { error: upsertErr } = await supabase
      .from('patient_health_profile')
      .upsert(payload, { onConflict: 'patient_id' })

    setSaving(false)
    if (upsertErr) { setError('Failed to save. Please try again.'); return }
    setSaved(true)
    setTimeout(() => router.push('/dashboard/patient'), 1500)
  }

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b px-4 sm:px-6 py-4 flex items-center gap-3">
          <span className="text-gray-400 text-sm">← Dashboard</span>
          <span className="font-semibold text-gray-900">Update Health Profile</span>
        </header>
        <main className="max-w-2xl mx-auto p-4 sm:p-6"><Skeleton /></main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-4 sm:px-6 py-4 flex items-center gap-3">
        <a href="/dashboard/patient" className="text-gray-400 hover:text-gray-600 text-sm">← Dashboard</a>
        <span className="font-semibold text-gray-900">Update Health Profile</span>
      </header>
      <main className="max-w-2xl mx-auto p-4 sm:p-6 space-y-4">
        <p className="text-sm text-gray-500">
          This information helps doctors give you better care. Only doctors you&apos;ve consented to can see this.
        </p>

        {/* Known Conditions */}
        <SectionCard title="Known health conditions">
          <p className="text-xs text-gray-400">Separate with commas</p>
          <input
            className="input"
            placeholder="e.g. Type 2 diabetes, hypertension, asthma"
            value={conditions}
            onChange={e => setConditions(e.target.value)}
          />
        </SectionCard>

        {/* Allergies */}
        <SectionCard title="Allergies">
          <p className="text-xs text-gray-400">Food, medicine, environmental — separate with commas</p>
          <input
            className="input"
            placeholder="e.g. Penicillin, peanuts, dust"
            value={allergies}
            onChange={e => setAllergies(e.target.value)}
          />
        </SectionCard>

        {/* Current Medications */}
        <SectionCard title="Current medications">
          {meds.map((m, i) => (
            <div key={i} className="border border-gray-100 rounded-lg p-3 space-y-3 relative">
              <button
                onClick={() => removeMed(i)}
                className="absolute top-2 right-2 text-gray-300 hover:text-red-500 text-xs"
                aria-label="Remove"
              >✕</button>
              <div>
                <label className="label">Medicine name</label>
                <input className="input" placeholder="Triphala" value={m.name} onChange={e => updateMed(i, 'name', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Dosage</label>
                  <input className="input" placeholder="5g" value={m.dosage} onChange={e => updateMed(i, 'dosage', e.target.value)} />
                </div>
                <div>
                  <label className="label">Frequency</label>
                  <input className="input" placeholder="Twice daily" value={m.frequency} onChange={e => updateMed(i, 'frequency', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label">Taking since</label>
                <input className="input" placeholder="Jan 2023" value={m.since} onChange={e => updateMed(i, 'since', e.target.value)} />
              </div>
            </div>
          ))}
          <button
            onClick={addMed}
            className="w-full border-2 border-dashed border-gray-200 hover:border-brand-400 rounded-lg py-2.5 text-sm text-gray-400 hover:text-brand-600 transition-colors"
          >
            + Add medication
          </button>
        </SectionCard>

        {/* Past Surgeries */}
        <SectionCard title="Past surgeries / procedures">
          {surgs.map((s, i) => (
            <div key={i} className="border border-gray-100 rounded-lg p-3 space-y-3 relative">
              <button onClick={() => removeSurg(i)} className="absolute top-2 right-2 text-gray-300 hover:text-red-500 text-xs">✕</button>
              <div>
                <label className="label">Procedure</label>
                <input className="input" placeholder="Appendectomy" value={s.procedure} onChange={e => updateSurg(i, 'procedure', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Year</label>
                  <input className="input" placeholder="2018" value={s.year} onChange={e => updateSurg(i, 'year', e.target.value)} />
                </div>
                <div>
                  <label className="label">Hospital</label>
                  <input className="input" placeholder="Hospital name" value={s.hospital} onChange={e => updateSurg(i, 'hospital', e.target.value)} />
                </div>
              </div>
            </div>
          ))}
          <button
            onClick={addSurg}
            className="w-full border-2 border-dashed border-gray-200 hover:border-brand-400 rounded-lg py-2.5 text-sm text-gray-400 hover:text-brand-600 transition-colors"
          >
            + Add surgery / procedure
          </button>
        </SectionCard>

        {/* Family History */}
        <SectionCard title="Family health history">
          {family.map((f, i) => (
            <div key={i} className="border border-gray-100 rounded-lg p-3 relative">
              <button onClick={() => removeFam(i)} className="absolute top-2 right-2 text-gray-300 hover:text-red-500 text-xs">✕</button>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Relation</label>
                  <input className="input" placeholder="Father" value={f.relation} onChange={e => updateFam(i, 'relation', e.target.value)} />
                </div>
                <div>
                  <label className="label">Condition</label>
                  <input className="input" placeholder="Diabetes" value={f.condition} onChange={e => updateFam(i, 'condition', e.target.value)} />
                </div>
              </div>
            </div>
          ))}
          <button
            onClick={addFam}
            className="w-full border-2 border-dashed border-gray-200 hover:border-brand-400 rounded-lg py-2.5 text-sm text-gray-400 hover:text-brand-600 transition-colors"
          >
            + Add family history
          </button>
        </SectionCard>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
            <span className="text-red-500 text-sm">⚠</span>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <button
          onClick={save}
          disabled={saving || !patientId || saved}
          className="btn-primary w-full py-3 relative"
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Saving…
            </span>
          ) : saved ? '✓ Saved! Redirecting…' : 'Save Health Profile'}
        </button>

        <p className="text-xs text-gray-400 text-center pb-4">
          Your health data is encrypted and stored in India · DPDP Act 2023
        </p>
      </main>
    </div>
  )
}
