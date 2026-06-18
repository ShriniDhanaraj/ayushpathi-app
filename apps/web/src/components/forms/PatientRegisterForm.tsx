'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'

type Step = 1 | 2 | 3

interface FormData {
  // Step 1 — Identity
  first_name: string; last_name: string; date_of_birth: string; gender: string
  // Step 2 — Contact
  email: string; password: string; mobile: string; whatsapp_enabled: boolean
  communication_consent: string[]
  // Step 3 — Address
  door_number: string; street: string; area: string
  city: string; district: string; state: string; pincode: string
  // DPDP: minor consent
  guardian_name: string; guardian_mobile: string
}

const INITIAL: FormData = {
  first_name: '', last_name: '', date_of_birth: '', gender: '',
  email: '', password: '', mobile: '', whatsapp_enabled: false,
  communication_consent: ['WHATSAPP'],
  door_number: '', street: '', area: '',
  city: '', district: '', state: '', pincode: '',
  guardian_name: '', guardian_mobile: '',
}

const INDIA_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal','Delhi','Jammu & Kashmir','Ladakh','Puducherry',
]

function isMinor(dob: string) {
  if (!dob) return false
  return new Date(dob) > new Date(new Date().setFullYear(new Date().getFullYear() - 18))
}

export default function PatientRegisterForm({ onBack }: { onBack: () => void }) {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [form, setForm] = useState<FormData>(INITIAL)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function set(field: keyof FormData, value: unknown) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function toggleConsent(channel: string) {
    set('communication_consent',
      form.communication_consent.includes(channel)
        ? form.communication_consent.filter(c => c !== channel)
        : [...form.communication_consent, channel]
    )
  }

  async function handleSubmit() {
    setLoading(true); setError('')
    const supabase = getSupabaseClient()

    // 1. Create auth user
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { role: 'patient' } },
    })
    if (authErr) { setError(authErr.message); setLoading(false); return }

    // 2. Create address record
    const { data: addr, error: addrErr } = await supabase.from('address').insert({
      door_number: form.door_number, street: form.street, area: form.area,
      city: form.city, district: form.district, state: form.state,
      pincode: form.pincode, country: 'India',
    }).select().single()
    if (addrErr) { setError(addrErr.message); setLoading(false); return }

    // 3. Create patient record
    const minor = isMinor(form.date_of_birth)
    const { data: patient, error: patErr } = await supabase.from('patient').insert({
      first_name: form.first_name, last_name: form.last_name,
      date_of_birth: form.date_of_birth, gender: form.gender,
      email: form.email, mobile: form.mobile,
      whatsapp_enabled: form.whatsapp_enabled,
      communication_consent: form.communication_consent,
      address_id: addr.id,
      auth_user_id: authData.user?.id,
      ...(minor ? {
        guardian_name: form.guardian_name,
        guardian_mobile: form.guardian_mobile,
        guardian_consent_at: new Date().toISOString(),
      } : {}),
    }).select().single()
    if (patErr) { setError(patErr.message); setLoading(false); return }

    // 4. Update user metadata with profile_id
    await supabase.auth.updateUser({ data: { profile_id: patient.id } })

    router.push('/dashboard/patient?welcome=1')
  }

  const stepTitles = ['Your identity', 'Contact & login', 'Your address']
  const progress = (step / 3) * 100

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onBack} className="text-gray-400 hover:text-gray-600 text-sm">← Back</button>
          <div className="flex-1">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Step {step} of 3 — {stepTitles[step - 1]}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 bg-gray-200 rounded-full">
              <div className="h-1.5 bg-brand-600 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        <div className="card p-8">
          {/* STEP 1 — Identity */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Tell us about yourself</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">First name</label>
                  <input className="input" placeholder="Ramesh" value={form.first_name}
                    onChange={e => set('first_name', e.target.value)} />
                </div>
                <div>
                  <label className="label">Last name</label>
                  <input className="input" placeholder="Kumar" value={form.last_name}
                    onChange={e => set('last_name', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label">Date of birth</label>
                <input type="date" className="input" value={form.date_of_birth}
                  onChange={e => set('date_of_birth', e.target.value)} />
              </div>
              <div>
                <label className="label">Gender</label>
                <div className="flex gap-3 mt-1">
                  {[['M','Male'],['F','Female'],['U','Prefer not to say']].map(([val, lbl]) => (
                    <button key={val} type="button"
                      onClick={() => set('gender', val)}
                      className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        form.gender === val
                          ? 'bg-brand-600 border-brand-600 text-white'
                          : 'bg-white border-gray-300 text-gray-700 hover:border-brand-400'
                      }`}>
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Guardian fields for minors */}
              {isMinor(form.date_of_birth) && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
                  <p className="text-sm text-amber-800 font-medium">
                    👨‍👧 Guardian consent required (DPDP Act — patient is under 18)
                  </p>
                  <div>
                    <label className="label">Guardian full name</label>
                    <input className="input" placeholder="Parent / Guardian name"
                      value={form.guardian_name} onChange={e => set('guardian_name', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Guardian mobile</label>
                    <input className="input" placeholder="+91 98765 43210"
                      value={form.guardian_mobile} onChange={e => set('guardian_mobile', e.target.value)} />
                  </div>
                </div>
              )}

              <button
                className="btn-primary w-full mt-2"
                disabled={!form.first_name || !form.last_name || !form.date_of_birth || !form.gender}
                onClick={() => setStep(2)}>
                Continue →
              </button>
            </div>
          )}

          {/* STEP 2 — Contact */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Contact & login details</h2>
              <div>
                <label className="label">Email address</label>
                <input type="email" className="input" placeholder="you@example.com"
                  value={form.email} onChange={e => set('email', e.target.value)} />
              </div>
              <div>
                <label className="label">Password</label>
                <input type="password" className="input" placeholder="Min 8 characters"
                  value={form.password} onChange={e => set('password', e.target.value)} />
              </div>
              <div>
                <label className="label">Mobile number</label>
                <input className="input" placeholder="+91 98765 43210"
                  value={form.mobile} onChange={e => set('mobile', e.target.value)} />
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="wa" className="w-4 h-4 accent-brand-600"
                  checked={form.whatsapp_enabled}
                  onChange={e => set('whatsapp_enabled', e.target.checked)} />
                <label htmlFor="wa" className="text-sm text-gray-700">
                  This number has WhatsApp
                </label>
              </div>

              <div>
                <label className="label">How should we notify you?</label>
                <div className="flex gap-2 mt-1">
                  {['WHATSAPP','EMAIL','SMS'].map(ch => (
                    <button key={ch} type="button"
                      onClick={() => toggleConsent(ch)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        form.communication_consent.includes(ch)
                          ? 'bg-brand-600 border-brand-600 text-white'
                          : 'bg-white border-gray-300 text-gray-600 hover:border-brand-400'
                      }`}>
                      {ch}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 mt-2">
                <button className="btn-secondary flex-1" onClick={() => setStep(1)}>← Back</button>
                <button
                  className="btn-primary flex-1"
                  disabled={!form.email || form.password.length < 8 || !form.mobile}
                  onClick={() => setStep(3)}>
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 — Address */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Your address</h2>
              <p className="text-sm text-gray-500">Used to find doctors near you. Stored securely in India.</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Door / Flat no.</label>
                  <input className="input" placeholder="12B" value={form.door_number}
                    onChange={e => set('door_number', e.target.value)} />
                </div>
                <div>
                  <label className="label">Street</label>
                  <input className="input" placeholder="Anna Salai" value={form.street}
                    onChange={e => set('street', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label">Area / Locality</label>
                <input className="input" placeholder="T. Nagar" value={form.area}
                  onChange={e => set('area', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">City</label>
                  <input className="input" placeholder="Chennai" value={form.city}
                    onChange={e => set('city', e.target.value)} />
                </div>
                <div>
                  <label className="label">District</label>
                  <input className="input" placeholder="Chennai" value={form.district}
                    onChange={e => set('district', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">State</label>
                  <select className="input" value={form.state} onChange={e => set('state', e.target.value)}>
                    <option value="">Select state</option>
                    {INDIA_STATES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">PIN code</label>
                  <input className="input" placeholder="600017" maxLength={6}
                    value={form.pincode} onChange={e => set('pincode', e.target.value)} />
                </div>
              </div>

              {error && <p className="error-text">{error}</p>}

              <div className="flex gap-3 mt-2">
                <button className="btn-secondary flex-1" onClick={() => setStep(2)}>← Back</button>
                <button
                  className="btn-primary flex-1"
                  disabled={!form.city || !form.state || loading}
                  onClick={handleSubmit}>
                  {loading ? 'Creating account…' : 'Create account ✓'}
                </button>
              </div>

              <p className="text-xs text-gray-400 text-center">
                Your data is stored in India and protected under DPDP Act 2023.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
