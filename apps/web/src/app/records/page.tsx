import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

interface DoctorRow      { first_name: string; last_name: string; ayush_specialization: string }
interface MedicineRow    { name: string; dosage: string; frequency: string; duration: string }
interface PrescriptionRow { medicines: MedicineRow[]; instructions?: string; is_repeat: boolean }
interface TestResultRow  { id: string; file_url: string; file_name: string; file_type: string; notes: string | null; created_at: string }
interface FamilyRow      {
  id: string; relation_type: string; first_name: string | null; last_name: string | null
  date_of_birth: string | null; known_conditions: string[]; allergies: string[]; notes: string | null
  related_patient_id: string | null
}

const SPEC: Record<string, string> = {
  AYU: 'Ayurveda', YOG: 'Yoga & Naturopathy', UNA: 'Unani', SID: 'Siddha', HOM: 'Homeopathy',
}
const RELATION_LABEL: Record<string, string> = {
  FATHER: 'Father', MOTHER: 'Mother', SPOUSE: 'Spouse', SIBLING: 'Sibling',
  CHILD: 'Child', GRANDPARENT: 'Grandparent', OTHER: 'Other',
}

export default async function MyRecordsPage() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: patient } = await supabase
    .from('patient').select('id, first_name, last_name').eq('auth_user_id', user.id).single()
  if (!patient) redirect('/dashboard/patient')

  const [
    { data: consultations },
    { data: healthProfile },
    { data: testResults },
    { data: familyMembers },
  ] = await Promise.all([
    supabase
      .from('consultation')
      .select(`
        id, chief_complaint, diagnosis, notes, next_visit_date, created_at,
        doctor:doctor_id(first_name, last_name, ayush_specialization),
        prescription(medicines, instructions, is_repeat)
      `)
      .eq('patient_id', patient.id)
      .order('created_at', { ascending: false }),

    supabase
      .from('patient_health_profile')
      .select('*').eq('patient_id', patient.id).maybeSingle(),

    supabase
      .from('test_result')
      .select('id, file_url, file_name, file_type, notes, created_at, appointment_id')
      .eq('patient_id', patient.id)
      .order('created_at', { ascending: false }),

    supabase
      .from('patient_family')
      .select('id, relation_type, first_name, last_name, date_of_birth, known_conditions, allergies, notes, related_patient_id')
      .eq('patient_id', patient.id)
      .order('relation_type'),
  ])

  // Group test results by appointment_id
  const testResultsByAppt: Record<string, TestResultRow[]> = {}
  for (const r of (testResults ?? []) as (TestResultRow & { appointment_id: string })[]) {
    if (!testResultsByAppt[r.appointment_id]) testResultsByAppt[r.appointment_id] = []
    testResultsByAppt[r.appointment_id].push(r)
  }

  // Soonest upcoming next visit date
  const today = new Date().toISOString().split('T')[0]
  const allNextVisits = (consultations ?? [])
    .map(c => c.next_visit_date)
    .filter((d): d is string => !!d)
    .sort()
  const nextVisit = allNextVisits.find(d => d >= today) ?? null
  const daysUntilNext = nextVisit
    ? Math.round((new Date(nextVisit).getTime() - new Date(today).getTime()) / 86400000)
    : null

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/patient" className="text-gray-400 hover:text-gray-600 text-sm">← Dashboard</Link>
          <span className="font-semibold text-gray-900">My Health Records</span>
        </div>
        <a href="/api/records/export" className="text-sm text-green-700 border border-green-300 rounded px-3 py-1.5 hover:bg-green-50">
          ⬇ Download all
        </a>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-6">

        {/* ── Next Visit Banner ─────────────────────────── */}
        {nextVisit && (
          <div className={`rounded-xl p-4 border flex items-center justify-between ${
            daysUntilNext !== null && daysUntilNext < 0
              ? 'bg-red-50 border-red-200'
              : daysUntilNext !== null && daysUntilNext <= 7
              ? 'bg-orange-50 border-orange-200'
              : 'bg-green-50 border-green-200'
          }`}>
            <div>
              <p className={`font-semibold text-sm ${
                daysUntilNext !== null && daysUntilNext < 0 ? 'text-red-800' :
                daysUntilNext !== null && daysUntilNext <= 7 ? 'text-orange-800' : 'text-green-800'
              }`}>
                {daysUntilNext !== null && daysUntilNext < 0
                  ? `⚠️ Next visit overdue by ${Math.abs(daysUntilNext)} day${Math.abs(daysUntilNext) !== 1 ? 's' : ''}`
                  : daysUntilNext === 0
                  ? '🏥 Your next visit is today!'
                  : `📅 Next visit in ${daysUntilNext} day${daysUntilNext !== 1 ? 's' : ''}`}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {new Date(nextVisit).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <Link href="/appointments/book"
              className="text-sm font-semibold text-white bg-green-700 rounded-lg px-4 py-2 hover:bg-green-800 whitespace-nowrap">
              Book Now
            </Link>
          </div>
        )}

        {/* ── Health Profile ────────────────────────────── */}
        {healthProfile && (
          <div className="bg-white rounded-xl border p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Health Profile</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
              {healthProfile.known_conditions?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Known Conditions</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(healthProfile.known_conditions as string[]).map((c: string) => (
                      <span key={c} className="px-2.5 py-1 bg-red-50 text-red-700 rounded-full text-xs">{c}</span>
                    ))}
                  </div>
                </div>
              )}
              {healthProfile.allergies?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Allergies</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(healthProfile.allergies as string[]).map((a: string) => (
                      <span key={a} className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-xs">{a}</span>
                    ))}
                  </div>
                </div>
              )}
              {(healthProfile.current_medications as MedicineRow[] | null)?.length ? (
                <div className="col-span-full">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Current Medications</p>
                  <div className="space-y-1">
                    {(healthProfile.current_medications as MedicineRow[]).map(m => (
                      <p key={m.name} className="text-gray-700">{m.name} — {m.dosage}, {m.frequency}</p>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* ── Family History ────────────────────────────── */}
        {(familyMembers ?? []).length > 0 && (
          <div className="bg-white rounded-xl border p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Family History
              <span className="ml-2 text-xs font-normal text-gray-400">
                (critical for AYUSH diagnosis)
              </span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(familyMembers as FamilyRow[]).map(m => (
                <div key={m.id} className="border rounded-lg p-4 text-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-purple-100 text-purple-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                      {RELATION_LABEL[m.relation_type] ?? m.relation_type}
                    </span>
                    {m.first_name && (
                      <span className="font-medium text-gray-800">{m.first_name} {m.last_name ?? ''}</span>
                    )}
                    {m.related_patient_id && (
                      <span className="text-xs text-green-700 bg-green-50 px-1.5 py-0.5 rounded">Registered</span>
                    )}
                  </div>
                  {m.date_of_birth && (
                    <p className="text-gray-500 text-xs mb-1">DOB: {new Date(m.date_of_birth).toLocaleDateString('en-IN')}</p>
                  )}
                  {m.known_conditions?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-1">
                      {m.known_conditions.map(c => (
                        <span key={c} className="bg-red-50 text-red-700 text-xs px-2 py-0.5 rounded-full">{c}</span>
                      ))}
                    </div>
                  )}
                  {m.allergies?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-1">
                      {m.allergies.map(a => (
                        <span key={a} className="bg-amber-50 text-amber-700 text-xs px-2 py-0.5 rounded-full">⚠ {a}</span>
                      ))}
                    </div>
                  )}
                  {m.notes && <p className="text-gray-500 text-xs">{m.notes}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Consultation History ──────────────────────── */}
        <div>
          <h2 className="font-semibold text-gray-900 mb-4">
            Consultation History ({consultations?.length ?? 0})
          </h2>
          {!consultations || consultations.length === 0 ? (
            <div className="bg-white rounded-xl border p-6 text-center text-sm text-gray-400">No consultations yet.</div>
          ) : (
            <div className="space-y-4">
              {consultations.map(c => {
                const doc = c.doctor as unknown as DoctorRow | null
                const rx  = c.prescription as unknown as PrescriptionRow[] | null
                const attachedFiles = testResultsByAppt[c.id] ?? []
                const nvDate = c.next_visit_date
                const nvDays = nvDate
                  ? Math.round((new Date(nvDate).getTime() - new Date(today).getTime()) / 86400000)
                  : null

                return (
                  <div key={c.id} className="bg-white rounded-xl border p-5 space-y-4">
                    <div className="flex justify-between items-start flex-wrap gap-2">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {doc ? `Dr. ${doc.first_name} ${doc.last_name}` : 'Unknown Doctor'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {doc ? SPEC[doc.ayush_specialization] ?? doc.ayush_specialization : ''} ·{' '}
                          {new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                      {nvDate && (
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          nvDays !== null && nvDays < 0
                            ? 'bg-red-100 text-red-700'
                            : nvDays !== null && nvDays <= 7
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {nvDays !== null && nvDays < 0 ? `⚠ Overdue` : `Next: ${new Date(nvDate).toLocaleDateString('en-IN')}`}
                        </span>
                      )}
                    </div>

                    {c.chief_complaint && (
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Chief Complaint</p>
                        <p className="text-sm text-gray-700 mt-1">{c.chief_complaint}</p>
                      </div>
                    )}
                    {c.diagnosis && (
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Diagnosis</p>
                        <p className="text-sm text-gray-700 mt-1">{c.diagnosis}</p>
                      </div>
                    )}

                    {rx && rx.length > 0 && rx[0].medicines?.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Prescription</p>
                        <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
                          {rx[0].medicines.map((m, i) => (
                            <div key={i} className="flex justify-between text-sm">
                              <span className="font-medium text-gray-800">{m.name}</span>
                              <span className="text-gray-500">{m.dosage} · {m.frequency} · {m.duration}</span>
                            </div>
                          ))}
                          {rx[0].instructions && (
                            <p className="text-xs text-gray-500 border-t border-gray-200 pt-2 mt-2">{rx[0].instructions}</p>
                          )}
                          {rx[0].is_repeat && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Repeat prescription</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Attached Test Results */}
                    {attachedFiles.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">
                          Test Results / Reports ({attachedFiles.length})
                        </p>
                        <div className="space-y-1.5">
                          {attachedFiles.map(r => (
                            <a key={r.id} href={r.file_url} target="_blank" rel="noreferrer"
                              className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 rounded-lg px-3 py-2 text-sm transition-colors">
                              <span>{r.file_type === 'application/pdf' ? '📄' : '🖼️'}</span>
                              <span className="text-blue-700 flex-1 truncate">{r.file_name}</span>
                              {r.notes && <span className="text-blue-500 text-xs">{r.notes}</span>}
                              <span className="text-blue-400 text-xs">↗</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Book Again */}
                    {nvDate && doc && (
                      <Link href={`/appointments/book?doctor=${encodeURIComponent(`${doc.first_name} ${doc.last_name}`)}`}
                        className="inline-flex items-center gap-1.5 text-xs text-green-700 border border-green-300 rounded-lg px-3 py-1.5 hover:bg-green-50">
                        🔄 Book Again with Dr. {doc.first_name}
                      </Link>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
