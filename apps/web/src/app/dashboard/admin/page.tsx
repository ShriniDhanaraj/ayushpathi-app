import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export default async function AdminDashboard() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: pending } = await supabase
    .from('doctor')
    .select('id, first_name, last_name, ayush_specialization, registration_number, created_at')
    .eq('verification_status', 'PENDING')
    .order('created_at', { ascending: true })

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">A</span>
          </div>
          <span className="font-semibold text-gray-900">Ayushpathi Admin</span>
        </div>
      </header>
      <main className="max-w-5xl mx-auto p-6 space-y-6">
        <div>
          <h2 className="font-semibold text-gray-900 mb-4">
            Pending Doctor Verifications ({pending?.length ?? 0})
          </h2>
          {pending && pending.length > 0 ? (
            <div className="space-y-3">
              {pending.map(doc => (
                <div key={doc.id} className="card p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Dr. {doc.first_name} {doc.last_name}</p>
                    <p className="text-sm text-gray-500">{doc.ayush_specialization} · Reg: {doc.registration_number}</p>
                  </div>
                  <div className="flex gap-2">
                    <a href={`/admin/verify/${doc.id}`}
                      className="btn-primary text-sm px-3 py-1.5">Review</a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 card p-4">No pending verifications.</p>
          )}
        </div>
      </main>
    </div>
  )
}
