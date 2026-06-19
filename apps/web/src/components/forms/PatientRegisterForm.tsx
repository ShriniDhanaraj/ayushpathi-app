'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'
import { LANGUAGES, PRIMARY_LANGUAGE_CODES } from '@ayushpathi/shared/constants/languages'
import { getTranslations, tStep, type Translations } from '@ayushpathi/shared/i18n/translations'

// ─── Types ────────────────────────────────────────────────────────────────────
type Step = 1 | 2 | 3 | 4

interface FormData {
  first_name: string; last_name: string; date_of_birth: string; gender: string
  email: string; password: string; mobile: string; whatsapp_enabled: boolean
  communication_consent: string[]
  door_number: string; street: string; area: string
  city: string; district: string; state: string; pincode: string
  guardian_name: string; guardian_mobile: string
  // Language preferences (Step 4)
  known_languages: string[]
  ui_language: string
  preferred_interaction_language: string
}

const INITIAL: FormData = {
  first_name: '', last_name: '', date_of_birth: '', gender: '',
  email: '', password: '', mobile: '', whatsapp_enabled: false,
  communication_consent: ['WHATSAPP'],
  door_number: '', street: '', area: '',
  city: '', district: '', state: '', pincode: '',
  guardian_name: '', guardian_mobile: '',
  known_languages: [],
  ui_language: 'EN',
  preferred_interaction_language: 'EN',
}

const INDIA_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal','Delhi','Jammu & Kashmir','Ladakh','Puducherry',
]

const FRIENDLY_ERRORS: Record<string, string> = {
  'User already registered': 'An account with this email already exists. Please sign in.',
  'Password should be at least 6 characters': 'Password must be at least 8 characters.',
}

// Sort languages: primary codes first, then the rest alphabetically
const SORTED_LANGUAGES = [
  ...LANGUAGES.filter(l => PRIMARY_LANGUAGE_CODES.includes(l.code)),
  ...LANGUAGES.filter(l => !PRIMARY_LANGUAGE_CODES.includes(l.code)),
]

function isMinor(dob: string) {
  if (!dob) return false
  return new Date(dob) > new Date(new Date().setFullYear(new Date().getFullYear() - 18))
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
    </svg>
  )
}

// ─── UI Language Selector ─────────────────────────────────────────────────────
function UILanguageBar({
  lang, onChange, label,
}: { lang: string; onChange: (code: string) => void; label: string }) {
  return (
    <div className="flex items-center justify-end gap-2 mb-4">
      <span className="text-xs text-gray-400">{label}</span>
      <select
        value={lang}
        onChange={e => onChange(e.target.value)}
        className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700 focus:outline-none focus:border-brand-400"
      >
        {LANGUAGES.map(l => (
          <option key={l.code} value={l.code}>
            {l.nativeLabel} ({l.label})
          </option>
        ))}
      </select>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function PatientRegisterForm({ onBack }: { onBack: () => void }) {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [form, setForm] = useState<FormData>(INITIAL)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState('')
  // ui_language drives all labels on this form
  const [uiLang, setUiLang] = useState('EN')

  const T: Translations = getTranslations(uiLang)

  function set(field: keyof FormData, value: unknown) {
    setForm(f => ({ ...f, [field]: value }))
    setError('')
  }

  // Sync uiLang picker with form field so both stay in step
  function handleUILangChange(code: string) {
    setUiLang(code)
    set('ui_language', code)
    // If preferred_interaction_language hasn't been touched, default it to same
    if (form.preferred_interaction_language === 'EN' || form.preferred_interaction_language === form.ui_language) {
      set('preferred_interaction_language', code)
    }
    // Add to known_languages automatically if not already there
    if (!form.known_languages.includes(code)) {
      set('known_languages', [...form.known_languages, code])
    }
  }

  function toggleConsent(channel: string) {
    set('communication_consent',
      form.communication_consent.includes(channel)
        ? form.communication_consent.filter(c => c !== channel)
        : [...form.communication_consent, channel]
    )
  }

  function toggleKnownLang(code: string) {
    const next = form.known_languages.includes(code)
      ? form.known_languages.filter(c => c !== code)
      : [...form.known_languages, code]
    set('known_languages', next)
  }

  // ── Step validation ──────────────────────────────────────────────────────────
  function canAdvanceStep(): boolean {
    if (step === 1) return !!(form.first_name && form.last_name && form.date_of_birth && form.gender)
    if (step === 2) return !!(form.email && form.password.length >= 8 && form.mobile)
    if (step === 3) return !!(form.city && form.state)
    if (step === 4) {
      return (
        form.known_languages.length > 0 &&
        !!form.ui_language &&
        !!form.preferred_interaction_language
      )
    }
    return false
  }

  // ── Submit ───────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!canAdvanceStep()) {
      setError(T.selectAtLeastOne)
      return
    }
    setLoading(true); setError('')
    const supabase = getSupabaseClient()

    setLoadingStep('Creating account…')
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { role: 'patient' } },
    })
    if (authErr) {
      setError(FRIENDLY_ERRORS[authErr.message] ?? authErr.message)
      setLoading(false); return
    }
    if (!authData.user) {
      setError('Account creation failed. Please try again.')
      setLoading(false); return
    }

    setLoadingStep('Saving your profile…')
    const res = await fetch('/api/register/patient', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_user_id: authData.user.id,
        first_name: form.first_name,
        last_name: form.last_name,
        date_of_birth: form.date_of_birth,
        gender: form.gender,
        email: form.email,
        mobile: form.mobile,
        whatsapp_enabled: form.whatsapp_enabled,
        communication_consent: form.communication_consent,
        door_number: form.door_number,
        street: form.street,
        area: form.area,
        city: form.city,
        district: form.district,
        state: form.state,
        pincode: form.pincode,
        guardian_name: form.guardian_name,
        guardian_mobile: form.guardian_mobile,
        known_languages: form.known_languages,
        ui_language: form.ui_language,
        preferred_interaction_language: form.preferred_interaction_language,
      }),
    })

    const result = await res.json()
    if (!res.ok) {
      setError(result.error ?? 'Failed to save profile. Please try again.')
      setLoading(false); return
    }

    // Store ui_language in user metadata so login page can read it without fetching profile
    await supabase.auth.updateUser({
      data: { profile_id: result.patient_id, ui_language: form.ui_language },
    })

    router.push('/dashboard/patient?welcome=1')
  }

  const TOTAL_STEPS = 4
  const progress = (step / TOTAL_STEPS) * 100
  const STEP_LABELS: Record<Step, string> = {
    1: T.stepIdentity,
    2: T.stepContact,
    3: T.stepAddress,
    4: T.stepLanguages,
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* UI language bar — always visible at top */}
        <UILanguageBar
          lang={uiLang}
          onChange={handleUILangChange}
          label={T.changeLanguage}
        />

        {/* Progress header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onBack} className="text-gray-400 hover:text-gray-600 text-sm">{T.backBtn}</button>
          <div className="flex-1">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{tStep(step, TOTAL_STEPS, uiLang)} — {STEP_LABELS[step]}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 bg-gray-200 rounded-full">
              <div
                className="h-1.5 bg-brand-600 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="card p-8">

          {/* ── STEP 1 — Identity ─────────────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">{T.stepIdentity}</h2>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">{T.firstName}</label>
                  <input className="input" placeholder="Ramesh" value={form.first_name}
                    onChange={e => set('first_name', e.target.value)} />
                </div>
                <div>
                  <label className="label">{T.lastName}</label>
                  <input className="input" placeholder="Kumar" value={form.last_name}
                    onChange={e => set('last_name', e.target.value)} />
                </div>
              </div>

              <div>
                <label className="label">{T.dateOfBirth}</label>
                <input type="date" className="input" value={form.date_of_birth}
                  onChange={e => set('date_of_birth', e.target.value)} />
              </div>

              <div>
                <label className="label">{T.gender}</label>
                <div className="flex gap-3 mt-1">
                  {[['M', T.genderMale], ['F', T.genderFemale], ['U', T.genderOther]].map(([val, lbl]) => (
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
                disabled={!canAdvanceStep()}
                onClick={() => setStep(2)}>
                {T.continueBtn}
              </button>
            </div>
          )}

          {/* ── STEP 2 — Contact ──────────────────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">{T.stepContact}</h2>

              <div>
                <label className="label">{T.email}</label>
                <input type="email" className="input" placeholder="you@example.com"
                  value={form.email} onChange={e => set('email', e.target.value)} autoComplete="email" />
              </div>
              <div>
                <label className="label">{T.password}</label>
                <input type="password" className="input" placeholder="Min 8 characters"
                  value={form.password} onChange={e => set('password', e.target.value)} autoComplete="new-password" />
              </div>
              <div>
                <label className="label">{T.mobileNumber}</label>
                <input className="input" placeholder="+91 98765 43210"
                  value={form.mobile} onChange={e => set('mobile', e.target.value)} />
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="wa" className="w-4 h-4 accent-brand-600"
                  checked={form.whatsapp_enabled}
                  onChange={e => set('whatsapp_enabled', e.target.checked)} />
                <label htmlFor="wa" className="text-sm text-gray-700">{T.whatsappEnabled}</label>
              </div>
              <div>
                <label className="label">{T.notifyVia}</label>
                <div className="flex gap-2 mt-1">
                  {['WHATSAPP', 'EMAIL', 'SMS'].map(ch => (
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
                <button className="btn-secondary flex-1" onClick={() => setStep(1)}>{T.backBtn}</button>
                <button
                  className="btn-primary flex-1"
                  disabled={!canAdvanceStep()}
                  onClick={() => setStep(3)}>
                  {T.continueBtn}
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3 — Address ──────────────────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">{T.stepAddress}</h2>
              <p className="text-sm text-gray-500">{T.addressNote}</p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">{T.doorNumber}</label>
                  <input className="input" placeholder="12B" value={form.door_number}
                    onChange={e => set('door_number', e.target.value)} />
                </div>
                <div>
                  <label className="label">{T.street}</label>
                  <input className="input" placeholder="Anna Salai" value={form.street}
                    onChange={e => set('street', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label">{T.area}</label>
                <input className="input" placeholder="T. Nagar" value={form.area}
                  onChange={e => set('area', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">{T.city}</label>
                  <input className="input" placeholder="Chennai" value={form.city}
                    onChange={e => set('city', e.target.value)} />
                </div>
                <div>
                  <label className="label">{T.district}</label>
                  <input className="input" placeholder="Chennai" value={form.district}
                    onChange={e => set('district', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">{T.state}</label>
                  <select className="input" value={form.state} onChange={e => set('state', e.target.value)}>
                    <option value="">Select state</option>
                    {INDIA_STATES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">{T.pincode}</label>
                  <input className="input" placeholder="600017" maxLength={6}
                    value={form.pincode} onChange={e => set('pincode', e.target.value)} />
                </div>
              </div>

              <div className="flex gap-3 mt-2">
                <button className="btn-secondary flex-1" onClick={() => setStep(2)}>{T.backBtn}</button>
                <button
                  className="btn-primary flex-1"
                  disabled={!canAdvanceStep()}
                  onClick={() => setStep(4)}>
                  {T.continueBtn}
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 4 — Language Preferences ─────────────────────────────────── */}
          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{T.languageStepTitle}</h2>
                <p className="text-sm text-gray-500 mt-1">{T.languageStepSubtitle}</p>
              </div>

              {/* App UI Language */}
              <div>
                <label className="label">
                  {T.uiLanguage}
                  <span className="text-red-500 ml-0.5">*</span>
                </label>
                <p className="text-xs text-gray-400 mb-2">{T.uiLanguageHint}</p>
                <select
                  className="input"
                  value={form.ui_language}
                  onChange={e => handleUILangChange(e.target.value)}
                >
                  {LANGUAGES.map(l => (
                    <option key={l.code} value={l.code}>
                      {l.nativeLabel} — {l.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Known Languages — multi-select chips */}
              <div>
                <label className="label">
                  {T.knownLanguages}
                  <span className="text-red-500 ml-0.5">*</span>
                </label>
                <p className="text-xs text-gray-400 mb-2">{T.knownLanguagesHint}</p>
                <div className="flex flex-wrap gap-2">
                  {SORTED_LANGUAGES.map(l => {
                    const selected = form.known_languages.includes(l.code)
                    return (
                      <button
                        key={l.code}
                        type="button"
                        onClick={() => toggleKnownLang(l.code)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          selected
                            ? 'bg-brand-600 border-brand-600 text-white'
                            : 'bg-white border-gray-300 text-gray-600 hover:border-brand-400'
                        }`}
                      >
                        {l.nativeLabel}
                        {l.code !== 'EN' && <span className="opacity-60 ml-1 text-[10px]">({l.code})</span>}
                      </button>
                    )
                  })}
                </div>
                {form.known_languages.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">{T.selectAtLeastOne}</p>
                )}
              </div>

              {/* Preferred Interaction Language */}
              <div>
                <label className="label">
                  {T.preferredInteractionLanguage}
                  <span className="text-red-500 ml-0.5">*</span>
                </label>
                <p className="text-xs text-gray-400 mb-2">{T.preferredInteractionLanguageHint}</p>
                <select
                  className="input"
                  value={form.preferred_interaction_language}
                  onChange={e => set('preferred_interaction_language', e.target.value)}
                >
                  <option value="">— {T.selectUILanguage} —</option>
                  {LANGUAGES.map(l => (
                    <option key={l.code} value={l.code}>
                      {l.nativeLabel} — {l.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Language match tip */}
              {form.preferred_interaction_language && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-800">
                  💡 Doctors who speak{' '}
                  <strong>
                    {LANGUAGES.find(l => l.code === form.preferred_interaction_language)?.nativeLabel}
                  </strong>{' '}
                  will appear first when you search nearby doctors.
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                  <span className="text-red-500 text-sm mt-0.5">⚠</span>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="flex gap-3 mt-2">
                <button className="btn-secondary flex-1" onClick={() => setStep(3)} disabled={loading}>
                  {T.backBtn}
                </button>
                <button
                  className="btn-primary flex-1"
                  disabled={!canAdvanceStep() || loading}
                  onClick={handleSubmit}>
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Spinner />
                      {loadingStep || 'Creating account…'}
                    </span>
                  ) : T.createAccountBtn}
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
