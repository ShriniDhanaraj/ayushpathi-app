'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Hospital {
  id: string
  name: string
  registration_no: string
  phone: string | null
  email: string | null
  is_active: boolean
  ayush_specializations: string[]
  address: { city: string; state: string } | null
}

export default function HospitalsPage() {
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '', registration_no: '', phone: '', email: '', website: '',
    ayush_specializations: '',
    street: '', city: '', district: '', state: '', pincode: '',
  })

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/hospitals?search=${encodeURIComponent(search)}`)
    const json = await res.json()
    setHospitals(json.hospitals ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [search])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const specs = form.ayush_specializations.split(',').map(s => s.trim()).filter(Boolean)
    await fetch('/api/hospitals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        registration_no: form.registration_no,
        phone: form.phone || null,
        email: form.email || null,
        website: form.website || null,
        ayush_specializations: specs,
        address: {
          street: form.street, city: form.city, district: form.district,
          state: form.state, pincode: form.pincode,
        },
      }),
    })
    setShowForm(false)
    setForm({ name: '', registration_no: '', phone: '', email: '', website: '',
      ayush_specializations: '', street: '', city: '', district: '', state: '', pincode: '' })
    load()
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-green-800">Hospitals</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-green-700 text-white px-4 py-2 rounded hover:bg-green-800"
        >
          + Add Hospital
        </button>
      </div>

      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search by name…"
        className="w-full border rounded px-3 py-2 mb-6 focus:outline-none focus:ring-2 focus:ring-green-500"
      />

      {showForm && (
        <form onSubmit={handleCreate} className="bg-green-50 border border-green-200 rounded p-4 mb-6 grid grid-cols-2 gap-3">
          <h2 className="col-span-2 font-semibold text-green-800">New Hospital</h2>
          {[
            ['name', 'Hospital Name *'], ['registration_no', 'Registration No *'],
            ['phone', 'Phone'], ['email', 'Email'], ['website', 'Website'],
            ['ayush_specializations', 'AYUSH Specializations (comma-separated)'],
            ['street', 'Street'], ['city', 'City'], ['district', 'District'],
            ['state', 'State'], ['pincode', 'Pincode'],
          ].map(([key, label]) => (
            <div key={key} className={key === 'ayush_specializations' || key === 'street' ? 'col-span-2' : ''}>
              <label className="block text-xs text-gray-600 mb-1">{label}</label>
              <input
                value={(form as Record<string, string>)[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                required={key === 'name' || key === 'registration_no'}
                className="w-full border rounded px-2 py-1 text-sm"
              />
            </div>
          ))}
          <div className="col-span-2 flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded text-sm">Cancel</button>
            <button type="submit" className="bg-green-700 text-white px-4 py-2 rounded text-sm hover:bg-green-800">Create</button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : hospitals.length === 0 ? (
        <p className="text-gray-500">No hospitals found.</p>
      ) : (
        <div className="space-y-3">
          {hospitals.map(h => (
            <Link key={h.id} href={`/hospitals/${h.id}`}>
              <div className="border rounded p-4 hover:shadow-md transition cursor-pointer bg-white">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-800">{h.name}</p>
                    <p className="text-sm text-gray-500">Reg: {h.registration_no}</p>
                    {h.address && (
                      <p className="text-sm text-gray-500">{h.address.city}, {h.address.state}</p>
                    )}
                    {h.ayush_specializations?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {h.ayush_specializations.map(s => (
                          <span key={s} className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">{s}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${h.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {h.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
