'use client'
import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const LANGUAGES = [
  { code: 'EN', label: 'English' }, { code: 'TA', label: 'Tamil' },
  { code: 'HI', label: 'Hindi' },  { code: 'TE', label: 'Telugu' },
  { code: 'KN', label: 'Kannada' },{ code: 'ML', label: 'Malayalam' },
  { code: 'BN', label: 'Bengali' },{ code: 'GU', label: 'Gujarati' },
  { code: 'MR', label: 'Marathi' },{ code: 'PA', label: 'Punjabi' },
]

const STATES = [
  'Andhra Pradesh','Assam','Bihar','Chhattisgarh','Delhi','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal',
]

interface FormState {
  first_name: string; last_name: string; date_of_birth: string; gender: string
  email: string; mobile: string
  door_number: string; street: string; area: string; city: string; district: string; state: string; pincode: string
  guardian_name: string; guardian_mobile: string
  known_languages: string[]; ui_language: string; preferred_interaction_language: string
}

const EMPTY: FormState = {
  first_name: '', last_name: '', date_of_birth: '', gender: '',
  email: '', mobile: '',
  door_number: '', street: '', area: '', city: '', district: '', state: '', pincode: '',
  guardian_name: '', guardian_mobile: '',
  known_languages: ['EN'], ui_language: 'EN', preferred_interaction_language: 'EN',
}

export default function RegisterPatientPage() {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ patient_id: string; name: string } | null>(null)

  function set(field: keyof FormState, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function toggleLang(code: string) {
    setForm(f => ({
      ...f,
      known_languages: f.known_languages.includes(code)
        ? f.known_languages.filter(l => l !== code)
        : [...f.known_languages, code],
    }))
  }

  const isMinor = form.date_of_birth
    ? new Date(form.date_of_birth) > new Date(new Date().setFullYear(new Date().getFullYear() - 18))
    : false

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.known_languages.length === 0) {
      setError('Select at least one known language.'); return
    }
    setLoading(true); setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/receptionist/register-patient', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Registration failed'); setLoading(false); return }
      setSuccess({ patient_id: data.patient_id, name: `${form.first_name} ${form.last_name}` })
    } catch {
      setError('Network error — please try again.')
    }
    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b px-6 py-4 flex items-center gap-3">
          <a href="/dashboard/receptionist" className="text-gray-400 hover:text-gray-600 text-sm">← Dashboard</a>
          <span className="font-semibold text-gray-900">Register Patient</span>
        </header>
        <main className="max-w-lg mx-auto p-10 text-center space-y-4">
          <p className="text-4xl">✅</p>
          <h2 className="font-semibold text-gray-900 text-xl">{success.name} registered!</h2>
          <p className="text-sm text-gray-500">
            Temp password: <code className="bg-gray-100 px-2 py-0.5 rounded">Ayush@2026!</code>
            <br />Ask the patient to log in and reset it via &ldquo;Forgot password&rdquo;.
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <a href={`/patients/${success.patient_id}`} className="btn-primary text-sm px-5 py-2">
              View patient record →
            </a>
            <button onClick={() => { setSuccess(null); setForm(EMPTY) }}
              className="text-sm text-gray-500 hover:text-gray-700 underline">
              Register another
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-3">
        <a href="/dashboard/receptionist" className="text-gray-400 hover:text-gray-600 text-sm">← Dashboard</a>
        <span className="font-semibold text-gray-900">Register New Patient</span>
      </header>

      <main className="max-w-2xl mx-auto p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Personal details */}
          <div className="card p-5 space-y-4">
            <h2 className="font-semibold text-gray-900">Personal details</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">First name *</label>
                <input required value={form.first_name} onChange={e => set('first_name', e.target.value)}
                  className="input w-full" placeholder="Ravi" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Last name *</label>
                <input required value={form.last_name} onChange={e => set('last_name', e.target.value)}
                  className="input w-full" placeholder="Kumar" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Date of birth</label>
                <input type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)}
                  className="input w-full" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Gender</label>
                <select value={form.gender} onChange={e => set('gender', e.target.value)} className="input w-full">
                  <option value="">Select…</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                  <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
                </select>
              </div>
            </div>
            {isMinor && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Guardian name</label>
                  <input value={form.guardian_name} onChange={e => set('guardian_name', e.target.value)}
                    className="input w-full" placeholder="Parent / Guardian" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Guardian mobile</label>
                  <input value={form.guardian_mobile} onChange={e => set('guardian_mobile', e.target.value)}
                    className="input w-full" placeholder="9876543210" />
                </div>
              </div>
            )}
          </div>

          {/* Contact */}
          <div className="card p-5 space-y-4">
            <h2 className="font-semibold text-gray-900">Contact</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
                <input required type="email" value={form.email} onChange={e => set('email', e.target.value)}
                  className="input w-full" placeholder="ravi@example.com" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Mobile *</label>
                <input required type="tel" value={form.mobile} onChange={e => set('mobile', e.target.value)}
                  className="input w-full" placeholder="9876543210" />
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="card p-5 space-y-4">
            <h2 className="font-semibold text-gray-900">Address <span className="text-xs font-normal text-gray-400">(used for GDPR identity verification)</span></h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Door / Flat no.</label>
                <input value={form.door_number} onChange={e => set('door_number', e.target.value)}
                  className="input w-full" placeholder="42" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Street</label>
                <input value={form.street} onChange={e => set('street', e.target.value)}
                  className="input w-full" placeholder="Gandhi Street" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Area / Locality</label>
                <input value={form.area} onChange={e => set('area', e.target.value)}
                  className="input w-full" placeholder="T. Nagar" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">City *</label>
                <input required value={form.city} onChange={e => set('city', e.target.value)}
                  className="input w-full" placeholder="Chennai" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">District</label>
                <input value={form.district} onChange={e => set('district', e.target.value)}
                  className="input w-full" placeholder="Chennai" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">State *</label>
                <select required value={form.state} onChange={e => set('state', e.target.value)} className="input w-full">
                  <option value="">Select…</option>
                  {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Pincode</label>
                <input value={form.pincode} onChange={e => set('pincode', e.target.value)}
                  className="input w-full" placeholder="600017" maxLength={6} />
              </div>
            </div>
          </div>

          {/* Language preferences */}
          <div className="card p-5 space-y-4">
            <h2 className="font-semibold text-gray-900">Language preferences</h2>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Known languages *</label>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map(l => (
                  <button
                    key={l.code} type="button"
                    onClick={() => toggleLang(l.code)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      form.known_languages.includes(l.code)
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-brand-400'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">App display language</label>
                <select value={form.ui_language} onChange={e => set('ui_language', e.target.value)} className="input w-full">
                  {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Preferred consultation language</label>
                <select value={form.preferred_interaction_language}
                  onChange={e => set('preferred_interaction_language', e.target.value)} className="input w-full">
                  {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="btn-primary w-full py-3 text-base">
            {loading ? 'Registering…' : 'Register Patient'}
          </button>
        </form>
      </main>
    </div>
  )
}
