import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

interface PatientRow {
  id: string; first_name: string; last_name: string
  mobile: string; gender: string; date_of_birth: string
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

export default async function UpcomingAppointments() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: doctor } = await supabase
    .from('doctor').select('id, first_name').eq('auth_user_id', user.id).single()
  if (!doctor) redirect('/dashboard/patient')

  const today = new Date().toISOString().split('T')[0]
  // next 30 days
  const next30 = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]

  const { data: appointments } = await supabase
    .from('appointment')
    .select(`
      id, appointment_date, start_time, end_time, type, status,
      patient:patient_id(id, first_name, last_name, mobile, gender, date_of_birth)
    `)
    .eq('doctor_id', doctor.id)
    .gt('appointment_date', today)
    .lte('appointment_date', next30)
    .in('status', ['BOOKED', 'CONFIRMED', 'PENDING'])
    .order('appointment_date').order('start_time')

  const STATUS_STYLES: Record<string, string> = {
    BOOKED:    'bg-blue-100 text-blue-700',
    CONFIRMED: 'bg-brand-100 text-brand-700',
    PENDING:   'bg-amber-100 text-amber-700',
  }

  // Group by date
  const byDate: Record<string, typeof appointments> = {}
  for (const appt of appointments ?? []) {
    if (!byDate[appt.appointment_date]) byDate[appt.appointment_date] = []
    byDate[appt.appointment_date]!.push(appt)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/dashboard/doctor" className="text-gray-400 hover:text-gray-600 text-sm">← Dashboard</a>
          <span className="font-semibold text-gray-900">Upcoming Appointments</span>
        </div>
        <span className="text-sm text-gray-500">{appointments?.length ?? 0} appointment{appointments?.length !== 1 ? 's' : ''} · next 30 days</span>
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-6">
        {!appointments || appointments.length === 0 ? (
          <div className="card p-8 text-center text-sm text-gray-400">No upcoming appointments in the next 30 days.</div>
        ) : (
          Object.entries(byDate).map(([date, appts]) => (
            <div key={date}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">
                {formatDate(date)}
              </p>
              <div className="space-y-2">
                {(appts ?? []).map(appt => {
                  const patient = (appt.patient as unknown) as PatientRow | null
                  const age = patient?.date_of_birth
                    ? Math.floor((Date.now() - new Date(patient.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
                    : null
                  return (
                    <div key={appt.id} className="card p-5 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="text-center w-16">
                          <p className="text-lg font-bold text-gray-900">{appt.start_time.slice(0, 5)}</p>
                          <p className="text-xs text-gray-400">{appt.end_time.slice(0, 5)}</p>
                        </div>
                        <div className="w-px h-10 bg-gray-200" />
                        <div>
                          <p className="font-semibold text-gray-900">
                            {patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown'}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {age !== null && <span className="text-xs text-gray-500">{age}y · {patient?.gender}</span>}
                            {appt.type === 'TELECONSULT' && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">💻 Teleconsult</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLES[appt.status] ?? 'bg-gray-100 text-gray-500'}`}>
                          {appt.status}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  )
}
