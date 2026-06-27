import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { redirect } from 'next/navigation'

const SPEC_LABELS: Record<string, string> = {
  AYU: 'Ayurveda', YOG: 'Yoga', UNA: 'Unani', SID: 'Siddha', HOM: 'Homeopathy',
}

const STATUS_STYLES: Record<string, string> = {
  BOOKED:      'bg-blue-100 text-blue-700',
  CONFIRMED:   'bg-indigo-100 text-indigo-700',
  ARRIVED:     'bg-amber-100 text-amber-700',
  IN_PROGRESS: 'bg-orange-100 text-orange-700',
  COMPLETED:   'bg-gray-100 text-gray-400',
  NO_SHOW:     'bg-red-100 text-red-500',
  CANCELLED:   'bg-red-50 text-red-400',
}

function formatTime(t: string) {
  const [h, m] = t.split(':')
  const hh = parseInt(h)
  return `${hh > 12 ? hh - 12 : hh || 12}:${m} ${hh >= 12 ? 'PM' : 'AM'}`
}

interface AppointmentRow {
  id: string
  start_time: string
  end_time: string
  status: string
  type: string
  is_walk_in: boolean
  booked_by_role: string
  patient: { first_name: string; last_name: string; mobile: string | null } | null
  doctor: { first_name: string; last_name: string; ayush_specialization: string } | null
  hospital: { name: string } | null
}

export default async function AdminAppointmentsPage({
  searchParams,
}: {
  searchParams: { date?: string; status?: string }
}) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = getSupabaseAdmin()

  // ── Get admin record + scope ────────────────────────────────────────────────
  const { data: adminRow } = await admin
    .from('hospital_admin')
    .select('id, scope, hospital_id, hospital_group_id, first_name, last_name')
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (!adminRow) redirect('/auth/login')

  const isGlobal = adminRow.scope === 'GLOBAL'
  const isGroup  = adminRow.scope === 'GROUP'

  // ── Resolve accessible hospital IDs ─────────────────────────────────────────
  let hospitalIds: string[] = []
  let scopeLabel = ''

  if (isGlobal) {
    scopeLabel = 'All Hospitals (Global)'
    const { data: h } = await admin.from('hospital').select('id').eq('active', true)
    hospitalIds = (h ?? []).map(h => h.id)
  } else if (isGroup && adminRow.hospital_group_id) {
    const { data: grp } = await admin
      .from('hospital_group').select('name').eq('id', adminRow.hospital_group_id).maybeSingle()
    scopeLabel = grp?.name ? `${grp.name} (Group)` : 'Group Hospitals'
    const { data: h } = await admin
      .from('hospital').select('id').eq('hospital_group_id', adminRow.hospital_group_id)
    hospitalIds = (h ?? []).map(h => h.id)
  } else if (adminRow.hospital_id) {
    const { data: h } = await admin
      .from('hospital').select('id, name').eq('id', adminRow.hospital_id).maybeSingle()
    scopeLabel = h?.name ?? 'Hospital'
    hospitalIds = adminRow.hospital_id ? [adminRow.hospital_id] : []
  }

  // ── Date + filter params ─────────────────────────────────────────────────────
  const today   = new Date().toISOString().split('T')[0]
  const date    = searchParams.date ?? today
  const status  = searchParams.status ?? ''
  const isToday = date === today

  // ── Query appointments ───────────────────────────────────────────────────────
  let query = admin
    .from('appointment')
    .select(`
      id, start_time, end_time, status, type, is_walk_in, booked_by_role,
      patient:patient_id(first_name, last_name, mobile),
      doctor:doctor_id(first_name, last_name, ayush_specialization),
      hospital:hospital_id(name)
    `)
    .eq('appointment_date', date)
    .neq('status', 'CANCELLED')
    .order('start_time')

  if (hospitalIds.length > 0) {
    query = query.in('hospital_id', hospitalIds)
  }
  if (status) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query = (query as any).eq('status', status)
  }

  const { data: rawAppts } = await query

  // Normalize nested objects (Supabase sometimes returns arrays)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const appointments: AppointmentRow[] = (rawAppts ?? []).map((a: any) => ({
    ...a,
    patient:  Array.isArray(a.patient)  ? (a.patient[0]  ?? null) : (a.patient  ?? null),
    doctor:   Array.isArray(a.doctor)   ? (a.doctor[0]   ?? null) : (a.doctor   ?? null),
    hospital: Array.isArray(a.hospital) ? (a.hospital[0] ?? null) : (a.hospital ?? null),
  }))

  // ── Counts by status ─────────────────────────────────────────────────────────
  const counts = appointments.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1
    return acc
  }, {})

  const dateLabel = new Date(date + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/dashboard/admin" className="text-gray-400 hover:text-gray-600 text-sm">← Dashboard</a>
            <span className="font-semibold text-gray-900">Appointments</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-brand-100 text-brand-700 px-2.5 py-1 rounded-full font-medium">
              {adminRow.scope} scope
            </span>
            <span className="text-xs text-gray-400">{scopeLabel}</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-5">

        {/* Date picker + filter bar */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">Date:</label>
            <form method="GET" className="flex gap-2">
              <input type="date" name="date" defaultValue={date}
                className="input text-sm py-1.5 px-3" />
              {status && <input type="hidden" name="status" value={status} />}
              <button type="submit" className="btn-secondary text-sm py-1.5 px-3">Go</button>
            </form>
          </div>
          {!isToday && (
            <a href="/hospital-admin/appointments"
              className="text-xs text-brand-600 hover:underline">Back to today</a>
          )}
        </div>

        {/* Date heading */}
        <div className="flex items-baseline justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {isToday ? "Today's Appointments" : dateLabel}
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">{scopeLabel}</p>
          </div>
          <span className="text-sm text-gray-500">
            {appointments.length} appointment{appointments.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Status summary pills */}
        {appointments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {Object.entries(counts).map(([st, n]) => (
              <span key={st} className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLES[st] ?? 'bg-gray-100 text-gray-500'}`}>
                {st} · {n}
              </span>
            ))}
          </div>
        )}

        {/* Appointments list */}
        {appointments.length === 0 ? (
          <div className="card p-10 text-center text-sm text-gray-400">
            No appointments found for {isToday ? 'today' : dateLabel}.
          </div>
        ) : (
          <div className="space-y-2">
            {appointments.map(appt => (
              <div key={appt.id} className="card p-4 flex items-center justify-between gap-4">
                {/* Time */}
                <div className="text-center w-16 shrink-0">
                  <p className="text-base font-bold text-gray-900">{formatTime(appt.start_time)}</p>
                  <p className="text-xs text-gray-400">{formatTime(appt.end_time)}</p>
                </div>

                <div className="w-px h-10 bg-gray-200 shrink-0" />

                {/* Patient */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">
                    {appt.patient
                      ? `${appt.patient.first_name} ${appt.patient.last_name}`
                      : 'Unknown Patient'}
                  </p>
                  {appt.patient?.mobile && (
                    <p className="text-xs text-gray-500">{appt.patient.mobile}</p>
                  )}
                </div>

                {/* Doctor */}
                <div className="flex-1 min-w-0 hidden sm:block">
                  {appt.doctor ? (
                    <>
                      <p className="text-sm font-medium text-gray-800 truncate">
                        Dr. {appt.doctor.first_name} {appt.doctor.last_name}
                      </p>
                      <p className="text-xs text-brand-700">
                        {SPEC_LABELS[appt.doctor.ayush_specialization] ?? appt.doctor.ayush_specialization}
                      </p>
                    </>
                  ) : <p className="text-xs text-gray-400">—</p>}
                </div>

                {/* Hospital — show only for GROUP/GLOBAL */}
                {(isGlobal || isGroup) && appt.hospital && (
                  <div className="hidden md:block flex-1 min-w-0">
                    <p className="text-xs text-gray-500 truncate">{appt.hospital.name}</p>
                  </div>
                )}

                {/* Right side — badges + type */}
                <div className="flex items-center gap-2 shrink-0">
                  {appt.is_walk_in && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Walk-in</span>
                  )}
                  {appt.type === 'TELECONSULT' && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">💻</span>
                  )}
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLES[appt.status] ?? 'bg-gray-100 text-gray-500'}`}>
                    {appt.status}
                  </span>
                  {appt.booked_by_role === 'RECEPTIONIST' && (
                    <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">REC</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer links */}
        <div className="flex gap-4 pt-2 text-sm">
          <a href="/hospital-admin/info" className="text-brand-600 hover:underline">Hospital Info</a>
          <a href="/hospital-admin/doctors" className="text-brand-600 hover:underline">Manage Doctors</a>
          <a href="/dashboard/admin" className="text-gray-400 hover:underline">← Dashboard</a>
        </div>
      </main>
    </div>
  )
}
