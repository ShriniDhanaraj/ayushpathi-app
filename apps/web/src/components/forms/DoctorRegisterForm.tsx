'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'
import { LANGUAGES, PRIMARY_LANGUAGE_CODES } from '@ayushpathi/shared/constants/languages'
import { getTranslations } from '@ayushpathi/shared/i18n/translations'

// ─── Constants ────────────────────────────────────────────────────────────────
const SPECIALIZATIONS = [
  { code: 'AYU', label: 'Ayurveda' },
  { code: 'YOG', label: 'Yoga & Naturopathy' },
  { code: 'UNA', label: 'Unani' },
  { code: 'SID', label: 'Siddha' },
  { code: 'HOM', label: 'Homeopathy' },
]

const DEGREES = ['BAMS','BSMS','BUMS','BHMS','BNYS','MD (Ayurveda)','MS (Ayurveda)','MD (Siddha)','MD (Unani)','MD (Homeopathy)','PhD']

const COUNCILS = [
  'Central Council of Indian Medicine (CCIM)',
  'Central Council of Homeopathy (CCH)',
  'Tamil Nadu Board of Indian Medicine',
  'Kerala State Board of Indian Medicine',
  'Karnataka Ayurvedic & Unani Practitioners Board',
  'Maharashtra Council of Indian Medicine',
  'Other State Medical Council',
]

const FRIENDLY_ERRORS: Record<string, string> = {
  'User already registered': 'An account with this email already exists. Please sign in.',
  'Password should be at least 6 characters': 'Password must be at least 8 characters.',
}

// Primary languages shown first in multi-select
const SORTED_LANGUAGES = [
  ...LANGUAGES.filter(l => PRIMARY_LANGUAGE_CODES.includes(l.code)),
  ...LANGUAGES.filter(l => !PRIMARY_LANGUAGE_CODES.includes(l.code)),
]

// ─── Types ────────────────────────────────────────────────────────────────────
type Step = 1 | 2 | 3

interface FormData {
  first_name: string; last_name: string; gender: string; mobile: string
  email: string; password: string
  registration_number: string; registration_council: string
  degrees: string[]; ayush_specialization: string; years_of_experience: string
  languages_spoken: string[]   // consultation languages — ≥1 required
  ui_language: string          // app display language
  degree_cert: File | null; reg_cert: File | null
}

const INITIAL: FormData = {
  first_name: '', last_name: '', gender: '', mobile: '',
  email: '', password: '',
  registration_number: '', registration_council: '',
  degrees: [], ayush_specialization: '', years_of_experience: '',
  languages_spoken: ['EN'],
  ui_language: 'EN',
  degree_cert: null, reg_cert: null,
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
    </svg>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function DoctorRegisterForm({ onBack }: { onBack: () => void }) {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [form, setForm] = useState<FormData>(INITIAL)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState('')
  const [uiLang, setUiLang] = useState('EN')

  const T = getTranslations(uiLang)

  function set<K extends keyof FormData>(field: K, value: FormData[K]) {
    setForm(f => ({ ...f, [field]: value }))
    setError('')
  }

  function toggleDegree(d: string) {
    set('degrees', form.degrees.includes(d) ? form.degrees.filter(x => x !== d) : [...form.degrees, d])
  }

  function toggleConsultLang(code: string) {
    const next = form.languages_spoken.includes(code)
      ? form.languages_spoken.filter(c => c !== code)
      : [...form.languages_spoken, code]
    set('languages_spoken', next)
  }

  function handleUILangChange(code: string) {
    setUiLang(code)
    set('ui_language', code)
    // Auto-add to consultation languages if not already there
    if (!form.languages_spoken.includes(code)) {
      set('languages_spoken', [...form.languages_spoken, code])
    }
  }

  async function handleSubmit() {
    setLoading(true); setError('')
    const supabase = getSupabaseClient()

    setLoadingStep('Creating account…')
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: form.email, password: form.password,
      options: { data: { role: 'doctor' } },
    })
    if (authErr) {
      setError(FRIENDLY_ERRORS[authErr.message] ?? authErr.message)
      setLoading(false); return
    }
    if (!authData.user) {
      setError('Account creation failed. Please try again.')
      setLoading(false); return
    }

    // Upload documents
    let degreeCertUrl: string | null = null
    let regCertUrl: string | null = null

    if (form.degree_cert) {
      setLoadingStep('Uploading degree certificate…')
      const { data, error: uploadErr } = await supabase.storage
        .from('doctor-docs')
        .upload(`${authData.user.id}/degree_cert.pdf`, form.degree_cert, { upsert: true })
      if (uploadErr) {
        setError('Failed to upload degree certificate: ' + uploadErr.message)
        setLoading(false); return
      }
      degreeCertUrl = data?.path ?? null
    }

    if (form.reg_cert) {
      setLoadingStep('Uploading registration certificate…')
      const { data, error: uploadErr } = await supabase.storage
        .from('doctor-docs')
        .upload(`${authData.user.id}/reg_cert.pdf`, form.reg_cert, { upsert: true })
      if (uploadErr) {
        setError('Failed to upload registration certificate: ' + uploadErr.message)
        setLoading(false); return
      }
      regCertUrl = data?.path ?? null
    }

    setLoadingStep('Saving your profile…')
    const res = await fetch('/api/register/doctor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_user_id: authData.user.id,
        first_name: form.first_name,
        last_name: form.last_name,
        gender: form.gender,
        mobile: form.mobile,
        email: form.email,
        registration_number: form.registration_number,
        registration_council: form.registration_council,
        degrees: form.degrees,
        ayush_specialization: form.ayush_specialization,
        years_of_experience: form.years_of_experience,
        languages_spoken: form.languages_spoken,
        ui_language: form.ui_language,
        degree_cert_url: degreeCertUrl,
        registration_cert_url: regCertUrl,
      }),
    })

    const result = await res.json()
    if (!res.ok) {
      setError(result.error ?? 'Failed to save profile. Please try again.')
      setLoading(false); return
    }

    await supabase.auth.updateUser({
      data: { profile_id: result.doctor_id, ui_language: form.ui_language },
    })

    router.push('/dashboard/doctor?registered=1')
  }

  const stepTitles = ['Personal details', 'Professional credentials', 'Languages & login']
  const progress = (step / 3) * 100

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* UI language bar */}
        <div className="flex items-center justify-end gap-2 mb-4">
          <span className="text-xs text-gray-400">{T.changeLanguage}</span>
          <select
            value={uiLang}
            onChange={e => handleUILangChange(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700 focus:outline-none focus:border-brand-400"
          >
            {LANGUAGES.map(l => (
              <option key={l.code} value={l.code}>
                {l.nativeLabel} ({l.label})
              </option>
            ))}
          </select>
        </div>

        {/* Progress header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onBack} className="text-gray-400 hover:text-gray-600 text-sm flex-shrink-0">
            {T.backBtn}
          </button>
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

        <div className="card p-6 sm:p-8">

          {/* ── STEP 1 — Personal ──────────────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Personal details</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">{T.firstName}</label>
                  <input className="input" placeholder="Ravi" value={form.first_name}
                    onChange={e => set('first_name', e.target.value)} />
                </div>
                <div>
                  <label className="label">{T.lastName}</label>
                  <input className="input" placeholder="Kumar" value={form.last_name}
                    onChange={e => set('last_name', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label">{T.gender}</label>
                <div className="flex gap-2 mt-1">
                  {[['M', T.genderMale], ['F', T.genderFemale], ['U', T.genderOther]].map(([val, lbl]) => (
                    <button key={val} type="button" onClick={() => set('gender', val)}
                      className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        form.gender === val ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-gray-300 text-gray-700 hover:border-brand-400'
                      }`}>{lbl}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">{T.mobileNumber}</label>
                <input className="input" placeholder="+91 98765 43210" value={form.mobile}
                  onChange={e => set('mobile', e.target.value)} />
              </div>
              <button
                className="btn-primary w-full"
                disabled={!form.first_name || !form.last_name || !form.gender || !form.mobile}
                onClick={() => setStep(2)}>
                {T.continueBtn}
              </button>
            </div>
          )}

          {/* ── STEP 2 — Credentials ───────────────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Professional credentials</h2>
              <div>
                <label className="label">AYUSH Specialization</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {SPECIALIZATIONS.map(s => (
                    <button key={s.code} type="button" onClick={() => set('ayush_specialization', s.code)}
                      className={`py-2 px-3 rounded-lg border text-sm font-medium transition-colors text-left ${
                        form.ayush_specialization === s.code ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-gray-300 text-gray-700 hover:border-brand-400'
                      }`}>{s.label}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Qualifications (select all that apply)</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {DEGREES.map(d => (
                    <button key={d} type="button" onClick={() => toggleDegree(d)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        form.degrees.includes(d) ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-gray-300 text-gray-600 hover:border-brand-400'
                      }`}>{d}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Registration number</label>
                <input className="input" placeholder="e.g. TNBIM-12345" value={form.registration_number}
                  onChange={e => set('registration_number', e.target.value)} />
              </div>
              <div>
                <label className="label">Registering council</label>
                <select className="input" value={form.registration_council}
                  onChange={e => set('registration_council', e.target.value)}>
                  <option value="">Select council</option>
                  {COUNCILS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Years of experience</label>
                <input type="number" className="input" placeholder="5" min="0" max="60"
                  value={form.years_of_experience} onChange={e => set('years_of_experience', e.target.value)} />
              </div>
              <div className="flex gap-3">
                <button className="btn-secondary flex-1" onClick={() => setStep(1)}>{T.backBtn}</button>
                <button className="btn-primary flex-1"
                  disabled={!form.ayush_specialization || !form.registration_number || !form.registration_council || form.degrees.length === 0}
                  onClick={() => setStep(3)}>{T.continueBtn}</button>
              </div>
            </div>
          )}

          {/* ── STEP 3 — Languages + Login ─────────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-5">
              <h2 className="text-xl font-semibold">Languages &amp; login</h2>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                📋 Your account will be <strong>reviewed by Ayushpathi Admin</strong> before activation.
              </div>

              {/* Consultation languages — multi-select chips */}
              <div>
                <label className="label">
                  Languages you can consult in
                  <span className="text-red-500 ml-0.5">*</span>
                </label>
                <p className="text-xs text-gray-400 mb-2">
                  Patients will filter by these when searching for a doctor
                </p>
                <div className="flex flex-wrap gap-2">
                  {SORTED_LANGUAGES.map(l => {
                    const selected = form.languages_spoken.includes(l.code)
                    return (
                      <button
                        key={l.code}
                        type="button"
                        onClick={() => toggleConsultLang(l.code)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          selected
                            ? 'bg-brand-600 border-brand-600 text-white'
                            : 'bg-white border-gray-300 text-gray-600 hover:border-brand-400'
                        }`}
                      >
                        {l.nativeLabel}
                        <span className="opacity-60 ml-1 text-[10px]">({l.code})</span>
                      </button>
                    )
                  })}
                </div>
                {form.languages_spoken.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">Please select at least one language</p>
                )}
              </div>

              {/* App UI language */}
              <div>
                <label className="label">{T.uiLanguage}</label>
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

              <hr className="border-gray-200" />

              {/* Login credentials */}
              <div>
                <label className="label">{T.email} (your login)</label>
                <input type="email" className="input" placeholder="doctor@example.com"
                  value={form.email} onChange={e => set('email', e.target.value)} autoComplete="email" />
              </div>
              <div>
                <label className="label">{T.password}</label>
                <input type="password" className="input" placeholder="Min 8 characters"
                  value={form.password} onChange={e => set('password', e.target.value)} autoComplete="new-password" />
              </div>

              {/* Documents */}
              <div>
                <label className="label">Degree certificate (PDF or image)</label>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="input py-2"
                  onChange={e => set('degree_cert', e.target.files?.[0] ?? null)} />
                <p className="text-xs text-gray-400 mt-1">Max 5MB</p>
              </div>
              <div>
                <label className="label">Medical registration certificate (PDF or image)</label>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="input py-2"
                  onChange={e => set('reg_cert', e.target.files?.[0] ?? null)} />
                <p className="text-xs text-gray-400 mt-1">Max 5MB</p>
              </div>

              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                  <span className="text-red-500 text-sm mt-0.5">⚠</span>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button className="btn-secondary flex-1" onClick={() => setStep(2)} disabled={loading}>
                  {T.backBtn}
                </button>
                <button
                  className="btn-primary flex-1"
                  disabled={
                    !form.email || form.password.length < 8 ||
                    !form.degree_cert || !form.reg_cert ||
                    form.languages_spoken.length === 0 || loading
                  }
                  onClick={handleSubmit}>
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Spinner />
                      {loadingStep || 'Submitting…'}
                    </span>
                  ) : 'Submit for review ✓'}
                </button>
              </div>

              <p className="text-xs text-gray-400 text-center">
                Documents stored securely in India — DPDP Act 2023 compliant.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
