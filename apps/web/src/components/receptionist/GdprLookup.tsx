'use client'

import { useState } from 'react'

interface Profile {
  id: string
  first_name: string
  last_name: string
  mobile: string
  email: string | null
  address: string | null
}

interface Step1Result {
  found: boolean
  type?: 'patient' | 'doctor'
  record_id?: string
  masked_address?: string
  error?: string
}

interface Step2Result {
  confirmed: boolean
  type?: string
  profile?: Profile
  warning?: string
}

export default function GdprLookup() {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({ first_name: '', last_name: '', mobile: '', date_of_birth: '' })
  const [step1, setStep1] = useState<Step1Result | null>(null)
  const [addressInput, setAddressInput] = useState('')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileType, setProfileType] = useState<string>('')
  const [warning, setWarning] = useState<string | null>(null)

  async function handleStep1(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/receptionist/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
        credentials: 'include',
      })
      const data: Step1Result = await res.json()
      if (res.status === 409) { setError(data.error ?? 'Multiple records matched'); setLoading(false); return }
      if (!res.ok) { setError(data.error ?? 'Server error'); setLoading(false); return }
      if (!data.found) { setError('No record found matching those details.'); setLoading(false); return }
      setStep1(data)
      setStep(2)
    } catch {
      setError('Network error — please try again.')
    }
    setLoading(false)
  }

  async function handleStep2(e: React.FormEvent) {
    e.preventDefault()
    if (!step1) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/receptionist/identify/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ record_id: step1.record_id, type: step1.type, address_input: addressInput }),
        credentials: 'include',
      })
      const data: Step2Result = await res.json()
      if (!data.confirmed) { setError('Address did not match. Identity could not be confirmed.'); setLoading(false); return }
      setProfile(data.profile ?? null)
      setProfileType(data.type ?? '')
      setWarning(data.warning ?? null)
      setStep(3)
    } catch {
      setError('Network error — please try again.')
    }
    setLoading(false)
  }

  function reset() {
    setStep(1); setStep1(null); setProfile(null); setAddressInput('')
    setForm({ first_name: '', last_name: '', mobile: '', date_of_birth: '' })
    setError(null); setWarning(null)
  }

  return (
    <div className="card">
      <div className="px-6 py-4 border-b flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">🔍 Patient / Doctor Lookup (GDPR)</h2>
        {step > 1 && (
          <button onClick={reset} className="text-xs text-gray-400 hover:text-gray-600 underline">
            Start over
          </button>
        )}
      </div>

      <div className="p-6">
        <div className="flex items-center gap-2 mb-5 text-xs text-gray-400">
          <span className={step === 1 ? 'font-semibold text-brand-600' : 'text-green-600'}>
            {step > 1 ? '✓' : '1'} Details
          </span>
          <span>→</span>
          <span className={step === 2 ? 'font-semibold text-brand-600' : step > 2 ? 'text-green-600' : ''}>
            {step > 2 ? '✓' : '2'} Verify address
          </span>
          <span>→</span>
          <span className={step === 3 ? 'font-semibold text-brand-600' : ''}>3 Record</span>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleStep1} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">First name</label>
                <input required value={form.first_name}
                  onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                  className="input w-full" placeholder="Ravi" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Last name</label>
                <input required value={form.last_name}
                  onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                  className="input w-full" placeholder="Kumar" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Mobile (WhatsApp)</label>
                <input required value={form.mobile} type="tel"
                  onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))}
                  className="input w-full" placeholder="9876543210" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Date of birth</label>
                <input required value={form.date_of_birth} type="date"
                  onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))}
                  className="input w-full" />
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full mt-1">
              {loading ? 'Searching…' : 'Find record'}
            </button>
          </form>
        )}

        {step === 2 && step1 && (
          <div className="space-y-4">
            <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-1">
                Ask the caller to confirm their address
              </p>
              <p className="text-sm text-amber-900 font-mono font-medium">{step1.masked_address}</p>
              <p className="text-xs text-amber-700 mt-1">
                Ask: &ldquo;Could you tell me your door number and street name?&rdquo;
              </p>
            </div>
            <form onSubmit={handleStep2} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Address the caller provided
                </label>
                <input required value={addressInput}
                  onChange={e => setAddressInput(e.target.value)}
                  className="input w-full" placeholder="e.g. 42 Gandhi Street" />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Verifying…' : 'Confirm identity'}
              </button>
            </form>
          </div>
        )}

        {step === 3 && profile && (
          <div className="space-y-3">
            {warning && (
              <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
                ⚠ {warning}
              </div>
            )}
            <div className="px-4 py-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-green-600 font-semibold text-sm">✅ Identity confirmed</span>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full capitalize">{profileType}</span>
              </div>
              <div className="space-y-1.5 text-sm">
                <p className="font-semibold text-gray-900">{profile.first_name} {profile.last_name}</p>
                <p className="text-gray-600">📱 {profile.mobile}</p>
                {profile.email && <p className="text-gray-600">✉ {profile.email}</p>}
                {profile.address && <p className="text-gray-500 text-xs">📍 {profile.address}</p>}
              </div>
            </div>
            {profileType === 'patient' && (
              <a href={`/patients/${profile.id}`}
                className="block text-center text-sm text-brand-600 font-medium hover:underline">
                View patient record →
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
