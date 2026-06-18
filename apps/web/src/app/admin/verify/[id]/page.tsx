import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import DoctorVerifyActions from '@/components/admin/DoctorVerifyActions'

export default async function VerifyDoctorPage({ params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const role = user.user_metadata?.role
  if (role !== 'ayushpathi_admin' && role !== 'hospital_admin') redirect('/dashboard/patient')

  const { data: doctor } = await supabase
    .from('doctor')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!doctor) redirect('/dashboard/admin')

  // Get signed URLs for documents (valid 60 mins)
  const { data: degreeUrl } = doctor.degree_cert_url
    ? await supabase.storage.from('doctor-docs').createSignedUrl(doctor.degree_cert_url, 3600)
    : { data: null }
  const { data: regUrl } = doctor.registration_cert_url
    ? await supabase.storage.from('doctor-docs').createSignedUrl(doctor.registration_cert_url, 3600)
    : { data: null }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <a href="/dashboard/admin" className="text-gray-400 hover:text-gray-600 text-sm">← Back</a>
          <span className="font-semibold text-gray-900">Verify Doctor</span>
        </div>
      </header>
      <main className="max-w-3xl mx-auto p-6 space-y-6">
        {/* Doctor summary */}
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-lg text-gray-900">
            Dr. {doctor.first_name} {doctor.last_name}
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              ['Specialization', doctor.ayush_specialization],
              ['Degrees', (doctor.degrees ?? []).join(', ')],
              ['Registration No.', doctor.registration_number],
              ['Council', doctor.registration_council],
              ['Experience', `${doctor.years_of_experience ?? '—'} years`],
              ['Mobile', doctor.mobile],
              ['Email', doctor.email],
              ['Registered on', new Date(doctor.created_at).toLocaleDateString('en-IN')],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-gray-500">{label}</p>
                <p className="text-gray-900 font-medium mt-0.5">{value || '—'}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Documents */}
        <div className="card p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">Verification Documents</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Degree Certificate</p>
              {degreeUrl?.signedUrl
                ? <a href={degreeUrl.signedUrl} target="_blank" rel="noreferrer"
                    className="text-brand-600 text-sm underline">View document ↗</a>
                : <p className="text-sm text-red-500">Not uploaded</p>
              }
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Registration Certificate</p>
              {regUrl?.signedUrl
                ? <a href={regUrl.signedUrl} target="_blank" rel="noreferrer"
                    className="text-brand-600 text-sm underline">View document ↗</a>
                : <p className="text-sm text-red-500">Not uploaded</p>
              }
            </div>
          </div>
        </div>

        {/* Approve / Reject actions */}
        <DoctorVerifyActions doctorId={doctor.id} adminId={user.id} />
      </main>
    </div>
  )
}
