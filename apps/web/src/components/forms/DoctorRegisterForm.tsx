'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'

type Step = 1 | 2 | 3

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

interface FormData {
  first_name: string; last_name: string; gender: string; mobile: string
  email: string; password: string
  registration_number: string; registration_council: string
  degrees: string[]; ayush_specialization: string; years_of_experience: string
  languages_spoken: string[]
  degree_cert: File | null; reg_cert: File | null
}

const INITIAL: FormData = {
  first_name: '', last_name: '', gender: '', mobile: '',
  email: '', password: '',
  registration_number: '', registration_council: '',
  degrees: [], ayush_specialization: '', years_of_experience: '',
  languages_spoken: ['Tamil', 'English'],
  degree_cert: null, reg_cert: null,
}

export default function DoctorRegisterForm({ onBack }: { onBack: () => void }) {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [form, setForm] = useState<FormData>(INITIAL)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function set<K extends keyof FormData>(field: K, value: FormData[K]) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function toggleDegree(d: string) {
    set('degrees', form.degrees.includes(d) ? form.degrees.filter(x => x !== d) : [...form.degrees, d])
  }

  async function handleSubmit() {
    setLoading(true); setError('')
    const supabase = getSupabaseClient()

    // 1. Create auth user
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: form.email, password: form.password,
      options: { data: { role: 'doctor' } },
    })
    if (authErr) { setError(authErr.message); setLoading(false); return }

    // 2. Upload verification documents to Supabase Storage
    let degreeCertUrl = null, regCertUrl = null
    if (form.degree_cert) {
      const { data } = await supabase.storage.from('doctor-docs')
        .upload(`${authData.user?.id}/degree_cert.pdf`, form.degree_cert)
      degreeCertUrl = data?.path ?? null
    }
    if (form.reg_cert) {
      const { data } = await supabase.storage.from('doctor-docs')
        .upload(`${authData.user?.id}/reg_cert.pdf`, form.reg_cert)
      regCertUrl = data?.path ?? null
    }

    // 3. Create doctor record — verification_status defaults to PENDING
    const { data: doctor, error: docErr } = await supabase.from('doctor').insert({
      first_name: form.first_name, last_name: form.last_name,
      gender: form.gender, mobile: form.mobile, email: form.email,
      registration_number: form.registration_number,
      registration_council: form.registration_council,
      degrees: form.degrees,
      ayush_specialization: form.ayush_specialization,
      years_of_experience: parseInt(form.years_of_experience) || 0,
      languages_spoken: form.languages_spoken,
      degree_cert_url: degreeCertUrl,
      registration_cert_url: regCertUrl,
      auth_user_id: authData.user?.id,
      verification_status: 'PENDING',
    }).select().single()
    if (docErr) { setError(docErr.message); setLoading(false); return }

    await supabase.auth.updateUser({ data: { profile_id: doctor.id } })
    router.push('/dashboard/doctor?registered=1')
  }

  const stepTitles = ['Personal details', 'Professional credentials', 'Documents & login']
  const progress = (step / 3) * 100

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
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
          {/* STEP 1 — Personal */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Personal details</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">First name</label>
                  <input className="input" placeholder="Dr. First" value={form.first_name}
                    onChange={e => set('first_name', e.target.value)} />
                </div>
                <div>
                  <label className="label">Last name</label>
                  <input className="input" placeholder="Last" value={form.last_name}
                    onChange={e => set('last_name', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label">Gender</label>
                <div className="flex gap-3 mt-1">
                  {[['M','Male'],['F','Female'],['U','Prefer not to say']].map(([val, lbl]) => (
                    <button key={val} type="button" onClick={() => set('gender', val)}
                      className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        form.gender === val ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-gray-300 text-gray-700 hover:border-brand-400'
                      }`}>{lbl}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Mobile</label>
                <input className="input" placeholder="+91 98765 43210" value={form.mobile}
                  onChange={e => set('mobile', e.target.value)} />
              </div>
              <button className="btn-primary w-full" disabled={!form.first_name || !form.last_name || !form.gender || !form.mobile}
                onClick={() => setStep(2)}>Continue →</button>
            </div>
          )}

          {/* STEP 2 — Credentials */}
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
                <button className="btn-secondary flex-1" onClick={() => setStep(1)}>← Back</button>
                <button className="btn-primary flex-1"
                  disabled={!form.ayush_specialization || !form.registration_number || !form.registration_council || form.degrees.length === 0}
                  onClick={() => setStep(3)}>Continue →</button>
              </div>
            </div>
          )}

          {/* STEP 3 — Documents + Login */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Documents & login</h2>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                📋 Your account will be <strong>reviewed by Ayushpathi Admin</strong> before activation. Upload clear scans.
              </div>
              <div>
                <label className="label">Degree certificate (PDF or image)</label>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="input py-2"
                  onChange={e => set('degree_cert', e.target.files?.[0] ?? null)} />
              </div>
              <div>
                <label className="label">Medical registration certificate (PDF or image)</label>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="input py-2"
                  onChange={e => set('reg_cert', e.target.files?.[0] ?? null)} />
              </div>
              <hr className="border-gray-200" />
              <div>
                <label className="label">Email address (your login)</label>
                <input type="email" className="input" placeholder="doctor@example.com"
                  value={form.email} onChange={e => set('email', e.target.value)} />
              </div>
              <div>
                <label className="label">Password</label>
                <input type="password" className="input" placeholder="Min 8 characters"
                  value={form.password} onChange={e => set('password', e.target.value)} />
              </div>
              {error && <p className="error-text">{error}</p>}
              <div className="flex gap-3">
                <button className="btn-secondary flex-1" onClick={() => setStep(2)}>← Back</button>
                <button className="btn-primary flex-1"
                  disabled={!form.email || form.password.length < 8 || !form.degree_cert || !form.reg_cert || loading}
                  onClick={handleSubmit}>
                  {loading ? 'Submitting…' : 'Submit for review ✓'}
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
