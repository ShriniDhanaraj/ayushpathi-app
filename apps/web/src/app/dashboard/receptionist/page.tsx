import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export default async function ReceptionistDashboard() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">A</span>
          </div>
          <span className="font-semibold text-gray-900">Ayushpathi — Reception</span>
        </div>
      </header>
      <main className="max-w-4xl mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: 'Register New Patient', icon: '➕', href: '/patients/new' },
            { label: 'Book Appointment', icon: '📅', href: '/appointments/new' },
            { label: "Today's Schedule", icon: '🗓️', href: '/appointments/today' },
            { label: 'Attach Test Results', icon: '📎', href: '/results/upload' },
          ].map(item => (
            <a key={item.label} href={item.href}
              className="card p-5 hover:shadow-md transition-shadow flex items-center gap-4">
              <span className="text-3xl">{item.icon}</span>
              <span className="font-medium text-gray-900">{item.label}</span>
            </a>
          ))}
        </div>
      </main>
    </div>
  )
}
