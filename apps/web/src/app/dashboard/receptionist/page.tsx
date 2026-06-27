import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { redirect } from 'next/navigation'
import SignOutButton from '@/components/auth/SignOutButton'
import GdprLookup from '@/components/receptionist/GdprLookup'

const STATUS_BADGE: Record<string, string> = {
  BOOKED:    'bg-blue-100 text-blue-700',
  CONFIRMED: 'bg-brand-100 text-brand-700',
  ARRIVED:   'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-gray-100 text-gray-400',
  NO_SHOW:   'bg-red-100 text-red-500',
  CANCELLED: 'bg-red-50 text-red-400',
}

const SPEC_LABELS: Record<string, string> = {
  AYU: 'Ayurveda', YOG: 'Yoga', UNA: 'Unani', SID: 'Siddha', HOM: 'Homeopathy',
}

function formatTime(t: string) {
  const [h, m] = t.split(':')
  const hh = parseInt(h)
  return `${hh > 12 ? hh - 12 : hh || 12}:${m} ${hh >= 12 ? 'PM' : 'AM'}`
}

interface AppointmentRow {
  id: string
  start_time: string
  status: string
  type: string
  is_walk_in: boolean
  patient: { id: string; first_name: string; last_name: string; mobile: string | null } | null
  doctor: { first_name: string; last_name: string; ayush_specialization: string } | null
}

export default async function ReceptionistDashboard() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = getSupabaseAdmin()

  // Get receptionist record and hospital info
  const { data: rec } = await admin
    .from('receptionist')
    .select('id, hospital_id, hospital:hospital_id(id, name, city)')
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (!rec) redirect('/auth/login')

  const hospital = Array.isArray(rec.hospital) ? rec.hospital[0] : rec.hospital
  const today = new Date().toISOString().split('T')[0]

  // Today's appointments for this hospital
  const { data: appointments } = await admin
    .from('appointment')
    .select(`
      id, start_time, status, type, is_walk_in,
      patient:patient_id(id, first_name, last_name, mobile),
      doctor:doctor_id(first_name, last_name, ayush_specialization)
    `)
    .eq('hospital_id', rec.hospital_id)
    .eq('appointment_date', today)
    .neq('status', 'CANCELLED')
    .order('start_time')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const appts: AppointmentRow[] = (appointments ?? []).map((a: any) => ({
    ...a,
    patient: Array.isArray(a.patient) ? (a.patient[0] ?? null) : (a.patient ?? null),
    doctor:  Array.isArray(a.doctor)  ? (a.doctor[0]  ?? null) : (a.doctor  ?? null),
  }))

  const todayLabel = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
  const pending   = appts.filter(a => ['BOOKED', 'CONFIRMED'].includes(a.status)).length
  const arrived   = appts.filter(a => a.status === 'ARRIVED').length
  const completed = appts.filter(a => a.status === 'COMPLETED').length

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">A</span>
            </div>
            <span className="font-semibold text-gray-900">Ayushpathi — Reception</span>
          </div>
          {hospital && (
            <p className="text-xs text-gray-400 mt-0.5 ml-9">{(hospital as { name: string; city?: string }).name}{(hospital as { name: string; city?: string }).city ? `, ${(hospital as { name: string; city?: string }).city}` : ''}</p>
          )}
        </div>
        <SignOutButton className="text-sm text-gray-400 hover:text-gray-600" />
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Stat pills */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Pending / Confirmed', value: pending,   color: 'text-blue-600',  bg: 'bg-blue-50'  },
            { label: 'In clinic',           value: arrived,   color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Completed',           value: completed, color: 'text-green-600', bg: 'bg-green-50' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl p-4`}>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's schedule */}
          <div className="lg:col-span-2 card overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Today&apos;s Schedule</h2>
              <span className="text-xs text-gray-400">{todayLabel}</span>
            </div>
            {appts.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">No appointments today.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-5 py-2 text-left text-xs font-medium text-gray-500">Time</th>
                      <th className="px-5 py-2 text-left text-xs font-medium text-gray-500">Patient</th>
                      <th className="px-5 py-2 text-left text-xs font-medium text-gray-500">Doctor</th>
                      <th className="px-5 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {appts.map(a => (
                      <tr key={a.id} className="hover:bg-gray-50">
                        <td className="px-5 py-3 font-mono text-xs text-gray-700 whitespace-nowrap">
                          {formatTime(a.start_time)}
                          {a.type === 'TELECONSULT' && (
                            <span className="ml-1 text-blue-500">💻</span>
                          )}
                          {a.is_walk_in && (
                            <span className="ml-1 text-xs text-amber-500">walk-in</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <p className="font-medium text-gray-900">
                            {a.patient ? `${a.patient.first_name} ${a.patient.last_name}` : '—'}
                          </p>
                          {a.patient?.mobile && (
                            <p className="text-xs text-gray-400">{a.patient.mobile}</p>
                          )}
                        </td>
                        <td className="px-5 py-3 text-gray-600 text-xs">
                          {a.doctor
                            ? `Dr. ${a.doctor.first_name} ${a.doctor.last_name} · ${SPEC_LABELS[a.doctor.ayush_specialization] ?? a.doctor.ayush_specialization}`
                            : '—'}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[a.status] ?? 'bg-gray-100 text-gray-500'}`}>
                            {a.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Quick actions */}
            <div className="card p-4 space-y-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Quick actions</h3>
              {[
                { label: '➕ Register new patient', href: '/patients/new' },
                { label: '📅 Book appointment',     href: '/appointments/new' },
                { label: '💊 Enter prescription',   href: '/receptionist/prescriptions/new' },
                { label: '📎 Attach test results',  href: '/results/upload' },
              ].map(item => (
                <a key={item.label} href={item.href}
                  className="block w-full text-left px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-brand-50 hover:border-brand-200 hover:text-brand-700 transition-colors">
                  {item.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* GDPR Patient Lookup */}
        <GdprLookup />
      </main>
    </div>
  )
}
