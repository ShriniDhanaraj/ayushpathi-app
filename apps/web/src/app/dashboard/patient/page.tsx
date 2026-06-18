import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export default async function PatientDashboard() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: patient } = await supabase
    .from('patient')
    .select('*, address(*)')
    .eq('auth_user_id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">A</span>
          </div>
          <span className="font-semibold text-gray-900">Ayushpathi</span>
        </div>
        <span className="text-sm text-gray-500">
          Welcome, {patient?.first_name ?? 'Patient'}
        </span>
      </header>
      <main className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Book Appointment', icon: '📅', href: '/appointments/new', color: 'brand' },
            { label: 'My Health Records', icon: '🩺', href: '/records', color: 'blue' },
            { label: 'My Doctors', icon: '👨‍⚕️', href: '/doctors', color: 'purple' },
          ].map(item => (
            <a key={item.label} href={item.href}
              className="card p-5 hover:shadow-md transition-shadow flex items-center gap-4">
              <span className="text-3xl">{item.icon}</span>
              <span className="font-medium text-gray-900">{item.label}</span>
            </a>
          ))}
        </div>
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-1">Upcoming Appointments</h2>
          <p className="text-sm text-gray-400">No upcoming appointments. Book one above.</p>
        </div>
      </main>
    </div>
  )
}
