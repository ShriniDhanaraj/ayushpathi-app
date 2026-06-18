import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import ConsentManager from '@/components/consent/ConsentManager'

export default async function MyDoctorsPage() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: patient } = await supabase
    .from('patient').select('id').eq('auth_user_id', user.id).single()
  if (!patient) redirect('/dashboard/patient')

  // Load all consent relationships (active + revoked)
  const { data: consents } = await supabase
    .from('patient_doctor_consent')
    .select(`
      id, status, share_full_history, consented_at, revoked_at,
      doctor:doctor_id(id, first_name, last_name, ayush_specialization, mobile, profile_photo_url)
    `)
    .eq('patient_id', patient.id)
    .order('consented_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-3">
        <a href="/dashboard/patient" className="text-gray-400 hover:text-gray-600 text-sm">← Dashboard</a>
        <span className="font-semibold text-gray-900">My Doctors</span>
      </header>
      <main className="max-w-3xl mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="font-semibold text-gray-900">Your doctor relationships</h2>
            <p className="text-sm text-gray-500 mt-0.5">You control who can access your health data.</p>
          </div>
          <a href="/appointments/new" className="btn-primary text-sm">+ Find a Doctor</a>
        </div>

        {(!consents || consents.length === 0) && (
          <div className="card p-8 text-center">
            <p className="text-gray-400 text-sm">No doctor relationships yet.</p>
            <a href="/appointments/new" className="text-brand-600 text-sm font-medium mt-2 inline-block hover:underline">
              Book your first appointment →
            </a>
          </div>
        )}

        {consents && consents.length > 0 && (
          <div className="space-y-3">
            {consents.map(c => (
              <ConsentManager key={c.id} consent={c} patientId={patient.id} />
            ))}
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
          <strong>Your data, your control.</strong> Revoking access is immediate — the doctor loses visibility of your records instantly. You can re-consent at any time.
        </div>
      </main>
    </div>
  )
}
