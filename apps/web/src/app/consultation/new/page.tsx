import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

interface AppointmentRow {
  id: string
  start_time: string
  end_time: string
  type: string
  status: string
  patient: { id: string; first_name: string; last_name: string; date_of_birth: string | null; gender: string | null } | null
}

function formatTime(t: string) {
  const [h, m] = t.split(':')
  const hh = parseInt(h)
  return `${hh > 12 ? hh - 12 : hh || 12}:${m} ${hh >= 12 ? 'PM' : 'AM'}`
}

function age(dob: string | null) {
  if (!dob) return null
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
}

const STATUS_RING: Record<string, string> = {
  BOOKED:    'border-l-4 border-blue-400',
  CONFIRMED: 'border-l-4 border-brand-400',
  ARRIVED:   'border-l-4 border-amber-400',
}

export default async function NewConsultationPage() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const role = user.user_metadata?.role
  if (role !== 'doctor') redirect('/dashboard/patient')

  const { data: doctor } = await supabase
    .from('doctor')
    .select('id, first_name, last_name, verification_status')
    .eq('auth_user_id', user.id)
    .single()

  if (!doctor || doctor.verification_status !== 'APPROVED') {
    redirect('/dashboard/doctor')
  }

  const today = new Date().toISOString().split('T')[0]

  // Today's appointments that don't yet have a consultation started
  const { data: appointments } = await supabase
    .from('appointment')
    .select(`
      id, start_time, end_time, type, status,
      patient:patient_id(id, first_name, last_name, date_of_birth, gender)
    `)
    .eq('doctor_id', doctor.id)
    .eq('appointment_date', today)
    .in('status', ['BOOKED', 'CONFIRMED', 'ARRIVED'])
    .order('start_time')

  // Also check which appointments already have a consultation
  const apptIds = (appointments ?? []).map(a => a.id)
  let existingConsultIds = new Set<string>()
  if (apptIds.length > 0) {
    const { data: consults } = await supabase
      .from('consultation')
      .select('appointment_id')
      .in('appointment_id', apptIds)
    existingConsultIds = new Set((consults ?? []).map(c => c.appointment_id).filter(Boolean))
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const appts: AppointmentRow[] = (appointments ?? []).map((a: any) => ({
    ...a,
    patient: Array.isArray(a.patient) ? (a.patient[0] ?? null) : (a.patient ?? null),
  }))

  const openAppts = appts.filter(a => !existingConsultIds.has(a.id))
  const inProgress = appts.filter(a => existingConsultIds.has(a.id))

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-3">
        <a href="/dashboard/doctor" className="text-gray-400 hover:text-gray-600 text-sm">← Dashboard</a>
        <span className="font-semibold text-gray-900">Start Consultation / Write Prescription</span>
      </header>

      <main className="max-w-2xl mx-auto p-6 space-y-5">
        {openAppts.length === 0 && inProgress.length === 0 ? (
          <div className="card p-10 text-center space-y-3">
            <p className="text-2xl">📋</p>
            <p className="text-gray-600 font-medium">No appointments remaining today</p>
            <p className="text-sm text-gray-400">All of today&apos;s appointments have been attended to, or there are none scheduled.</p>
            <a href="/appointments/today" className="inline-block mt-2 text-sm text-brand-600 hover:underline">
              View today&apos;s full schedule →
            </a>
          </div>
        ) : (
          <>
            {openAppts.length > 0 && (
              <div className="card overflow-hidden">
                <div className="px-5 py-3 border-b">
                  <h2 className="font-semibold text-gray-900 text-sm">
                    Waiting / Ready to start ({openAppts.length})
                  </h2>
                </div>
                <div className="divide-y">
                  {openAppts.map(a => {
                    const p = a.patient
                    const patientAge = p ? age(p.date_of_birth) : null
                    return (
                      <a
                        key={a.id}
                        href={`/consultation/${a.id}`}
                        className={`flex items-center justify-between px-5 py-4 hover:bg-brand-50 transition-colors ${STATUS_RING[a.status] ?? 'border-l-4 border-gray-200'}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="text-center w-14">
                            <p className="text-base font-bold text-gray-900">{formatTime(a.start_time)}</p>
                            <p className="text-xs text-gray-400">{a.end_time.slice(0,5)}</p>
                          </div>
                          <div className="w-px h-10 bg-gray-200" />
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">
                              {p ? `${p.first_name} ${p.last_name}` : 'Unknown patient'}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {patientAge !== null && <span className="text-xs text-gray-500">{patientAge}y</span>}
                              {p?.gender && <span className="text-xs text-gray-400">· {p.gender}</span>}
                              {a.type === 'TELECONSULT' && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">💻 Teleconsult</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <span className="btn-primary text-sm px-4 py-1.5 flex-shrink-0">
                          Start →
                        </span>
                      </a>
                    )
                  })}
                </div>
              </div>
            )}

            {inProgress.length > 0 && (
              <div className="card overflow-hidden">
                <div className="px-5 py-3 border-b">
                  <h2 className="font-semibold text-gray-900 text-sm">
                    Consultation in progress / resume ({inProgress.length})
                  </h2>
                </div>
                <div className="divide-y">
                  {inProgress.map(a => {
                    const p = a.patient
                    return (
                      <a
                        key={a.id}
                        href={`/consultation/${a.id}`}
                        className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 border-l-4 border-green-300 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="text-center w-14">
                            <p className="text-base font-bold text-gray-700">{formatTime(a.start_time)}</p>
                          </div>
                          <div className="w-px h-8 bg-gray-200" />
                          <div>
                            <p className="font-medium text-gray-800 text-sm">
                              {p ? `${p.first_name} ${p.last_name}` : 'Unknown patient'}
                            </p>
                            <p className="text-xs text-green-600 mt-0.5">Consultation started</p>
                          </div>
                        </div>
                        <span className="text-sm text-brand-600 font-medium hover:underline flex-shrink-0">
                          Resume →
                        </span>
                      </a>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}

        <p className="text-center text-xs text-gray-400">
          Dr. {doctor.first_name} {doctor.last_name} · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </main>
    </div>
  )
}
