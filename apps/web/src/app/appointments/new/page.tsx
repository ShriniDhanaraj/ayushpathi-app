'use client'
import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'
import { LANGUAGES } from '@/lib/shared/languages'

// languages_spoken may mix 2-letter codes and full labels — map + dedupe for display
function languageLabels(codes: string[] | null | undefined): string {
  return Array.from(new Set(
    (codes ?? []).map(c => LANGUAGES.find(l => l.code === c)?.label ?? c)
  )).join(', ')
}

type Step = 1 | 2 | 3

interface Doctor {
  id: string; first_name: string; last_name: string
  ayush_specialization: string; years_of_experience: number
  languages_spoken: string[]; teleconsult_enabled: boolean
  teleconsult_fee: number
  address?: Array<{ city: string; state: string }> | { city: string; state: string } | null
}

interface Slot { date: string; start_time: string; end_time: string }

const SPECIALIZATIONS = [
  { code: 'AYU', label: 'Ayurveda' }, { code: 'YOG', label: 'Yoga & Naturopathy' },
  { code: 'UNA', label: 'Unani' }, { code: 'SID', label: 'Siddha' },
  { code: 'HOM', label: 'Homeopathy' },
]

function generateSlots(availability: { start_time: string; end_time: string; slot_duration: number }[], date: string): Slot[] {
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

// Inner component uses useSearchParams — must be wrapped in <Suspense> by the parent.
function BookAppointmentInner() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [spec, setSpec] = useState('')
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [slots, setSlots] = useState<Slot[]>([])
  const [bookedSlots, setBookedSlots] = useState<string[]>([])
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [type, setType] = useState<'F2F' | 'TELECONSULT'>('F2F')
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null)
  const [pendingSlot, setPendingSlot] = useState<string | null>(null)
  const searchParams = useSearchParams()

  // Know whether the visitor is signed in (guests may browse; sign-in required to book)
  useEffect(() => {
    getSupabaseClient().auth.getUser().then(({ data: { user } }) => setIsAuthed(!!user))
  }, [])

  // Pre-select a doctor when arriving from /doctor/[id] profile page,
  // and restore date/slot/type when returning from login/registration.
  useEffect(() => {
    const doctorId = searchParams.get('doctor')
    if (!doctorId) return
    const date = searchParams.get('date')
    const slot = searchParams.get('slot')
    const t = searchParams.get('type')
    if (date) setSelectedDate(date)
    if (slot) setPendingSlot(slot)
    if (t === 'TELECONSULT' || t === 'F2F') setType(t)
    const supabase = getSupabaseClient()
    supabase
      .from('doctor')
      .select('id, first_name, last_name, ayush_specialization, years_of_experience, languages_spoken, teleconsult_enabled, teleconsult_fee, address:address_id(city, state)')
      .eq('id', doctorId)
      .eq('verification_status', 'APPROVED')
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return
        const doc = data as unknown as Doctor
        setSelectedDoctor(doc)
        setSpec(doc.ayush_specialization)
        setDoctors([doc])
        setStep(2)
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function searchDoctors() {
    setSearching(true)
    const supabase = getSupabaseClient()
    let query = supabase
      .from('doctor')
      .select('id, first_name, last_name, ayush_specialization, years_of_experience, languages_spoken, teleconsult_enabled, teleconsult_fee, address:address_id(city, state)')
      .eq('verification_status', 'APPROVED')
      .order('last_name')
    if (spec) query = query.eq('ayush_specialization', spec)
    const { data } = await query
    setDoctors((data ?? []) as unknown as Doctor[])
    setSearching(false)
    setStep(2)
  }

  async function loadSlots() {
    if (!selectedDoctor || !selectedDate) return
    const supabase = getSupabaseClient()
    const dayCode = new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase().slice(0, 3)
    const { data: avail } = await supabase
      .from('doctor_availability')
      .select('start_time, end_time, slot_duration')
      .eq('doctor_id', selectedDoctor.id)
      .eq('day_of_week', dayCode)
      .eq('active', true)
    const { data: booked } = await supabase
      .from('appointment')
      .select('start_time')
      .eq('doctor_id', selectedDoctor.id)
      .eq('appointment_date', selectedDate)
      .neq('status', 'CANCELLED')
    setBookedSlots((booked ?? []).map(b => b.start_time))
    const generated = generateSlots(avail ?? [], selectedDate)
    setSlots(generated)

    // Returning from login: re-select the slot they had picked and go to Confirm
    if (pendingSlot) {
      const match = generated.find(sl => sl.start_time === pendingSlot)
      setPendingSlot(null)
      if (match && !(booked ?? []).some(b => b.start_time === match.start_time)) {
        setSelectedSlot(match)
        setStep(3)
      }
    }
  }

  useEffect(() => { loadSlots() }, [selectedDoctor, selectedDate]) // eslint-disable-line react-hooks/exhaustive-deps

  // Where to come back to after signing in — full booking context preserved
  function resumeUrl() {
    if (!selectedDoctor || !selectedSlot) return '/appointments/new'
    const q = new URLSearchParams({
      doctor: selectedDoctor.id,
      date: selectedSlot.date,
      slot: selectedSlot.start_time,
      type,
    })
    return `/appointments/new?${q.toString()}`
  }

  function goToLogin() {
    router.push(`/auth/login?redirect=${encodeURIComponent(resumeUrl())}`)
  }

  async function confirmBooking() {
    if (!selectedSlot || !selectedDoctor) return
    setLoading(true)
    const supabase = getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { goToLogin(); return }
    const { data: patient } = await supabase.from('patient').select('id').eq('auth_user_id', user.id).single()
    if (!patient) { setLoading(false); return }

    const { data: inserted } = await supabase.from('appointment').insert({
      patient_id: patient.id,
      doctor_id: selectedDoctor.id,
      appointment_date: selectedSlot.date,
      start_time: selectedSlot.start_time,
      end_time: selectedSlot.end_time,
      type,
      status: 'BOOKED',
      booked_by_role: 'PATIENT',
    }).select('id').single()

    // Auto-generate Jitsi link for teleconsults
    if (type === 'TELECONSULT' && inserted?.id) {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        await fetch('/api/appointments/teleconsult', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ appointment_id: inserted.id }),
        })
      }
    }
    router.push('/dashboard/patient?booked=1')
  }

  const minDate = new Date(); minDate.setDate(minDate.getDate() + 1)
  const minDateStr = minDate.toISOString().split('T')[0]
  const maxDate = new Date(); maxDate.setDate(maxDate.getDate() + 30)
  const maxDateStr = maxDate.toISOString().split('T')[0]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-3">
        <a href={isAuthed ? '/dashboard/patient' : '/'} className="text-gray-400 hover:text-gray-600 text-sm">
          {isAuthed ? '← Dashboard' : '← Home'}
        </a>
        <span className="font-semibold text-gray-900">Book Appointment</span>
      </header>

      <div className="bg-white border-b px-6 py-3">
        <div className="max-w-3xl mx-auto flex gap-6">
          {['Find Doctor', 'Pick Slot', 'Confirm'].map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                step > i + 1 ? 'bg-accent-500 text-white' :
                step === i + 1 ? 'bg-accent-500 text-white ring-4 ring-accent-100' :
                'bg-gray-200 text-gray-500'
              }`}>{step > i + 1 ? '✓' : i + 1}</div>
              <span className={`text-sm ${step === i + 1 ? 'text-brand-700 font-medium' : 'text-gray-400'}`}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      <main className="max-w-3xl mx-auto p-6 space-y-4">
        {isAuthed === false && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            You&apos;re browsing as a guest. You can search doctors and view slots — we&apos;ll ask you to{' '}
            <a href={`/auth/login?redirect=${encodeURIComponent('/appointments/new')}`} className="underline font-medium">sign in</a>
            {' '}or{' '}
            <a href={`/auth/register?redirect=${encodeURIComponent('/appointments/new')}`} className="underline font-medium">register</a>
            {' '}before confirming a booking.
          </div>
        )}
        {step === 1 && (
          <div className="card p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Choose AYUSH specialization</h2>
            {/* All AYUSH — full width tile */}
            <button onClick={() => setSpec('')}
              className={`w-full p-4 rounded-xl border text-left transition-colors ${
                spec === '' ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-gray-200 hover:border-brand-400 text-gray-700'
              }`}>
              <p className="font-semibold">All AYUSH</p>
              <p className={`text-xs mt-0.5 ${spec === '' ? 'text-brand-100' : 'text-gray-400'}`}>
                Search across all 5 specializations
              </p>
            </button>
            <div className="grid grid-cols-2 gap-3">
              {SPECIALIZATIONS.map(s => (
                <button key={s.code} onClick={() => setSpec(s.code)}
                  className={`p-4 rounded-xl border text-left transition-colors ${
                    spec === s.code ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-gray-200 hover:border-brand-400 text-gray-700'
                  }`}>
                  <p className="font-medium">{s.label}</p>
                </button>
              ))}
            </div>
            <button onClick={searchDoctors} className="btn-primary w-full" disabled={searching}>
              {searching ? 'Searching…' : 'Search Doctors →'}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">
                {doctors.length} doctor{doctors.length !== 1 ? 's' : ''} found
                {spec ? ` · ${SPECIALIZATIONS.find(s => s.code === spec)?.label}` : ' · All AYUSH'}
              </h2>
              <button onClick={() => { setStep(1); setSelectedDoctor(null); setSlots([]) }}
                className="text-sm text-brand-600 hover:underline">Change</button>
            </div>

            {doctors.length === 0 && (
              <div className="card p-8 text-center text-sm text-gray-400">
                No approved doctors found for this specialization yet.
              </div>
            )}

            {doctors.map(doc => (
              <div key={doc.id} className={`card p-5 cursor-pointer transition-all ${
                selectedDoctor?.id === doc.id ? 'border-brand-500 ring-2 ring-brand-200' : 'hover:border-gray-300'
              }`} onClick={() => setSelectedDoctor(doc)}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-900">Dr. {doc.first_name} {doc.last_name}</p>
                    <p className="text-sm text-brand-700 font-medium mt-0.5">
                      {SPECIALIZATIONS.find(s => s.code === doc.ayush_specialization)?.label ?? doc.ayush_specialization}
                    </p>
                    <p className="text-xs text-gray-500">{doc.years_of_experience}yr exp</p>
                    <p className="text-xs text-gray-400 mt-1">{languageLabels(doc.languages_spoken)}</p>
                  </div>
                  <div className="text-right">
                    {doc.teleconsult_enabled && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Teleconsult available</span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {selectedDoctor && (
              <div className="card p-5 space-y-4">
                <h3 className="font-medium text-gray-900">Pick a date</h3>
                <input type="date" className="input" min={minDateStr} max={maxDateStr}
                  value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />

                {selectedDate && slots.length === 0 && (
                  <p className="text-sm text-gray-400">No slots available on this day. Try another date.</p>
                )}

                {slots.length > 0 && (
                  <>
                    <h3 className="font-medium text-gray-900">Available slots</h3>
                    <div className="flex flex-wrap gap-2">
                      {slots.map(slot => {
                        const isBooked = bookedSlots.includes(slot.start_time)
                        return (
                          <button key={slot.start_time} disabled={isBooked}
                            onClick={() => setSelectedSlot(slot)}
                            className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                              isBooked ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' :
                              selectedSlot?.start_time === slot.start_time ? 'bg-brand-600 border-brand-600 text-white' :
                              'bg-white border-gray-300 text-gray-700 hover:border-brand-400'
                            }`}>
                            {slot.start_time}
                          </button>
                        )
                      })}
                    </div>
                  </>
                )}

                {selectedDoctor.teleconsult_enabled && selectedSlot && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Appointment type</h3>
                    <div className="flex gap-3">
                      {(['F2F', 'TELECONSULT'] as const).map(t => (
                        <button key={t} onClick={() => setType(t)}
                          className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                            type === t ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-gray-300 text-gray-700 hover:border-brand-400'
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

                {selectedSlot && (isAuthed ? (
                  <button onClick={() => setStep(3)} className="btn-primary w-full">Confirm slot →</button>
                ) : (
                  <div className="space-y-2">
                    <button onClick={goToLogin} className="btn-primary w-full">
                      Sign in to confirm this slot →
                    </button>
                    <p className="text-xs text-gray-400 text-center">
                      First time here?{' '}
                      <a
                        href={`/auth/register?redirect=${encodeURIComponent(resumeUrl())}`}
                        className="text-brand-600 underline"
                      >
                        Create a free account
                      </a>
                      {' '}— your selected slot will be kept.
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 3 && selectedDoctor && selectedSlot && (
          <div className="card p-6 space-y-5">
            <h2 className="font-semibold text-gray-900">Confirm appointment</h2>
            <div className="bg-brand-50 rounded-xl p-4 space-y-2 text-sm">
              {([
                ['Doctor', `Dr. ${selectedDoctor.first_name} ${selectedDoctor.last_name}`],
                ['Specialization', SPECIALIZATIONS.find(s => s.code === selectedDoctor.ayush_specialization)?.label ?? ''],
                ['Date', new Date(selectedSlot.date).toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' })],
                ['Time', `${selectedSlot.start_time} – ${selectedSlot.end_time}`],
                ['Type', type === 'F2F' ? 'In-person' : 'Teleconsultation'],
              ] as [string, string][]).map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-medium text-gray-900">{value}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button className="btn-secondary flex-1" onClick={() => setStep(2)}>← Change</button>
              <button className="btn-primary flex-1" onClick={confirmBooking} disabled={loading}>
                {loading ? 'Booking…' : 'Book Appointment ✓'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

// Next.js 14 requires useSearchParams() to be inside a <Suspense> boundary at build time.
export default function BookAppointmentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading…</p>
      </div>
    }>
      <BookAppointmentInner />
    </Suspense>
  )
}
