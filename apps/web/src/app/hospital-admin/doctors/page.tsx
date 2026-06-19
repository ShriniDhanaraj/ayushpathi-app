'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function authFetch(path: string, opts?: RequestInit) {
  const { data: { session } } = await supabase.auth.getSession()
  return fetch(path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}`, ...(opts?.headers ?? {}) },
  })
}

interface DoctorLink {
  id: string
  active: boolean
  joined_at: string
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
  doctor: { id: string; first_name: string; last_name: string; ayush_specialization: string; mobile: string; verification_status: string } | null
  hospital: { id: string; name: string } | null
}

interface Doctor { id: string; first_name: string; last_name: string; ayush_specialization: string }

export default function AdminDoctorsPage() {
  const [links, setLinks] = useState<DoctorLink[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [doctorResults, setDoctorResults] = useState<Doctor[]>([])
  const [hospitalId, setHospitalId] = useState('')

  async function load() {
    setLoading(true)
    const res = await authFetch('/api/hospital-admin/doctors')
    const json = await res.json()
    setLinks(json.doctors ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!search) { setDoctorResults([]); return }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/doctors?search=${encodeURIComponent(search)}&verified_only=false`)
      const json = await res.json()
      setDoctorResults(json.doctors ?? [])
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  async function linkDoctor(doctorId: string) {
    if (!hospitalId) { alert('Enter hospital ID first'); return }
    await authFetch('/api/hospital-admin/doctors', {
      method: 'POST',
      body: JSON.stringify({ doctor_id: doctorId, hospital_id: hospitalId }),
    })
    setSearch(''); setDoctorResults([])
    load()
  }

  async function removeDoctor(doctorId: string, hId: string) {
    if (!confirm('Remove this doctor from the hospital?')) return
    await authFetch('/api/hospital-admin/doctors', {
      method: 'DELETE',
      body: JSON.stringify({ doctor_id: doctorId, hospital_id: hId }),
    })
    load()
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <Link href="/hospital-admin"><p className="text-green-700 text-sm mb-4 hover:underline">← Dashboard</p></Link>
      <h1 className="text-xl font-bold text-gray-800 mb-6">Doctors at Your Hospital</h1>

      {/* Link new doctor */}
      <div className="bg-green-50 border border-green-200 rounded p-4 mb-6">
        <p className="text-sm font-semibold text-green-800 mb-3">Link a Doctor</p>
        <div className="flex gap-2 mb-2">
          <input value={hospitalId} onChange={e => setHospitalId(e.target.value)}
            placeholder="Hospital ID (UUID)" className="flex-1 border rounded px-3 py-1.5 text-sm" />
        </div>
        <div className="relative">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search doctor by name…" className="w-full border rounded px-3 py-1.5 text-sm" />
          {doctorResults.length > 0 && (
            <div className="absolute z-10 w-full bg-white border rounded shadow-lg mt-1 max-h-48 overflow-y-auto">
              {doctorResults.map(d => (
                <button key={d.id} onClick={() => linkDoctor(d.id)}
                  className="w-full text-left px-3 py-2 hover:bg-green-50 text-sm border-b last:border-0">
                  Dr. {d.first_name} {d.last_name} · {d.ayush_specialization}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading ? <p className="text-gray-400">Loading…</p> : (
        <div className="space-y-3">
          {links.length === 0 && <p className="text-gray-500">No doctors linked yet.</p>}
          {links.map(link => (
            <div key={link.id} className="bg-white border rounded p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-800">
                    Dr. {link.doctor?.first_name} {link.doctor?.last_name}
                    <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${link.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {link.active ? 'Active' : 'Inactive'}
                    </span>
                  </p>
                  <p className="text-sm text-gray-500">{link.doctor?.ayush_specialization} · {link.doctor?.mobile}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Hospital: {link.hospital?.name ?? link.id} · Joined: {new Date(link.joined_at).toLocaleDateString('en-IN')}
                  </p>
                  <p className="text-xs text-gray-400">
                    Added: {new Date(link.created_at).toLocaleString('en-IN')}
                    {link.updated_at !== link.created_at && ` · Updated: ${new Date(link.updated_at).toLocaleString('en-IN')}`}
                  </p>
                </div>
                {link.active && (
                  <button onClick={() => removeDoctor(link.doctor!.id, link.hospital!.id)}
                    className="text-xs text-red-500 hover:text-red-700">Remove</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
