import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { redirect } from 'next/navigation'

const SPEC_LABELS: Record<string, string> = {
  AYU: 'Ayurveda', YOG: 'Yoga', UNA: 'Unani', SID: 'Siddha', HOM: 'Homeopathy',
}

function formatTime(t: string) {
  const [h, m] = t.split(':')
  const hh = parseInt(h)
  return `${hh > 12 ? hh - 12 : hh || 12}:${m} ${hh >= 12 ? 'PM' : 'AM'}`
}

interface ApptRow {
  id: string
  start_time: string
  status: string
  type: string
  patient: { id: string; first_name: string; last_name: string } | null
  doctor: { first_name: string; last_name: string; ayush_specialization: string } | null
}

export default async function PrescriptionPickerPage() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = getSupabaseAdmin()

  // Get receptionist + hospital
  const { data: rec } = await admin
    .from('receptionist')
    .select('id, hospital_id')
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (!rec) redirect('/auth/login')

  const today = new Date().toISOString().split('T')[0]

  // Today's non-cancelled appointments for this hospital
  const { data: appointments } = await admin
    .from('appointment')
    .select(`
      id, start_time, status, type,
      patient:patient_id(id, first_name, last_name),
      doctor:doctor_id(first_name, last_name, ayush_specialization)
    `)
    .eq('hospital_id', rec.hospital_id)
    .eq('appointment_date', today)
    .neq('status', 'CANCELLED')
    .order('start_time')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const appts: ApptRow[] = (appointments ?? []).map((a: any) => ({
    ...a,
    patient: Array.isArray(a.patient) ? (a.patient[0] ?? null) : (a.patient ?? null),
    doctor:  Array.isArray(a.doctor)  ? (a.doctor[0]  ?? null) : (a.doctor  ?? null),
  }))

  const todayLabel = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-3">
        <a href="/dashboard/receptionist" className="text-gray-400 hover:text-gray-600 text-sm">← Dashboard</a>
        <span className="font-semibold text-gray-900">Enter Prescription — Select Appointment</span>
      </header>

      <main className="max-w-2xl mx-auto p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm text-gray-500">{todayLabel}</h2>
          <span className="text-sm text-gray-400">{appts.length} appointment{appts.length !== 1 ? 's' : ''}</span>
        </div>

        {appts.length === 0 ? (
          <div className="card p-10 text-center space-y-2">
            <p className="text-gray-400 text-sm">No appointments today.</p>
            <a href="/appointments/new" className="text-sm text-brand-600 hover:underline">Book an appointment →</a>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b">
              <p className="text-xs text-gray-500">Select the appointment to enter a prescription for</p>
            </div>
            <div className="divide-y">
              {appts.map(a => (
                <a
                  key={a.id}
                  href={`/receptionist/prescription/${a.id}`}
                  className="flex items-center justify-between px-5 py-4 hover:bg-brand-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-center w-14 flex-shrink-0">
                      <p className="text-sm font-bold text-gray-900">{formatTime(a.start_time)}</p>
                    </div>
                    <div className="w-px h-8 bg-gray-200" />
                    <div>
                      <p className="font-medium text-gray-900 text-sm">
                        {a.patient ? `${a.patient.first_name} ${a.patient.last_name}` : 'Unknown patient'}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {a.doctor
                          ? `Dr. ${a.doctor.first_name} ${a.doctor.last_name} · ${SPEC_LABELS[a.doctor.ayush_specialization] ?? a.doctor.ayush_specialization}`
                          : '—'}
                        {a.type === 'TELECONSULT' && ' · 💻 Teleconsult'}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm text-brand-600 font-medium flex-shrink-0">Select →</span>
                </a>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-gray-400">
          Only showing today&apos;s appointments. For past appointments,{' '}
          <a href="/appointments/today" className="text-brand-500 hover:underline">view full schedule</a>.
        </p>
      </main>
    </div>
  )
}
