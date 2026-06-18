'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'

const INDIA_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal','Delhi','Jammu & Kashmir','Ladakh','Puducherry',
]

export default function HospitalRegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    name: '', registration_no: '', phone: '', email: '', website: '',
    door_number: '', street: '', area: '', city: '', district: '', state: '', pincode: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const supabase = getSupabaseClient()

    const { data: addr, error: addrErr } = await supabase.from('address').insert({
      door_number: form.door_number, street: form.street, area: form.area,
      city: form.city, district: form.district, state: form.state,
      pincode: form.pincode, country: 'India',
    }).select().single()
    if (addrErr) { setError(addrErr.message); setLoading(false); return }

    const { error: hospErr } = await supabase.from('hospital').insert({
      name: form.name, registration_no: form.registration_no,
      phone: form.phone, email: form.email, website: form.website,
      address_id: addr.id,
    })
    if (hospErr) { setError(hospErr.message); setLoading(false); return }

    router.push('/dashboard/admin?hospital=added')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <a href="/dashboard/admin" className="text-gray-400 hover:text-gray-600 text-sm">← Admin</a>
          <span className="font-semibold text-gray-900">Register Hospital / Clinic</span>
        </div>
      </header>
      <main className="max-w-2xl mx-auto p-6">
        <form onSubmit={handleSubmit} className="card p-8 space-y-5">
          <h2 className="text-xl font-semibold text-gray-900">Hospital / Clinic details</h2>
          <div>
            <label className="label">Hospital / Clinic name</label>
            <input className="input" placeholder="Ayurveda Health Centre" required
              value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Registration number</label>
              <input className="input" placeholder="HOSP-TN-12345"
                value={form.registration_no} onChange={e => set('registration_no', e.target.value)} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" placeholder="044-12345678"
                value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" placeholder="clinic@example.com"
                value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div>
              <label className="label">Website (optional)</label>
              <input className="input" placeholder="https://..."
                value={form.website} onChange={e => set('website', e.target.value)} />
            </div>
          </div>
          <hr className="border-gray-200" />
          <h3 className="font-medium text-gray-800">Address</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Door / Building no.</label>
              <input className="input" value={form.door_number} onChange={e => set('door_number', e.target.value)} />
            </div>
            <div>
              <label className="label">Street</label>
              <input className="input" value={form.street} onChange={e => set('street', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Area / Locality</label>
            <input className="input" value={form.area} onChange={e => set('area', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">City</label>
              <input className="input" required value={form.city} onChange={e => set('city', e.target.value)} />
            </div>
            <div>
              <label className="label">District</label>
              <input className="input" value={form.district} onChange={e => set('district', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">State</label>
              <select className="input" required value={form.state} onChange={e => set('state', e.target.value)}>
                <option value="">Select state</option>
                {INDIA_STATES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">PIN code</label>
              <input className="input" maxLength={6} value={form.pincode} onChange={e => set('pincode', e.target.value)} />
            </div>
          </div>
          {error && <p className="error-text">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Registering…' : 'Register Hospital'}
          </button>
        </form>
      </main>
    </div>
  )
}
