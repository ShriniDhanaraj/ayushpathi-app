import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export default async function DoctorDashboard() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: doctor } = await supabase
    .from('doctor')
    .select('*')
    .eq('auth_user_id', user.id)
    .single()

  const isPending = doctor?.verification_status === 'PENDING'

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
          Dr. {doctor?.first_name} {doctor?.last_name}
        </span>
      </header>
      <main className="max-w-4xl mx-auto p-6">
        {isPending && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6">
            <h3 className="font-semibold text-amber-900">Account under review</h3>
            <p className="text-sm text-amber-700 mt-1">
              Your credentials are being verified by the Ayushpathi Admin team.
              You will receive a WhatsApp notification once approved. This typically takes 1–2 business days.
            </p>
          </div>
        )}
        {!isPending && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: "Today's Appointments", icon: '📅', href: '/appointments' },
              { label: 'My Patients', icon: '👥', href: '/patients' },
              { label: 'Set Availability', icon: '🕐', href: '/availability' },
            ].map(item => (
              <a key={item.label} href={item.href}
                className="card p-5 hover:shadow-md transition-shadow flex items-center gap-4">
                <span className="text-3xl">{item.icon}</span>
                <span className="font-medium text-gray-900">{item.label}</span>
              </a>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
