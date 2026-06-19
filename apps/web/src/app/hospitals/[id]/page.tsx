'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

interface Doctor {
  id: string
  full_name: string
  specialization: string
  verification_status: string
  phone: string | null
}

interface DoctorLink {
  id: string
  role: string
  is_primary: boolean
  joined_at: string
  doctor: Doctor
}

interface Hospital {
  id: string
  name: string
  registration_no: string
  phone: string | null
  email: string | null
  website: string | null
  is_active: boolean
  ayush_specializations: string[]
  address: {
    street: string | null; city: string; district: string | null
    state: string; pincode: string | null
  } | null
  doctor_hospital: DoctorLink[]
}

export default function HospitalDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [hospital, setHospital] = useState<Hospital | null>(null)
  const [searchDoctors, setSearchDoctors] = useState<Doctor[]>([])
  const [doctorSearch, setDoctorSearch] = useState('')
  const [linkRole, setLinkRole] = useState('VISITING')
  const [loading, setLoading] = useState(true)

  async function load() {
    const res = await fetch(`/api/hospitals/${id}`)
    const json = await res.json()
    setHospital(json.hospital)
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  useEffect(() => {
    if (!doctorSearch) { setSearchDoctors([]); return }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/doctors?search=${encodeURIComponent(doctorSearch)}`)
      const json = await res.json()
      setSearchDoctors(json.doctors ?? [])
    }, 300)
    return () => clearTimeout(t)
  }, [doctorSearch])

  async function linkDoctor(doctorId: string) {
    await fetch(`/api/hospitals/${id}/doctors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doctor_id: doctorId, role: linkRole }),
    })
    setDoctorSearch('')
    setSearchDoctors([])
    load()
  }

  async function unlinkDoctor(doctorId: string) {
    if (!confirm('Remove this doctor from the hospital?')) return
    await fetch(`/api/hospitals/${id}/doctors`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doctor_id: doctorId }),
    })
    load()
  }

  async function toggleActive() {
    if (!hospital) return
    await fetch(`/api/hospitals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !hospital.is_active }),
    })
    load()
  }

  if (loading) return <div className="p-6 text-gray-500">Loading…</div>
  if (!hospital) return <div className="p-6 text-red-500">Hospital not found.</div>

  return (
    <div className="max-w-4xl mx-auto p-6">
      <button onClick={() => router.push('/hospitals')} className="text-green-700 text-sm mb-4 hover:underline">← Back to Hospitals</button>

      <div className="bg-white border rounded p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{hospital.name}</h1>
            <p className="text-gray-500 text-sm">Reg: {hospital.registration_no}</p>
          </div>
          <button
            onClick={toggleActive}
            className={`px-3 py-1 rounded text-sm ${hospital.is_active ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
          >
            {hospital.is_active ? 'Deactivate' : 'Activate'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm text-gray-700">
          {hospital.phone && <p><span className="font-medium">Phone:</span> {hospital.phone}</p>}
          {hospital.email && <p><span className="font-medium">Email:</span> {hospital.email}</p>}
          {hospital.website && <p><span className="font-medium">Website:</span> <a href={hospital.website} target="_blank" rel="noreferrer" className="text-blue-600 underline">{hospital.website}</a></p>}
          {hospital.address && (
            <p className="col-span-2"><span className="font-medium">Address:</span> {[hospital.address.street, hospital.address.city, hospital.address.district, hospital.address.state, hospital.address.pincode].filter(Boolean).join(', ')}</p>
          )}
        </div>

        {hospital.ayush_specializations?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {hospital.ayush_specializations.map(s => (
              <span key={s} className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">{s}</span>
            ))}
          </div>
        )}
      </div>

      {/* Doctor Linking */}
      <div className="bg-white border rounded p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Doctors</h2>

        <div className="flex gap-2 mb-4">
          <div className="flex-1 relative">
            <input
              value={doctorSearch}
              onChange={e => setDoctorSearch(e.target.value)}
              placeholder="Search doctors to link…"
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            {searchDoctors.length > 0 && (
              <div className="absolute z-10 w-full bg-white border rounded shadow-lg mt-1 max-h-48 overflow-y-auto">
                {searchDoctors.map(d => (
                  <button
                    key={d.id}
                    onClick={() => linkDoctor(d.id)}
                    className="w-full text-left px-3 py-2 hover:bg-green-50 text-sm border-b last:border-0"
                  >
                    <span className="font-medium">{d.full_name}</span>
                    <span className="text-gray-500 ml-2">{d.specialization}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <select
            value={linkRole}
            onChange={e => setLinkRole(e.target.value)}
            className="border rounded px-2 py-2 text-sm"
          >
            <option value="VISITING">Visiting</option>
            <option value="RESIDENT">Resident</option>
            <option value="CONSULTANT">Consultant</option>
          </select>
        </div>

        {hospital.doctor_hospital?.length === 0 ? (
          <p className="text-gray-500 text-sm">No doctors linked yet.</p>
        ) : (
          <div className="space-y-2">
            {hospital.doctor_hospital.map(link => (
              <div key={link.id} className="flex items-center justify-between border rounded p-3">
                <div>
                  <p className="font-medium text-sm">{link.doctor.full_name}</p>
                  <p className="text-xs text-gray-500">{link.doctor.specialization} · {link.role}</p>
                </div>
                <button
                  onClick={() => unlinkDoctor(link.doctor.id)}
                  className="text-xs text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
