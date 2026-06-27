import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

const SPEC_LABELS: Record<string, string> = {
  AYU: 'Ayurveda', YOG: 'Yoga & Naturopathy',
  UNA: 'Unani', SID: 'Siddha', HOM: 'Homeopathy',
}

interface ConsentRow {
  id: string
  status: string
  share_full_history: boolean
  consent_date: string
  patient: {
    id: string
    first_name: string
    last_name: string
    date_of_birth: string | null
    gender: string | null
    mobile: string | null
  } | null
}

export default async function DoctorPatientsPage() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: doctor } = await supabase
    .from('doctor')
    .select('id, first_name, last_name, ayush_specialization')
    .eq('auth_user_id', user.id)
    .single()

  if (!doctor) redirect('/dashboard/patient')

  // Active consented patients
  const { data: consents } = await supabase
    .from('patient_doctor_consent')
    .select(`
      id, status, share_full_history, consent_date,
      patient:patient_id(id, first_name, last_name, date_of_birth, gender, mobile)
    `)
    .eq('doctor_id', doctor.id)
    .order('consent_date', { ascending: false })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: ConsentRow[] = (consents ?? [] as any[]).map((c: any) => ({
    ...c,
    patient: Array.isArray(c.patient) ? (c.patient[0] ?? null) : (c.patient ?? null),
  }))

  const active  = rows.filter(r => r.status === 'ACTIVE')
  const revoked = rows.filter(r => r.status === 'REVOKED')

  function age(dob: string | null) {
    if (!dob) return null
    return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
  }

  function PatientCard({ row, dim }: { row: ConsentRow; dim?: boolean }) {
    const p = row.patient
    if (!p) return null
    const a = age(p.date_of_birth)
    return (
      <div className={`p-4 sm:p-5 flex items-center gap-4 ${dim ? 'opacity-50' : ''}`}>
        <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-bold text-brand-700">
            {p.first_name[0]}{p.last_name[0]}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm">{p.first_name} {p.last_name}</p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
            {a !== null && <span className="text-xs text-gray-500">{a}y</span>}
            {p.gender && <span className="text-xs text-gray-400">· {p.gender}</span>}
            {p.mobile && <span className="text-xs text-gray-400">· {p.mobile}</span>}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium
              ${row.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
              {row.status}
            </span>
            {row.share_full_history && (
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                Full history
              </span>
            )}
          </div>
        </div>
        {row.status === 'ACTIVE' && (
          <a
            href={`/patients/${p.id}`}
            className="flex-shrink-0 text-xs text-brand-600 font-medium hover:underline"
          >
            View →
          </a>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/dashboard/doctor" className="text-gray-400 hover:text-gray-600 text-sm">← Dashboard</a>
          <span className="font-semibold text-gray-900">Patient Records</span>
        </div>
        <span className="text-sm text-gray-500">
          {active.length} active · {revoked.length} revoked
        </span>
      </header>

      <main className="max-w-2xl mx-auto p-6 space-y-5">
        {rows.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-gray-400 text-sm">No patients have given consent yet.</p>
            <p className="text-xs text-gray-300 mt-1">
              Patients grant consent when booking or during consultation.
            </p>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <div className="card overflow-hidden">
                <div className="px-5 py-3 border-b flex items-center gap-2">
                  <span className="text-base">✅</span>
                  <h2 className="font-semibold text-gray-900 text-sm">
                    Active Consent ({active.length})
                  </h2>
                </div>
                <div className="divide-y">
                  {active.map(r => <PatientCard key={r.id} row={r} />)}
                </div>
              </div>
            )}

            {revoked.length > 0 && (
              <div className="card overflow-hidden">
                <div className="px-5 py-3 border-b flex items-center gap-2">
                  <span className="text-base">🚫</span>
                  <h2 className="font-semibold text-gray-900 text-sm">
                    Revoked Consent ({revoked.length})
                  </h2>
                  <span className="ml-auto text-xs text-gray-400">No patient data accessible</span>
                </div>
                <div className="divide-y">
                  {revoked.map(r => <PatientCard key={r.id} row={r} dim />)}
                </div>
              </div>
            )}
          </>
        )}

        <p className="text-center text-xs text-gray-400 pb-4">
          {SPEC_LABELS[doctor.ayush_specialization] ?? 'AYUSH'} · Dr. {doctor.first_name} {doctor.last_name} · DPDP Act 2023
        </p>
      </main>
    </div>
  )
}
