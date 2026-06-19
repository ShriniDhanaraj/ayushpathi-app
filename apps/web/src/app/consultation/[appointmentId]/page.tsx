import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import ConsultationForm from '@/components/appointments/ConsultationForm'

export default async function ConsultationPage({ params }: { params: { appointmentId: string } }) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const role = user.user_metadata?.role
  if (role !== 'doctor') redirect('/dashboard/patient')

  // Load appointment + patient (only if consent is ACTIVE)
  const { data: appt } = await supabase
    .from('appointment')
    .select(`
      *,
      patient:patient_id(id, first_name, last_name, date_of_birth, gender),
      doctor:doctor_id(id, first_name, last_name)
    `)
    .eq('id', params.appointmentId)
    .single()

  if (!appt) redirect('/dashboard/doctor')

  // Verify active consent
  const { data: consent } = await supabase
    .from('patient_doctor_consent')
    .select('status, share_full_history')
    .eq('patient_id', appt.patient_id)
    .eq('doctor_id', appt.doctor_id)
    .eq('status', 'ACTIVE')
    .single()

  if (!consent) {
    redirect('/dashboard/doctor?error=no-consent')
  }

  // Load health profile if consent grants full history
  const healthProfile = consent.share_full_history
    ? await supabase.from('patient_health_profile').select('*').eq('patient_id', appt.patient_id).single().then(r => r.data)
    : null

  // Load previous consultations (if full history granted)
  const previousConsultations = consent.share_full_history
    ? await supabase.from('consultation').select('*, prescription(*)').eq('patient_id', appt.patient_id).order('created_at', { ascending: false }).limit(5).then(r => r.data)
    : null

  // Load family history (always shown when consent active — critical for AYUSH diagnosis)
  const { data: familyMembers } = await supabase
    .from('patient_family')
    .select('id, relation_type, first_name, last_name, known_conditions, allergies, notes')
    .eq('patient_id', appt.patient_id)
    .order('relation_type')

  const RELATION_LABEL: Record<string, string> = {
    FATHER:'Father', MOTHER:'Mother', SPOUSE:'Spouse', SIBLING:'Sibling',
    CHILD:'Child', GRANDPARENT:'Grandparent', OTHER:'Other',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/dashboard/doctor" className="text-gray-400 hover:text-gray-600 text-sm">← Dashboard</a>
          <span className="font-semibold text-gray-900">Consultation</span>
        </div>
        <span className="text-sm text-gray-500">
          {appt.patient?.first_name} {appt.patient?.last_name}
        </span>
      </header>

      <main className="max-w-5xl mx-auto p-6 grid grid-cols-3 gap-6">
        {/* Left: Patient info */}
        <div className="col-span-1 space-y-4">
          <div className="card p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Patient</h3>
            <div className="space-y-2 text-sm">
              <p className="font-medium">{appt.patient?.first_name} {appt.patient?.last_name}</p>
              {appt.patient?.date_of_birth && (
                <p className="text-gray-500">
                  Age: {Math.floor((Date.now() - new Date(appt.patient.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} yrs
                </p>
              )}
              <p className="text-gray-500">Gender: {appt.patient?.gender}</p>
            </div>
          </div>

          {healthProfile && (
            <div className="card p-4 space-y-3 text-sm">
              <h3 className="font-semibold text-gray-900">Health Profile</h3>
              {healthProfile.known_conditions?.length > 0 && (
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Known Conditions</p>
                  <div className="flex flex-wrap gap-1">
                    {healthProfile.known_conditions.map((c: string) => (
                      <span key={c} className="px-2 py-0.5 bg-red-50 text-red-700 text-xs rounded-full">{c}</span>
                    ))}
                  </div>
                </div>
              )}
              {healthProfile.allergies?.length > 0 && (
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Allergies</p>
                  <div className="flex flex-wrap gap-1">
                    {healthProfile.allergies.map((a: string) => (
                      <span key={a} className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs rounded-full">{a}</span>
                    ))}
                  </div>
                </div>
              )}
              {healthProfile.current_medications?.length > 0 && (
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Current Medications</p>
                  {healthProfile.current_medications.map((m: { name: string; dosage: string }) => (
                    <p key={m.name} className="text-gray-700">{m.name} — {m.dosage}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {previousConsultations && previousConsultations.length > 0 && (
            <div className="card p-4 text-sm">
              <h3 className="font-semibold text-gray-900 mb-3">Previous Visits</h3>
              {previousConsultations.map((c: { id: string; created_at: string; diagnosis?: string }) => (
                <div key={c.id} className="border-l-2 border-brand-200 pl-3 mb-3">
                  <p className="text-xs text-gray-400">{new Date(c.created_at).toLocaleDateString('en-IN')}</p>
                  <p className="text-gray-700">{c.diagnosis ?? 'No diagnosis recorded'}</p>
                </div>
              ))}
            </div>
          )}
          {/* Family History Panel */}
          {familyMembers && familyMembers.length > 0 && (
            <div className="card p-4 text-sm">
              <h3 className="font-semibold text-gray-900 mb-3">
                👨‍👩‍👧 Family History
                <span className="ml-1 text-xs font-normal text-gray-400">({familyMembers.length})</span>
              </h3>
              <div className="space-y-3">
                {familyMembers.map((m: {
                  id: string; relation_type: string; first_name: string | null; last_name: string | null
                  known_conditions: string[]; allergies: string[]; notes: string | null
                }) => (
                  <div key={m.id} className="border-l-2 border-purple-200 pl-3">
                    <p className="font-medium text-gray-800 text-xs">
                      {RELATION_LABEL[m.relation_type] ?? m.relation_type}
                      {m.first_name ? ` — ${m.first_name} ${m.last_name ?? ''}` : ''}
                    </p>
                    {m.known_conditions?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {m.known_conditions.map((c: string) => (
                          <span key={c} className="px-1.5 py-0.5 bg-red-50 text-red-600 text-xs rounded-full">{c}</span>
                        ))}
                      </div>
                    )}
                    {m.allergies?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {m.allergies.map((a: string) => (
                          <span key={a} className="px-1.5 py-0.5 bg-amber-50 text-amber-700 text-xs rounded-full">⚠ {a}</span>
                        ))}
                      </div>
                    )}
                    {m.notes && <p className="text-gray-400 text-xs mt-0.5">{m.notes}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Consultation form */}
        <div className="col-span-2">
          <ConsultationForm
            appointmentId={params.appointmentId}
            patientId={appt.patient_id}
            doctorId={appt.doctor_id}
          />
        </div>
      </main>
    </div>
  )
}
