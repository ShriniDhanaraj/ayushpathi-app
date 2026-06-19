'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const SPEC: Record<string, string> = {
  AYU: 'Ayurveda', YOG: 'Yoga & Naturopathy',
  UNA: 'Unani', SID: 'Siddha', HOM: 'Homeopathy',
}

async function authFetch(path: string, opts?: RequestInit) {
  const { data: { session } } = await supabase.auth.getSession()
  return fetch(path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token ?? ''}`,
      ...(opts?.headers ?? {}),
    },
  })
}

interface PendingDoctor {
  id: string
  first_name: string
  last_name: string
  ayush_specialization: string
  mobile: string
  email: string
  registration_number: string
  registration_council: string
  degrees: string[]
  years_of_experience: number
  created_at: string
}

interface DoctorLink {
  id: string
  active: boolean
  joined_at: string
  doctor: { id: string; first_name: string; last_name: string; ayush_specialization: string; mobile: string; verification_status: string } | null
  hospital: { id: string; name: string } | null
}

interface SearchDoctor { id: string; first_name: string; last_name: string; ayush_specialization: string }

export default function AdminDoctorsPage() {
  const [pending, setPending]         = useState<PendingDoctor[]>([])
  const [links, setLinks]             = useState<DoctorLink[]>([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [doctorResults, setDoctorResults] = useState<SearchDoctor[]>([])
  const [rejectTarget, setRejectTarget]   = useState<string | null>(null)
  const [rejectReason, setRejectReason]   = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    // Linked doctors (for the hospital)
    const res = await authFetch('/api/hospital-admin/doctors')
    const json = await res.json()
    setLinks(json.doctors ?? [])

    // Pending doctors — fetch directly (scoped by RLS / admin context via API)
    const pendingRes = await authFetch('/api/hospital-admin/doctors?status=PENDING')
    const pendingJson = await pendingRes.json()
    setPending(pendingJson.pending ?? [])

    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // Doctor name search for linking
  useEffect(() => {
    if (!search) { setDoctorResults([]); return }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/doctors?search=${encodeURIComponent(search)}&verified_only=false`)
      const json = await res.json()
      setDoctorResults(json.doctors ?? [])
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  async function verify(doctorId: string, action: 'APPROVE' | 'REJECT') {
    if (action === 'REJECT' && !rejectReason.trim()) return
    setActionLoading(doctorId)
    await authFetch(`/api/hospital-admin/doctors/${doctorId}/verify`, {
      method: 'PATCH',
      body: JSON.stringify({ action, rejection_reason: rejectReason || undefined }),
    })
    setRejectTarget(null)
    setRejectReason('')
    setActionLoading(null)
    load()
  }

  async function linkDoctor(doctorId: string, hospitalId: string) {
    await authFetch('/api/hospital-admin/doctors', {
      method: 'POST',
      body: JSON.stringify({ doctor_id: doctorId, hospital_id: hospitalId }),
    })
    setSearch(''); setDoctorResults([])
    load()
  }

  async function removeDoctor(doctorId: string, hospitalId: string) {
    if (!confirm('Remove this doctor from the hospital?')) return
    await authFetch('/api/hospital-admin/doctors', {
      method: 'DELETE',
      body: JSON.stringify({ doctor_id: doctorId, hospital_id: hospitalId }),
    })
    load()
  }

  // Get hospital ID from first active link (for the "Link Doctor" form)
  const myHospitalId = links.find(l => l.hospital?.id)?.hospital?.id ?? ''

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <Link href="/hospital-admin" className="text-brand-600 text-sm hover:underline">← Dashboard</Link>
      <h1 className="text-xl font-bold text-gray-900">Doctors</h1>

      {/* ── Pending Verification ─────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="font-semibold text-gray-800">Pending Verification</h2>
          {pending.length > 0 && (
            <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {pending.length}
            </span>
          )}
        </div>

        {loading && <p className="text-gray-400 text-sm">Loading…</p>}

        {!loading && pending.length === 0 && (
          <div className="card p-6 text-center text-sm text-gray-400">
            No pending doctor applications at your hospital.
          </div>
        )}

        {pending.map(doc => (
          <div key={doc.id} className="card p-5 mb-3">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900">
                  Dr. {doc.first_name} {doc.last_name}
                </p>
                <p className="text-sm text-gray-600 mt-0.5">
                  {SPEC[doc.ayush_specialization] ?? doc.ayush_specialization}
                  {doc.years_of_experience ? ` · ${doc.years_of_experience} yrs` : ''}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {doc.email} · {doc.mobile}
                </p>
                <p className="text-xs text-gray-400">
                  {doc.degrees?.join(', ')} · {doc.registration_council} · #{doc.registration_number}
                </p>
                <p className="text-xs text-gray-300 mt-1">
                  Applied {new Date(doc.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>

              {/* Action buttons */}
              {rejectTarget === doc.id ? (
                <div className="space-y-2 min-w-[220px]">
                  <textarea
                    className="input text-sm w-full"
                    rows={2}
                    placeholder="Reason for rejection (required)"
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button
                      className="btn-secondary text-xs flex-1"
                      onClick={() => { setRejectTarget(null); setRejectReason('') }}
                    >
                      Cancel
                    </button>
                    <button
                      disabled={!rejectReason.trim() || actionLoading === doc.id}
                      onClick={() => verify(doc.id, 'REJECT')}
                      className="text-xs px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium flex-1 disabled:opacity-50"
                    >
                      {actionLoading === doc.id ? '…' : 'Confirm Reject'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    disabled={actionLoading === doc.id}
                    onClick={() => verify(doc.id, 'APPROVE')}
                    className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
                  >
                    {actionLoading === doc.id ? '…' : 'Approve'}
                  </button>
                  <button
                    onClick={() => setRejectTarget(doc.id)}
                    className="px-4 py-1.5 border border-red-300 text-red-600 hover:bg-red-50 text-sm font-medium rounded-lg"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </section>

      {/* ── Linked Doctors ───────────────────────────────────────────────── */}
      <section>
        <h2 className="font-semibold text-gray-800 mb-4">Linked Doctors</h2>

        {/* Link new doctor */}
        <div className="bg-gray-50 border rounded-xl p-4 mb-4">
          <p className="text-xs font-semibold text-gray-600 mb-2">Link an approved doctor to your hospital</p>
          <div className="relative">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search doctor by name…"
              className="input w-full text-sm"
            />
            {doctorResults.length > 0 && (
              <div className="absolute z-10 w-full bg-white border rounded-xl shadow-lg mt-1 max-h-48 overflow-y-auto">
                {doctorResults.map(d => (
                  <button
                    key={d.id}
                    onClick={() => linkDoctor(d.id, myHospitalId)}
                    className="w-full text-left px-4 py-2.5 hover:bg-brand-50 text-sm border-b last:border-0"
                  >
                    Dr. {d.first_name} {d.last_name}
                    <span className="text-gray-400 ml-1">· {SPEC[d.ayush_specialization] ?? d.ayush_specialization}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {!loading && links.length === 0 && (
          <div className="card p-6 text-center text-sm text-gray-400">No doctors linked yet.</div>
        )}

        <div className="space-y-3">
          {links.map(link => (
            <div key={link.id} className="card p-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-gray-900">
                  Dr. {link.doctor?.first_name} {link.doctor?.last_name}
                  <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                    link.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {link.active ? 'Active' : 'Inactive'}
                  </span>
                </p>
                <p className="text-sm text-gray-500">
                  {SPEC[link.doctor?.ayush_specialization ?? ''] ?? link.doctor?.ayush_specialization}
                  {' · '}{link.doctor?.mobile}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {link.hospital?.name} · Joined {new Date(link.joined_at).toLocaleDateString('en-IN')}
                </p>
              </div>
              {link.active && link.doctor && link.hospital && (
                <button
                  onClick={() => removeDoctor(link.doctor!.id, link.hospital!.id)}
                  className="text-xs text-red-500 hover:text-red-700 flex-shrink-0"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
