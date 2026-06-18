import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export default async function MyRecordsPage() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: patient } = await supabase
    .from('patient').select('id, first_name, last_name').eq('auth_user_id', user.id).single()
  if (!patient) redirect('/dashboard/patient')

  const { data: consultations } = await supabase
    .from('consultation')
    .select(`
      id, chief_complaint, diagnosis, notes, next_visit_date, created_at,
      doctor:doctor_id(first_name, last_name, ayush_specialization),
      prescription(medicines, instructions, is_repeat)
    `)
    .eq('patient_id', patient.id)
    .order('created_at', { ascending: false })

  const { data: healthProfile } = await supabase
    .from('patient_health_profile')
    .select('*').eq('patient_id', patient.id).single()

  const SPEC_LABELS: Record<string, string> = {
    AYU: 'Ayurveda', YOG: 'Yoga & Naturopathy',
    UNA: 'Unani', SID: 'Siddha', HOM: 'Homeopathy',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/dashboard/patient" className="text-gray-400 hover:text-gray-600 text-sm">← Dashboard</a>
          <span className="font-semibold text-gray-900">My Health Records</span>
        </div>
        <a href="/api/records/export" className="btn-secondary text-sm">⬇ Download all</a>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Health Profile Summary */}
        {healthProfile && (
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Health Profile</h2>
            <div className="grid grid-cols-2 gap-6 text-sm">
              {healthProfile.known_conditions?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Known Conditions</p>
                  <div className="flex flex-wrap gap-1.5">
                    {healthProfile.known_conditions.map((c: string) => (
                      <span key={c} className="px-2.5 py-1 bg-red-50 text-red-700 rounded-full text-xs">{c}</span>
                    ))}
                  </div>
                </div>
              )}
              {healthProfile.allergies?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Allergies</p>
                  <div className="flex flex-wrap gap-1.5">
                    {healthProfile.allergies.map((a: string) => (
                      <span key={a} className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-xs">{a}</span>
                    ))}
                  </div>
                </div>
              )}
              {healthProfile.current_medications?.length > 0 && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Current Medications</p>
                  <div className="space-y-1">
                    {healthProfile.current_medications.map((m: { name: string; dosage: string; frequency: string }) => (
                      <p key={m.name} className="text-gray-700">{m.name} — {m.dosage}, {m.frequency}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Consultation History */}
        <div>
          <h2 className="font-semibold text-gray-900 mb-4">
            Consultation History ({consultations?.length ?? 0})
          </h2>
          {!consultations || consultations.length === 0 ? (
            <div className="card p-6 text-center text-sm text-gray-400">No consultations yet.</div>
          ) : (
            <div className="space-y-4">
              {consultations.map(c => {
                const doc = c.doctor as { first_name: string; last_name: string; ayush_specialization: string } | null
                const rx = c.prescription as { medicines: Array<{ name: string; dosage: string; frequency: string; duration: string }>; instructions?: string; is_repeat: boolean }[] | null
                return (
                  <div key={c.id} className="card p-5 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {doc ? `Dr. ${doc.first_name} ${doc.last_name}` : 'Unknown Doctor'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {doc ? SPEC_LABELS[doc.ayush_specialization] : ''} ·{' '}
                          {new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                      {c.next_visit_date && (
                        <span className="text-xs bg-brand-100 text-brand-700 px-2.5 py-1 rounded-full">
                          Next visit: {new Date(c.next_visit_date).toLocaleDateString('en-IN')}
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
                            <p className="text-xs text-gray-500 border-t border-gray-200 pt-2 mt-2">
                              {rx[0].instructions}
                            </p>
                          )}
                          {rx[0].is_repeat && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Repeat prescription</span>
                          )}
                        </div>
                      </div>
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
