import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

const SPEC_LABELS: Record<string, string> = {
  AYU: 'Ayurveda', YOG: 'Yoga & Naturopathy',
  UNA: 'Unani', SID: 'Siddha', HOM: 'Homeopathy',
}

const RELATION_LABEL: Record<string, string> = {
  FATHER: 'Father', MOTHER: 'Mother', SPOUSE: 'Spouse',
  SIBLING: 'Sibling', CHILD: 'Child', GRANDPARENT: 'Grandparent', OTHER: 'Other',
}

interface ConsultationRow {
  id: string
  created_at: string
  diagnosis: string | null
  next_visit_date: string | null
  chief_complaint: string | null
  entry_method: string
  prescription: Array<{
    id: string
    medicine_name: string
    dosage: string | null
    frequency: string | null
    duration_days: number | null
    instructions: string | null
    verified_by_doctor: boolean
  }>
}

interface FamilyMember {
  id: string
  relation_type: string
  first_name: string | null
  last_name: string | null
  known_conditions: string[]
  allergies: string[]
}

export default async function PatientDetailPage({ params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const role = user.user_metadata?.role
  if (role !== 'doctor') redirect('/dashboard/patient')

  // Get doctor ID
  const { data: doctor } = await supabase
    .from('doctor')
    .select('id, first_name, last_name, ayush_specialization')
    .eq('auth_user_id', user.id)
    .single()

  if (!doctor) redirect('/dashboard/patient')

  // Verify ACTIVE consent exists for this patient-doctor pair
  const { data: consent } = await supabase
    .from('patient_doctor_consent')
    .select('status, share_full_history, consent_date')
    .eq('doctor_id', doctor.id)
    .eq('patient_id', params.id)
    .eq('status', 'ACTIVE')
    .maybeSingle()

  if (!consent) {
    // No active consent — show access denied
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b px-6 py-4 flex items-center gap-3">
          <a href="/patients" className="text-gray-400 hover:text-gray-600 text-sm">← Patients</a>
          <span className="font-semibold text-gray-900">Patient Record</span>
        </header>
        <main className="max-w-lg mx-auto p-10 text-center">
          <p className="text-3xl mb-4">🔒</p>
          <h2 className="font-semibold text-gray-900 mb-2">Access not permitted</h2>
          <p className="text-sm text-gray-500">
            This patient has not granted you active consent to view their records.
            Ask the patient to give consent during their next appointment.
          </p>
          <a href="/patients" className="inline-block mt-6 text-sm text-brand-600 hover:underline">← Back to patients</a>
        </main>
      </div>
    )
  }

  // Load patient profile
  const { data: patient } = await supabase
    .from('patient')
    .select('id, first_name, last_name, date_of_birth, gender, mobile, email, known_languages, ui_language')
    .eq('id', params.id)
    .maybeSingle()

  if (!patient) redirect('/patients')

  const patientAge = patient.date_of_birth
    ? Math.floor((Date.now() - new Date(patient.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null

  // Health profile (only if full history consent)
  const healthProfile = consent.share_full_history
    ? await supabase
        .from('patient_health_profile')
        .select('known_conditions, allergies, blood_group, current_medications')
        .eq('patient_id', patient.id)
        .maybeSingle()
        .then(r => r.data)
    : null

  // Consultation history (all this doctor's, or full if consented)
  const consultQuery = consent.share_full_history
    ? supabase.from('consultation')
        .select('id, created_at, diagnosis, next_visit_date, chief_complaint, entry_method, prescription(id, medicine_name, dosage, frequency, duration_days, instructions, verified_by_doctor)')
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: false })
        .limit(20)
    : supabase.from('consultation')
        .select('id, created_at, diagnosis, next_visit_date, chief_complaint, entry_method, prescription(id, medicine_name, dosage, frequency, duration_days, instructions, verified_by_doctor)')
        .eq('patient_id', patient.id)
        .eq('doctor_id', doctor.id)
        .order('created_at', { ascending: false })
        .limit(20)

  const { data: consultations } = await consultQuery

  // Family history
  const { data: family } = await supabase
    .from('patient_family')
    .select('id, relation_type, first_name, last_name, known_conditions, allergies')
    .eq('patient_id', patient.id)
    .order('relation_type')

  const familyMembers: FamilyMember[] = (family ?? []) as FamilyMember[]
  const consultRows: ConsultationRow[] = (consultations ?? []).map((c: ConsultationRow) => ({
    ...c,
    prescription: Array.isArray(c.prescription) ? c.prescription : [],
  }))

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/patients" className="text-gray-400 hover:text-gray-600 text-sm">← Patients</a>
          <span className="font-semibold text-gray-900">
            {patient.first_name} {patient.last_name}
          </span>
          {consent.share_full_history && (
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Full history</span>
          )}
        </div>
        <span className="text-sm text-gray-400">
          Dr. {doctor.first_name} {doctor.last_name} · {SPEC_LABELS[doctor.ayush_specialization] ?? ''}
        </span>
      </header>

      <main className="max-w-5xl mx-auto p-6 grid grid-cols-3 gap-6">
        {/* Left: Patient summary */}
        <div className="col-span-1 space-y-4">
          {/* Basic info */}
          <div className="card p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center">
                <span className="font-bold text-brand-700 text-lg">
                  {patient.first_name[0]}{patient.last_name[0]}
                </span>
              </div>
              <div>
                <p className="font-semibold text-gray-900">{patient.first_name} {patient.last_name}</p>
                {patientAge !== null && (
                  <p className="text-xs text-gray-500">{patientAge}y · {patient.gender ?? '—'}</p>
                )}
              </div>
            </div>
            <div className="space-y-1.5 text-sm">
              {patient.mobile && <p className="text-gray-600">📱 {patient.mobile}</p>}
              {patient.email  && <p className="text-gray-600 text-xs">✉ {patient.email}</p>}
              {patient.date_of_birth && (
                <p className="text-gray-500 text-xs">
                  Born: {new Date(patient.date_of_birth).toLocaleDateString('en-IN')}
                </p>
              )}
            </div>
            <div className="mt-3 pt-3 border-t text-xs text-gray-400">
              Consent since {new Date(consent.consent_date).toLocaleDateString('en-IN')}
            </div>
          </div>

          {/* Health profile */}
          {healthProfile && (
            <div className="card p-4 space-y-3 text-sm">
              <h3 className="font-semibold text-gray-900">Health Profile</h3>
              {healthProfile.blood_group && (
                <p className="text-gray-600">🩸 Blood group: <strong>{healthProfile.blood_group}</strong></p>
              )}
              {(healthProfile.known_conditions ?? []).length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Conditions</p>
                  <div className="flex flex-wrap gap-1">
                    {(healthProfile.known_conditions ?? []).map((c: string) => (
                      <span key={c} className="px-2 py-0.5 bg-red-50 text-red-700 text-xs rounded-full">{c}</span>
                    ))}
                  </div>
                </div>
              )}
              {(healthProfile.allergies ?? []).length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Allergies</p>
                  <div className="flex flex-wrap gap-1">
                    {(healthProfile.allergies ?? []).map((a: string) => (
                      <span key={a} className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs rounded-full">⚠ {a}</span>
                    ))}
                  </div>
                </div>
              )}
              {(healthProfile.current_medications ?? []).length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Current Medications</p>
                  {(healthProfile.current_medications as Array<{ name: string; dosage: string }>).map(m => (
                    <p key={m.name} className="text-gray-700 text-xs">{m.name} — {m.dosage}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Family history */}
          {familyMembers.length > 0 && (
            <div className="card p-4 text-sm">
              <h3 className="font-semibold text-gray-900 mb-3">Family History ({familyMembers.length})</h3>
              <div className="space-y-3">
                {familyMembers.map(m => (
                  <div key={m.id} className="border-l-2 border-purple-200 pl-3">
                    <p className="text-xs font-medium text-gray-700">
                      {RELATION_LABEL[m.relation_type] ?? m.relation_type}
                      {m.first_name ? ` — ${m.first_name} ${m.last_name ?? ''}` : ''}
                    </p>
                    {m.known_conditions?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {m.known_conditions.map(c => (
                          <span key={c} className="text-xs px-1.5 py-0.5 bg-red-50 text-red-600 rounded-full">{c}</span>
                        ))}
                      </div>
                    )}
                    {m.allergies?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {m.allergies.map(a => (
                          <span key={a} className="text-xs px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded-full">⚠ {a}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Consultation history */}
        <div className="col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">
              Consultation History
              {!consent.share_full_history && (
                <span className="ml-2 text-xs font-normal text-gray-400">(your consultations only)</span>
              )}
            </h2>
            <span className="text-sm text-gray-400">{consultRows.length} record{consultRows.length !== 1 ? 's' : ''}</span>
          </div>

          {consultRows.length === 0 ? (
            <div className="card p-8 text-center text-sm text-gray-400">
              No consultations recorded yet.
            </div>
          ) : (
            <div className="space-y-3">
              {consultRows.map(c => (
                <div key={c.id} className="card p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-gray-400">
                        {new Date(c.created_at).toLocaleDateString('en-IN', {
                          weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </p>
                      {c.chief_complaint && (
                        <p className="text-sm font-medium text-gray-800 mt-1">
                          Chief complaint: {c.chief_complaint}
                        </p>
                      )}
                    </div>
                    {c.next_visit_date && (
                      <span className="text-xs bg-brand-50 text-brand-700 px-2 py-1 rounded-full whitespace-nowrap">
                        Next: {new Date(c.next_visit_date).toLocaleDateString('en-IN')}
                      </span>
                    )}
                  </div>

                  {c.diagnosis && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Diagnosis</p>
                      <p className="text-sm text-gray-800">{c.diagnosis}</p>
                    </div>
                  )}

                  {c.prescription.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                        Prescription ({c.prescription.length} item{c.prescription.length !== 1 ? 's' : ''})
                      </p>
                      <div className="space-y-2">
                        {c.prescription.map(rx => (
                          <div key={rx.id} className="flex items-start gap-3 bg-gray-50 rounded-lg px-3 py-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">{rx.medicine_name}</p>
                              <div className="flex flex-wrap items-center gap-x-2 text-xs text-gray-500 mt-0.5">
                                {rx.dosage    && <span>{rx.dosage}</span>}
                                {rx.frequency && <span>· {rx.frequency}</span>}
                                {rx.duration_days && <span>· {rx.duration_days} days</span>}
                              </div>
                              {rx.instructions && (
                                <p className="text-xs text-gray-400 mt-0.5">{rx.instructions}</p>
                              )}
                            </div>
                            {rx.verified_by_doctor && (
                              <span className="text-xs text-green-600 flex-shrink-0">✓ Verified</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
