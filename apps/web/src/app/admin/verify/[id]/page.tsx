import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import AdminVerifyActions from '@/components/admin/AdminVerifyActions'

const SPEC_LABELS: Record<string, string> = {
  AYU: 'Ayurveda', YOG: 'Yoga & Naturopathy',
  UNA: 'Unani', SID: 'Siddha', HOM: 'Homeopathy',
}

export default async function AdminVerifyDoctorPage({ params }: { params: { id: string } }) {
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

  let degreeCertUrl: string | null = null
  let regCertUrl: string | null = null

  if (doctor.degree_cert_url) {
    const { data } = await supabase.storage.from('doctor-docs').createSignedUrl(doctor.degree_cert_url, 3600)
    degreeCertUrl = data?.signedUrl ?? null
  }
  if (doctor.registration_cert_url) {
    const { data } = await supabase.storage.from('doctor-docs').createSignedUrl(doctor.registration_cert_url, 3600)
    regCertUrl = data?.signedUrl ?? null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-4 sm:px-6 py-4 flex items-center gap-3">
        <a href="/dashboard/admin" className="text-gray-400 hover:text-gray-600 text-sm">← Admin</a>
        <span className="font-semibold text-gray-900">Verify Doctor</span>
        <span className={`ml-auto text-xs font-medium px-2.5 py-1 rounded-full ${
          doctor.verification_status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
          doctor.verification_status === 'APPROVED' ? 'bg-green-100 text-green-700' :
          'bg-red-100 text-red-700'
        }`}>{doctor.verification_status}</span>
      </header>

      <main className="max-w-3xl mx-auto p-4 sm:p-6 space-y-4">
        {/* Doctor info */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">
            Dr. {doctor.first_name} {doctor.last_name}
          </h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              ['Specialization', SPEC_LABELS[doctor.ayush_specialization] ?? doctor.ayush_specialization],
              ['Experience', `${doctor.years_of_experience} years`],
              ['Email', doctor.email],
              ['Mobile', doctor.mobile],
              ['Reg. Number', doctor.registration_number],
              ['Council', doctor.registration_council],
              ['Applied', new Date(doctor.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })],
              ['Degrees', (doctor.degrees ?? []).join(', ')],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
                <p className="font-medium text-gray-800 mt-0.5 break-words">{value || '—'}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Documents */}
        <div className="card p-5 space-y-3">
          <h3 className="font-semibold text-gray-900 text-sm">Verification documents</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {degreeCertUrl ? (
              <a href={degreeCertUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 border border-gray-200 rounded-lg p-3 hover:border-brand-400 hover:bg-brand-50 transition-colors">
                <span className="text-2xl">📄</span>
                <div>
                  <p className="text-sm font-medium text-gray-800">Degree Certificate</p>
                  <p className="text-xs text-brand-600">Click to view →</p>
                </div>
              </a>
            ) : (
              <div className="flex items-center gap-3 border border-dashed border-gray-200 rounded-lg p-3 text-gray-400">
                <span className="text-2xl opacity-50">📄</span>
                <div>
                  <p className="text-sm">Degree Certificate</p>
                  <p className="text-xs">Not uploaded</p>
                </div>
              </div>
            )}
            {regCertUrl ? (
              <a href={regCertUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 border border-gray-200 rounded-lg p-3 hover:border-brand-400 hover:bg-brand-50 transition-colors">
                <span className="text-2xl">📋</span>
                <div>
                  <p className="text-sm font-medium text-gray-800">Registration Certificate</p>
                  <p className="text-xs text-brand-600">Click to view →</p>
                </div>
              </a>
            ) : (
              <div className="flex items-center gap-3 border border-dashed border-gray-200 rounded-lg p-3 text-gray-400">
                <span className="text-2xl opacity-50">📋</span>
                <div>
                  <p className="text-sm">Registration Certificate</p>
                  <p className="text-xs">Not uploaded</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Approve / Reject actions */}
        {doctor.verification_status === 'PENDING' && (
          <AdminVerifyActions doctorId={doctor.id} doctorName={`Dr. ${doctor.first_name} ${doctor.last_name}`} />
        )}

        {doctor.verification_status !== 'PENDING' && (
          <div className={`rounded-xl p-4 text-sm ${
            doctor.verification_status === 'APPROVED'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {doctor.verification_status === 'APPROVED'
              ? '✅ This doctor has been approved and can accept appointments.'
              : '❌ This doctor\'s application was rejected.'}
          </div>
        )}
      </main>
    </div>
  )
}
