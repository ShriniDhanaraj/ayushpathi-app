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

interface Receptionist {
  id: string
  first_name: string
  last_name: string
  email: string
  mobile: string
  is_active: boolean
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
  hospital: { id: string; name: string } | null
}

export default function AdminReceptionistsPage() {
  const [receptionists, setReceptionists] = useState<Receptionist[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const res = await authFetch('/api/hospital-admin/receptionists')
    const json = await res.json()
    setReceptionists(json.receptionists ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function toggle(id: string, is_active: boolean) {
    setToggling(id)
    await authFetch('/api/hospital-admin/receptionists', {
      method: 'PATCH',
      body: JSON.stringify({ id, is_active }),
    })
    setToggling(null)
    load()
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Link href="/hospital-admin"><p className="text-green-700 text-sm mb-4 hover:underline">← Dashboard</p></Link>
      <h1 className="text-xl font-bold text-gray-800 mb-6">Receptionists</h1>

      {loading ? <p className="text-gray-400">Loading…</p> : (
        <div className="space-y-3">
          {receptionists.length === 0 && <p className="text-gray-500">No receptionists found.</p>}
          {receptionists.map(r => (
            <div key={r.id} className="bg-white border rounded p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-800">
                    {r.first_name} {r.last_name}
                    <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${r.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {r.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </p>
                  <p className="text-sm text-gray-500">{r.email} · {r.mobile}</p>
                  <p className="text-xs text-gray-400 mt-1">Hospital: {r.hospital?.name ?? '—'}</p>
                  <p className="text-xs text-gray-400">
                    Created: {new Date(r.created_at).toLocaleString('en-IN')}
                    {r.updated_at !== r.created_at && (
                      <> · Updated: {new Date(r.updated_at).toLocaleString('en-IN')}</>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => toggle(r.id, !r.is_active)}
                  disabled={toggling === r.id}
                  className={`text-xs px-3 py-1.5 rounded border disabled:opacity-50 ${
                    r.is_active
                      ? 'border-red-300 text-red-600 hover:bg-red-50'
                      : 'border-green-300 text-green-700 hover:bg-green-50'
                  }`}
                >
                  {toggling === r.id ? '…' : r.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
