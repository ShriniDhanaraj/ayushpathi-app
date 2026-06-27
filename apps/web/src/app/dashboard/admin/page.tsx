import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { redirect } from 'next/navigation'
import SignOutButton from '@/components/auth/SignOutButton'

const SPEC_LABELS: Record<string, string> = {
  AYU: 'Ayurveda', YOG: 'Yoga & Naturopathy',
  UNA: 'Unani', SID: 'Siddha', HOM: 'Homeopathy',
}

interface PendingDoctor {
  id: string
  first_name: string
  last_name: string
  ayush_specialization: string
  created_at: string
}

interface Hospital {
  id: string
  name: string
  city: string | null
  active: boolean
}

export default async function AdminDashboard() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = getSupabaseAdmin()

  // Get admin record + scope
  const { data: adminRow } = await admin
    .from('hospital_admin')
    .select('id, scope, hospital_id, hospital_group_id, is_active, first_name, last_name')
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (!adminRow) redirect('/auth/login')

  const isGlobal = adminRow.scope === 'GLOBAL'
  const isGroup  = adminRow.scope === 'GROUP'

  // Determine accessible hospital IDs
  let hospitalIds: string[] = []
  let hospitals: Hospital[] = []

  if (isGlobal) {
    const { data: h } = await admin.from('hospital').select('id, name, city, active').order('name')
    hospitals = (h ?? []) as Hospital[]
    hospitalIds = hospitals.map(h => h.id)
  } else if (isGroup && adminRow.hospital_group_id) {
    const { data: h } = await admin
      .from('hospital')
      .select('id, name, city, active')
      .eq('hospital_group_id', adminRow.hospital_group_id)
      .order('name')
    hospitals = (h ?? []) as Hospital[]
    hospitalIds = hospitals.map(h => h.id)
  } else if (adminRow.hospital_id) {
    const { data: h } = await admin
      .from('hospital')
      .select('id, name, city, active')
      .eq('id', adminRow.hospital_id)
      .maybeSingle()
    if (h) { hospitals = [h as Hospital]; hospitalIds = [h.id] }
  }

  const today = new Date().toISOString().split('T')[0]

  // Build queries scoped to accessible hospitals
  async function countAppts(status?: string) {
    let q = admin.from('appointment').select('id', { count: 'exact', head: true })
      .eq('appointment_date', today)
    if (!isGlobal && hospitalIds.length) q = q.in('hospital_id', hospitalIds)
    if (status) q = q.eq('status', status)
    return (await q).count ?? 0
  }

  async function pendingDoctors(): Promise<PendingDoctor[]> {
    let q = admin.from('doctor')
      .select('id, first_name, last_name, ayush_specialization, created_at')
      .eq('verification_status', 'PENDING')
      .order('created_at', { ascending: false })

    if (!isGlobal && hospitalIds.length) {
      const { data: linked } = await admin
        .from('hospital_doctor').select('doctor_id').in('hospital_id', hospitalIds)
      const ids = (linked ?? []).map(l => l.doctor_id)
      if (ids.length === 0) return []
      q = q.in('id', ids)
    }
    return ((await q).data ?? []) as PendingDoctor[]
  }

  const [
    aptsTotal, aptsCompleted, aptsArrived,
    doctorCount, recepCount, pending,
  ] = await Promise.all([
    countAppts(),
    countAppts('COMPLETED'),
    countAppts('ARRIVED'),
    (async () => {
      let q = admin.from('hospital_doctor').select('id', { count: 'exact', head: true }).eq('active', true)
      if (!isGlobal && hospitalIds.length) q = q.in('hospital_id', hospitalIds)
      return (await q).count ?? 0
    })(),
    (async () => {
      let q = admin.from('receptionist').select('id', { count: 'exact', head: true }).eq('is_active', true)
      if (!isGlobal && hospitalIds.length) q = q.in('hospital_id', hospitalIds)
      return (await q).count ?? 0
    })(),
    pendingDoctors(),
  ])

  const scopeLabel = isGlobal ? 'Platform Admin' : isGroup ? 'Group Admin' : 'Hospital Admin'
  const todayLabel = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">A</span>
            </div>
            <h1 className="font-semibold text-gray-900">Ayushpathi Admin</h1>
          </div>
          <p className="text-xs text-gray-400 mt-0.5 ml-9">
            {adminRow.first_name} {adminRow.last_name} · {scopeLabel}
            {hospitals.length === 1 ? ` · ${hospitals[0].name}` : hospitals.length > 1 ? ` · ${hospitals.length} hospitals` : ''}
          </p>
        </div>
        <SignOutButton className="text-sm text-gray-400 hover:text-gray-600" />
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Today stats */}
        <div>
          <p className="text-xs text-gray-400 mb-3">{todayLabel}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Today's appointments", value: aptsTotal,       icon: '📅', color: 'text-brand-600' },
              { label: 'In clinic now',         value: aptsArrived,    icon: '🏥', color: 'text-amber-600' },
              { label: 'Completed today',       value: aptsCompleted,  icon: '✅', color: 'text-green-600' },
              { label: 'Pending verification',  value: pending.length, icon: '⏳', color: 'text-red-600'   },
            ].map(s => (
              <div key={s.label} className="card p-5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xl">{s.icon}</span>
                  <span className={`text-2xl font-bold ${s.color}`}>{s.value}</span>
                </div>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pending doctor verifications */}
          <div className="lg:col-span-2 card overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Pending Doctor Verifications</h2>
              {pending.length > 0 && (
                <span className="bg-red-100 text-red-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                  {pending.length} pending
                </span>
              )}
            </div>
            {pending.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">✅ No pending verifications</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {pending.map(d => (
                  <li key={d.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">
                        Dr. {d.first_name} {d.last_name}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {SPEC_LABELS[d.ayush_specialization] ?? d.ayush_specialization} · Applied{' '}
                        {new Date(d.created_at).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                    <a href={`/hospital-admin/doctors/${d.id}`}
                      className="btn-primary text-sm py-1.5 px-4">
                      Review →
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Right column: quick links + hospitals */}
          <div className="space-y-4">
            <div className="card p-4 space-y-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Quick links</h3>
              {[
                { label: '👨‍⚕️ Verify doctors',       href: '/hospital-admin/doctors?status=PENDING' },
                { label: '📅 Today\'s appointments', href: '/hospital-admin/appointments' },
                { label: '🏥 Hospital info',          href: '/hospital-admin/info' },
                { label: '👤 Receptionists',          href: '/hospital-admin/receptionists' },
              ].map(item => (
                <a key={item.label} href={item.href}
                  className="block w-full text-left px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-brand-50 hover:border-brand-200 hover:text-brand-700 transition-colors">
                  {item.label}
                </a>
              ))}
            </div>

            {hospitals.length > 0 && hospitals.length <= 6 && (
              <div className="card p-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  {hospitals.length === 1 ? 'Your hospital' : 'Hospitals'}
                </h3>
                <div className="space-y-2">
                  {hospitals.map(h => (
                    <div key={h.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{h.name}</p>
                        {h.city && <p className="text-xs text-gray-400">{h.city}</p>}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${h.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                        {h.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="card p-3 text-center">
                <p className="text-xl font-bold text-gray-900">{doctorCount}</p>
                <p className="text-xs text-gray-400 mt-0.5">Active doctors</p>
              </div>
              <div className="card p-3 text-center">
                <p className="text-xl font-bold text-gray-900">{recepCount}</p>
                <p className="text-xs text-gray-400 mt-0.5">Receptionists</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
