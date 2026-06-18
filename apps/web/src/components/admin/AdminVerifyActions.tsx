'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'

export default function AdminVerifyActions({ doctorId, doctorName }: { doctorId: string; doctorName: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [done, setDone] = useState<'approved' | 'rejected' | null>(null)

  async function approve() {
    setLoading('approve')
    const supabase = getSupabaseClient()
    await supabase.from('doctor').update({
      verification_status: 'APPROVED',
      verified_at: new Date().toISOString(),
    }).eq('id', doctorId)
    setDone('approved')
    setLoading(null)
    setTimeout(() => router.push('/dashboard/admin'), 1500)
  }

  async function reject() {
    if (!rejectionReason.trim()) return
    setLoading('reject')
    const supabase = getSupabaseClient()
    await supabase.from('doctor').update({
      verification_status: 'REJECTED',
      rejection_reason: rejectionReason,
    }).eq('id', doctorId)
    setDone('rejected')
    setLoading(null)
    setTimeout(() => router.push('/dashboard/admin'), 1500)
  }

  if (done === 'approved') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
        <p className="text-green-800 font-medium">✅ {doctorName} has been approved!</p>
        <p className="text-xs text-green-600 mt-1">Redirecting to admin dashboard…</p>
      </div>
    )
  }

  if (done === 'rejected') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center">
        <p className="text-red-800 font-medium">❌ Application rejected.</p>
        <p className="text-xs text-red-600 mt-1">Redirecting to admin dashboard…</p>
      </div>
    )
  }

  return (
    <div className="card p-5 space-y-4">
      <h3 className="font-semibold text-gray-900 text-sm">Decision</h3>

      {!showRejectForm ? (
        <div className="flex gap-3">
          <button
            onClick={approve}
            disabled={loading !== null}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading === 'approve' ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Approving…
              </>
            ) : '✅ Approve'}
          </button>
          <button
            onClick={() => setShowRejectForm(true)}
            disabled={loading !== null}
            className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 font-semibold py-3 rounded-xl border border-red-200 transition-colors disabled:opacity-50"
          >
            ❌ Reject
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="label">Reason for rejection (will be shown to doctor)</label>
            <textarea
              className="input min-h-[80px] resize-none"
              placeholder="e.g. Documents unclear, registration number not found in council records…"
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowRejectForm(false)}
              className="flex-1 btn-secondary"
              disabled={loading !== null}
            >
              Cancel
            </button>
            <button
              onClick={reject}
              disabled={!rejectionReason.trim() || loading !== null}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading === 'reject' ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Rejecting…
                </>
              ) : 'Confirm rejection'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
