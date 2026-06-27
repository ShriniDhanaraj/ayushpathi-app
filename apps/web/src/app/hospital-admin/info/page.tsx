import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { redirect } from 'next/navigation'

const SPEC_LABELS: Record<string, string> = {
  AYU: 'Ayurveda', YOG: 'Yoga & Naturopathy',
  UNA: 'Unani', SID: 'Siddha', HOM: 'Homeopathy',
}

interface HospitalRow {
  id: string
  name: string
  registration_no: string | null
  phone: string | null
  email: string | null
  website: string | null
  ayush_specializations: string[] | null
  active: boolean
  latitude: number | null
  longitude: number | null
  address: {
    door_number: string | null
    street: string | null
    area: string | null
    city: string
    district: string | null
    state: string
    pincode: string | null
  } | null
  hospital_group: { id: string; name: string } | null
  whatsapp_number: string | null
}

export default async function HospitalInfoPage() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = getSupabaseAdmin()

  const { data: adminRow } = await admin
    .from('hospital_admin')
    .select('scope, hospital_id, hospital_group_id, first_name, last_name')
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (!adminRow) redirect('/auth/login')

  // Determine hospital(s) to show
  let hospitals: HospitalRow[] = []

  if (adminRow.scope === 'GLOBAL') {
    const { data } = await admin
      .from('hospital')
      .select(`
        id, name, registration_no, phone, email, website,
        ayush_specializations, active, latitude, longitude, whatsapp_number,
        address(*),
        hospital_group:hospital_group_id(id, name)
      `)
      .order('name')
    hospitals = (data ?? []) as unknown as HospitalRow[]
  } else if (adminRow.scope === 'GROUP' && adminRow.hospital_group_id) {
    const { data } = await admin
      .from('hospital')
      .select(`
        id, name, registration_no, phone, email, website,
        ayush_specializations, active, latitude, longitude, whatsapp_number,
        address(*),
        hospital_group:hospital_group_id(id, name)
      `)
      .eq('hospital_group_id', adminRow.hospital_group_id)
      .order('name')
    hospitals = (data ?? []) as unknown as HospitalRow[]
  } else if (adminRow.hospital_id) {
    const { data } = await admin
      .from('hospital')
      .select(`
        id, name, registration_no, phone, email, website,
        ayush_specializations, active, latitude, longitude, whatsapp_number,
        address(*),
        hospital_group:hospital_group_id(id, name)
      `)
      .eq('id', adminRow.hospital_id)
      .maybeSingle()
    if (data) hospitals = [data as unknown as HospitalRow]
  }

  function HospitalCard({ h }: { h: HospitalRow }) {
    const addr = Array.isArray(h.address) ? h.address[0] : h.address
    const group = Array.isArray(h.hospital_group) ? h.hospital_group[0] : h.hospital_group

    const addressStr = addr
      ? [addr.door_number, addr.street, addr.area, addr.city, addr.district, addr.state, addr.pincode]
          .filter(Boolean).join(', ')
      : null

    return (
      <div className="card p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">{h.name}</h2>
            {group && (
              <p className="text-xs text-gray-400 mt-0.5">
                Group: {(group as { name: string }).name}
              </p>
            )}
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
            h.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
          }`}>
            {h.active ? 'Active' : 'Inactive'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          {h.registration_no && (
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Registration No.</p>
              <p className="font-medium text-gray-900">{h.registration_no}</p>
            </div>
          )}
          {h.phone && (
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Phone</p>
              <p className="text-gray-800">{h.phone}</p>
            </div>
          )}
          {h.email && (
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Email</p>
              <p className="text-gray-800">{h.email}</p>
            </div>
          )}
          {h.website && (
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Website</p>
              <a href={h.website} target="_blank" rel="noopener noreferrer"
                className="text-brand-600 hover:underline">{h.website}</a>
            </div>
          )}
          {h.whatsapp_number && (
            <div>
              <p className="text-xs text-gray-500 mb-0.5">WhatsApp</p>
              <a href={`https://wa.me/${h.whatsapp_number}`} target="_blank" rel="noopener noreferrer"
                className="text-green-700 hover:underline">+{h.whatsapp_number}</a>
            </div>
          )}
        </div>

        {addressStr && (
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Address</p>
            <p className="text-sm text-gray-800">📍 {addressStr}</p>
          </div>
        )}

        {h.ayush_specializations && h.ayush_specializations.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-2">AYUSH Specializations</p>
            <div className="flex flex-wrap gap-2">
              {h.ayush_specializations.map(s => (
                <span key={s} className="px-3 py-1 bg-brand-50 text-brand-700 text-xs font-medium rounded-full">
                  {SPEC_LABELS[s] ?? s}
                </span>
              ))}
            </div>
          </div>
        )}

        {(h.latitude || h.longitude) && (
          <div className="pt-1">
            <a
              href={`https://maps.google.com/?q=${h.latitude},${h.longitude}`}
              target="_blank" rel="noopener noreferrer"
              className="text-xs text-brand-600 hover:underline"
            >
              View on Google Maps →
            </a>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-3">
        <a href="/dashboard/admin" className="text-gray-400 hover:text-gray-600 text-sm">← Dashboard</a>
        <span className="font-semibold text-gray-900">
          Hospital Information
          {hospitals.length > 1 ? ` (${hospitals.length})` : ''}
        </span>
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-5">
        {hospitals.length === 0 ? (
          <div className="card p-8 text-center text-sm text-gray-400">
            No hospital information found.
          </div>
        ) : (
          hospitals.map(h => <HospitalCard key={h.id} h={h} />)
        )}
      </main>
    </div>
  )
}
