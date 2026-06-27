'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'

// ─── Types ───────────────────────────────────────────────────────────────────
type WizardStep = 'gdpr-details' | 'gdpr-verify' | 'doctors' | 'slots' | 'confirm'

interface PatientProfile {
  id: string
  first_name: string
  last_name: string
  mobile: string
  email: string | null
}

interface Doctor {
  id: string
  first_name: string
  last_name: string
  ayush_specialization: string
  teleconsult_enabled: boolean
  teleconsult_fee: number
  languages_spoken: string[]
}

interface Slot { date: string; start_time: string; end_time: string }

const SPEC_LABELS: Record<string, string> = {
  AYU: 'Ayurveda', YOG: 'Yoga & Naturopathy',
  UNA: 'Unani', SID: 'Siddha', HOM: 'Homeopathy',
}

// ─── Slot generator (same as patient booking) ────────────────────────────────
function generateSlots(
  availability: { start_time: string; end_time: string; slot_duration: number }[],
  date: string
): Slot[] {
  const slots: Slot[] = []
  availability.forEach(avail => {
    const [sh, sm] = avail.start_time.split(':').map(Number)
    const [eh, em] = avail.end_time.split(':').map(Number)
    let cur = sh * 60 + sm
    const end = eh * 60 + em
    while (cur + avail.slot_duration <= end) {
      const hh = String(Math.floor(cur / 60)).padStart(2, '0')
      const mm = String(cur % 60).padStart(2, '0')
      const nh = String(Math.floor((cur + avail.slot_duration) / 60)).padStart(2, '0')
      const nm = String((cur + avail.slot_duration) % 60).padStart(2, '0')
      slots.push({ date, start_time: `${hh}:${mm}`, end_time: `${nh}:${nm}` })
      cur += avail.slot_duration
    }
  })
  return slots
}

// ─── Step indicator ──────────────────────────────────────────────────────────
const STEPS: { key: WizardStep; label: string }[] = [
  { key: 'gdpr-details', label: 'Find Patient' },
  { key: 'gdpr-verify',  label: 'Verify ID' },
  { key: 'doctors',      label: 'Choose Doctor' },
  { key: 'slots',        label: 'Pick Slot' },
  { key: 'confirm',      label: 'Confirm' },
]
const STEP_ORDER = STEPS.map(s => s.key)

function StepBar({ current }: { current: WizardStep }) {
  const ci = STEP_ORDER.indexOf(current)
  return (
    <div className="bg-white border-b px-6 py-3">
      <div className="max-w-3xl mx-auto flex gap-4 items-center">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <div className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
              i < ci  ? 'bg-brand-600 text-white' :
              i === ci ? 'bg-brand-600 text-white ring-4 ring-brand-100' :
              'bg-gray-200 text-gray-400'
            }`}>{i < ci ? '✓' : i + 1}</div>
            <span className={`text-xs font-medium ${i === ci ? 'text-brand-700' : 'text-gray-400'}`}>{s.label}</span>
            {i < STEPS.length - 1 && <span className="text-gray-300 ml-1">›</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ReceptionistBookPage() {
  const router = useRouter()

  // Auth
  const [token, setToken]       = useState<string | null>(null)
  const [hospitalId, setHospitalId] = useState<string | null>(null)
  const [receptionistId, setReceptionistId] = useState<string | null>(null)
  const [authError, setAuthError] = useState(false)

  // Wizard state
  const [step, setStep]     = useState<WizardStep>('gdpr-details')
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  // Step 1 — GDPR details
  const [gdprForm, setGdprForm] = useState({
    first_name: '', last_name: '', mobile: '', date_of_birth: '',
  })
  const [step1Result, setStep1Result] = useState<{
    record_id: string; masked_address: string
  } | null>(null)

  // Step 2 — GDPR verify
  const [addressInput, setAddressInput] = useState('')
  const [patient, setPatient] = useState<PatientProfile | null>(null)

  // Step 3 — doctor selection
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)

  // Step 4 — slot selection
  const [selectedDate, setSelectedDate]   = useState('')
  const [slots, setSlots]                 = useState<Slot[]>([])
  const [bookedSlots, setBookedSlots]     = useState<string[]>([])
  const [selectedSlot, setSelectedSlot]   = useState<Slot | null>(null)
  const [apptType, setApptType]           = useState<'F2F' | 'TELECONSULT'>('F2F')

  // Step 5 — confirm extras
  const [isWalkIn, setIsWalkIn] = useState(false)
  const [notes, setNotes]       = useState('')
  const [submitting, setSubmitting] = useState(false)

  // ── Bootstrap: get session + receptionist info ──────────────────────────────
  useEffect(() => {
    const supabase = getSupabaseClient()
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setAuthError(true); return }
      setToken(session.access_token)

      const res = await fetch('/api/receptionist/hospital-doctors', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.status === 403 || res.status === 401) { setAuthError(true); return }
      const json = await res.json()
      setHospitalId(json.hospital_id)
      setDoctors(json.doctors ?? [])

      // Get receptionist id for booked_by_id
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: rec } = await supabase
          .from('receptionist').select('id').eq('auth_user_id', user.id).single()
        if (rec) setReceptionistId(rec.id)
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load slots when doctor + date change ─────────────────────────────────────
  useEffect(() => {
    if (!selectedDoctor || !selectedDate) return
    const supabase = getSupabaseClient()
    const dayCode = new Date(selectedDate)
      .toLocaleDateString('en-US', { weekday: 'short' })
      .toUpperCase().slice(0, 3)
    Promise.all([
      supabase.from('doctor_availability')
        .select('start_time, end_time, slot_duration')
        .eq('doctor_id', selectedDoctor.id)
        .eq('day_of_week', dayCode)
        .eq('active', true),
      supabase.from('appointment')
        .select('start_time')
        .eq('doctor_id', selectedDoctor.id)
        .eq('appointment_date', selectedDate)
        .neq('status', 'CANCELLED'),
    ]).then(([avRes, bkRes]) => {
      setSlots(generateSlots(avRes.data ?? [], selectedDate))
      setBookedSlots((bkRes.data ?? []).map(b => b.start_time))
      setSelectedSlot(null)
    })
  }, [selectedDoctor, selectedDate]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Step 1: GDPR details submit ──────────────────────────────────────────────
  async function handleGdprDetails(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/receptionist/identify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(gdprForm),
      })
      const data = await res.json()
      if (res.status === 409) { setError(data.error ?? 'Multiple records matched'); setLoading(false); return }
      if (!res.ok)            { setError(data.error ?? 'Server error'); setLoading(false); return }
      if (!data.found)        { setError('No patient found with these details.'); setLoading(false); return }
      if (data.type !== 'patient') { setError('Record found but is not a patient. Only patients can be booked.'); setLoading(false); return }
      setStep1Result({ record_id: data.record_id, masked_address: data.masked_address })
      setStep('gdpr-verify')
    } catch { setError('Network error — please try again.') }
    setLoading(false)
  }

  // ── Step 2: GDPR confirm ─────────────────────────────────────────────────────
  async function handleGdprVerify(e: React.FormEvent) {
    e.preventDefault()
    if (!token || !step1Result) return
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/receptionist/identify/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          record_id: step1Result.record_id,
          type: 'patient',
          address_input: addressInput,
        }),
      })
      const data = await res.json()
      if (!data.confirmed) { setError('Address did not match. Cannot confirm identity.'); setLoading(false); return }
      setPatient(data.profile)
      setStep('doctors')
    } catch { setError('Network error — please try again.') }
    setLoading(false)
  }

  // ── Final booking ─────────────────────────────────────────────────────────────
  async function handleBook() {
    if (!patient || !selectedDoctor || !selectedSlot || !token) return
    setSubmitting(true); setError(null)
    const res = await fetch('/api/receptionist/appointments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        patient_id:       patient.id,
        doctor_id:        selectedDoctor.id,
        hospital_id:      hospitalId,
        appointment_date: selectedSlot.date,
        start_time:       selectedSlot.start_time,
        end_time:         selectedSlot.end_time,
        type:             apptType,
        is_walk_in:       isWalkIn,
        notes:            notes || null,
        booked_by_id:     receptionistId,
      }),
    })
    const json = await res.json()
    setSubmitting(false)
    if (!res.ok) { setError(json.error ?? 'Failed to book appointment'); return }
    router.push('/dashboard/receptionist?booked=1')
  }

  // ── Date bounds ───────────────────────────────────────────────────────────────
  const minDate = new Date(); minDate.setDate(minDate.getDate())
  const minDateStr = minDate.toISOString().split('T')[0]
  const maxDate = new Date(); maxDate.setDate(maxDate.getDate() + 60)
  const maxDateStr = maxDate.toISOString().split('T')[0]

  if (authError) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-500 text-sm">Access denied. Receptionist account required.</p>
        <a href="/auth/login" className="text-brand-600 text-sm underline mt-2 block">Login</a>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-3">
        <a href="/dashboard/receptionist" className="text-gray-400 hover:text-gray-600 text-sm">← Reception</a>
        <span className="font-semibold text-gray-900">Book Appointment for Patient</span>
      </header>

      <StepBar current={step} />

      <main className="max-w-3xl mx-auto p-6 space-y-4">

        {error && (
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
        )}

        {/* ── Step 1: GDPR details ───────────────────────────────────────── */}
        {step === 'gdpr-details' && (
          <div className="card p-6 space-y-4">
            <div>
              <h2 className="font-semibold text-gray-900">Find Patient</h2>
              <p className="text-xs text-gray-400 mt-0.5">Enter the caller&apos;s details to locate their record.</p>
            </div>
            <form onSubmit={handleGdprDetails} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">First name</label>
                  <input required value={gdprForm.first_name}
                    onChange={e => setGdprForm(f => ({ ...f, first_name: e.target.value }))}
                    className="input w-full" placeholder="Ravi" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Last name</label>
                  <input required value={gdprForm.last_name}
                    onChange={e => setGdprForm(f => ({ ...f, last_name: e.target.value }))}
                    className="input w-full" placeholder="Kumar" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Mobile (WhatsApp)</label>
                  <input required type="tel" value={gdprForm.mobile}
                    onChange={e => setGdprForm(f => ({ ...f, mobile: e.target.value }))}
                    className="input w-full" placeholder="9876543210" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Date of birth</label>
                  <input required type="date" value={gdprForm.date_of_birth}
                    onChange={e => setGdprForm(f => ({ ...f, date_of_birth: e.target.value }))}
                    className="input w-full" />
                </div>
              </div>
              <button type="submit" disabled={loading || !token} className="btn-primary w-full">
                {loading ? 'Searching…' : 'Find Patient →'}
              </button>
            </form>
          </div>
        )}

        {/* ── Step 2: GDPR address verify ────────────────────────────────── */}
        {step === 'gdpr-verify' && step1Result && (
          <div className="card p-6 space-y-4">
            <div>
              <h2 className="font-semibold text-gray-900">Verify Identity</h2>
              <p className="text-xs text-gray-400 mt-0.5">Ask the caller to confirm their address before proceeding.</p>
            </div>
            <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-1">
                Ask caller: &ldquo;Can you confirm your door number and street?&rdquo;
              </p>
              <p className="text-sm text-amber-900 font-mono font-medium">{step1Result.masked_address}</p>
            </div>
            <form onSubmit={handleGdprVerify} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Address the caller provided</label>
                <input required value={addressInput}
                  onChange={e => setAddressInput(e.target.value)}
                  className="input w-full" placeholder="e.g. 42 Gandhi Street" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setStep('gdpr-details')} className="btn-secondary flex-1">← Back</button>
                <button type="submit" disabled={loading} className="btn-primary flex-1">
                  {loading ? 'Verifying…' : 'Confirm Identity →'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Step 3: Doctor selection ────────────────────────────────────── */}
        {step === 'doctors' && patient && (
          <div className="space-y-4">
            <div className="card p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Booking for</p>
                <p className="font-semibold text-gray-900">{patient.first_name} {patient.last_name}</p>
                <p className="text-xs text-gray-500">{patient.mobile}</p>
              </div>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">✓ Verified</span>
            </div>

            <div className="card p-6 space-y-3">
              <h2 className="font-semibold text-gray-900">Select Doctor</h2>
              {doctors.length === 0 ? (
                <p className="text-sm text-gray-400">No approved doctors found at your hospital.</p>
              ) : doctors.map(doc => (
                <div key={doc.id} onClick={() => setSelectedDoctor(doc)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedDoctor?.id === doc.id
                      ? 'border-brand-500 ring-2 ring-brand-200 bg-brand-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">Dr. {doc.first_name} {doc.last_name}</p>
                      <p className="text-xs text-brand-700 font-medium mt-0.5">
                        {SPEC_LABELS[doc.ayush_specialization] ?? doc.ayush_specialization}
                      </p>
                      {doc.languages_spoken?.length > 0 && (
                        <p className="text-xs text-gray-400 mt-0.5">{doc.languages_spoken.join(', ')}</p>
                      )}
                    </div>
                    {doc.teleconsult_enabled && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Teleconsult</span>
                    )}
                  </div>
                </div>
              ))}
              {selectedDoctor && (
                <button onClick={() => setStep('slots')} className="btn-primary w-full">
                  Continue with Dr. {selectedDoctor.last_name} →
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Step 4: Slot selection ─────────────────────────────────────── */}
        {step === 'slots' && patient && selectedDoctor && (
          <div className="space-y-4">
            {/* Patient + Doctor summary */}
            <div className="card p-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Patient</p>
                <p className="font-semibold text-gray-900">{patient.first_name} {patient.last_name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Doctor</p>
                <p className="font-semibold text-gray-900">Dr. {selectedDoctor.first_name} {selectedDoctor.last_name}</p>
                <p className="text-xs text-brand-700">{SPEC_LABELS[selectedDoctor.ayush_specialization]}</p>
              </div>
            </div>

            <div className="card p-6 space-y-4">
              <h2 className="font-semibold text-gray-900">Pick Date &amp; Slot</h2>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Appointment date</label>
                <input type="date" className="input" min={minDateStr} max={maxDateStr}
                  value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
              </div>

              {selectedDate && slots.length === 0 && (
                <p className="text-sm text-gray-400">No availability on this day. Try another date.</p>
              )}

              {slots.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-700 mb-2">Available slots</p>
                  <div className="flex flex-wrap gap-2">
                    {slots.map(slot => {
                      const isBooked = bookedSlots.includes(slot.start_time)
                      return (
                        <button key={slot.start_time} disabled={isBooked}
                          onClick={() => setSelectedSlot(slot)}
                          className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                            isBooked
                              ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                              : selectedSlot?.start_time === slot.start_time
                                ? 'bg-brand-600 border-brand-600 text-white'
                                : 'bg-white border-gray-300 text-gray-700 hover:border-brand-400'
                          }`}>
                          {slot.start_time}
                          {isBooked && <span className="ml-1 text-xs">(taken)</span>}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {selectedDoctor.teleconsult_enabled && selectedSlot && (
                <div>
                  <p className="text-xs font-medium text-gray-700 mb-2">Appointment type</p>
                  <div className="flex gap-3">
                    {(['F2F', 'TELECONSULT'] as const).map(t => (
                      <button key={t} onClick={() => setApptType(t)}
                        className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                          apptType === t
                            ? 'bg-brand-600 border-brand-600 text-white'
                            : 'bg-white border-gray-300 text-gray-700 hover:border-brand-400'
                        }`}>
                        {t === 'F2F' ? '🏥 In-person' : '💻 Teleconsult'}
                        {t === 'TELECONSULT' && selectedDoctor.teleconsult_fee > 0 && (
                          <span className="ml-1 text-xs opacity-80">₹{selectedDoctor.teleconsult_fee}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => { setStep('doctors'); setSelectedSlot(null) }} className="btn-secondary flex-1">← Back</button>
                {selectedSlot && (
                  <button onClick={() => setStep('confirm')} className="btn-primary flex-1">Review Booking →</button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 5: Confirm ───────────────────────────────────────────── */}
        {step === 'confirm' && patient && selectedDoctor && selectedSlot && (
          <div className="card p-6 space-y-5">
            <h2 className="font-semibold text-gray-900">Confirm Appointment</h2>

            <div className="bg-brand-50 rounded-xl p-4 space-y-2 text-sm">
              {([
                ['Patient', `${patient.first_name} ${patient.last_name}`],
                ['Mobile',  patient.mobile],
                ['Doctor',  `Dr. ${selectedDoctor.first_name} ${selectedDoctor.last_name}`],
                ['Specialization', SPEC_LABELS[selectedDoctor.ayush_specialization] ?? selectedDoctor.ayush_specialization],
                ['Date', new Date(selectedSlot.date + 'T00:00:00').toLocaleDateString('en-IN', {
                  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                })],
                ['Time', `${selectedSlot.start_time} – ${selectedSlot.end_time}`],
                ['Type', apptType === 'F2F' ? 'In-person (F2F)' : 'Teleconsultation'],
              ] as [string, string][]).map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-medium text-gray-900">{value}</span>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isWalkIn} onChange={e => setIsWalkIn(e.target.checked)}
                  className="w-4 h-4 accent-brand-600" />
                <span className="text-sm text-gray-700">Walk-in patient (arrived without prior booking)</span>
              </label>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes for doctor (optional)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  rows={2} placeholder="e.g. Follow-up from last visit, patient reports knee pain…"
                  className="input w-full resize-none" />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep('slots')} className="btn-secondary flex-1">← Back</button>
              <button onClick={handleBook} disabled={submitting} className="btn-primary flex-1">
                {submitting ? 'Booking…' : '✓ Book Appointment'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
