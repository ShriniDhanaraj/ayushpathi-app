'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'

export default function DoctorVerifyActions({ doctorId, adminId }: { doctorId: string; adminId: string }) {
  const router = useRouter()
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null)

  async function approve() {
    setLoading('approve')
    const supabase = getSupabaseClient()
    await supabase.from('doctor').update({
      verification_status: 'APPROVED',
      verified_by: adminId,
      verified_at: new Date().toISOString(),
    }).eq('id', doctorId)
    // TODO: send WhatsApp notification via Gupshup
    router.push('/dashboard/admin?approved=1')
  }

  async function reject() {
    if (!rejectionReason.trim()) return
    setLoading('reject')
    const supabase = getSupabaseClient()
    await supabase.from('doctor').update({
      verification_status: 'REJECTED',
      verified_by: adminId,
      verified_at: new Date().toISOString(),
      rejection_reason: rejectionReason,
    }).eq('id', doctorId)
    // TODO: send WhatsApp notification via Gupshup
    router.push('/dashboard/admin?rejected=1')
  }

  return (
    <div className="card p-6 space-y-4">
      <h3 className="font-semibold text-gray-900">Verification Decision</h3>
      {!showRejectForm ? (
        <div className="flex gap-3">
          <button onClick={approve} disabled={loading === 'approve'}
            className="btn-primary flex-1">
            {loading === 'approve' ? 'Approving…' : '✓ Approve Doctor'}
          </button>
          <button onClick={() => setShowRejectForm(true)}
            className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 font-medium px-4 py-2.5 rounded-lg border border-red-200 transition-colors">
            ✕ Reject
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <label className="label">Reason for rejection (sent to doctor)</label>
          <textarea className="input h-24 resize-none" placeholder="e.g. Registration certificate is unclear, please re-upload..."
            value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} />
          <div className="flex gap-3">
            <button onClick={() => setShowRejectForm(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={reject} disabled={!rejectionReason.trim() || loading === 'reject'}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50">
              {loading === 'reject' ? 'Rejecting…' : 'Send Rejection'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
