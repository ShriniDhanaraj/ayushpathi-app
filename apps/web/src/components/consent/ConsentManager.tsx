'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'

const SPEC_LABELS: Record<string, string> = {
  AYU: 'Ayurveda', YOG: 'Yoga & Naturopathy',
  UNA: 'Unani', SID: 'Siddha', HOM: 'Homeopathy',
}

interface ConsentProps {
  consent: {
    id: string
    status: string
    share_full_history: boolean
    consented_at: string
    revoked_at: string | null
    doctor: {
      id: string; first_name: string; last_name: string
      ayush_specialization: string; mobile: string; profile_photo_url: string | null
    } | null
  }
  patientId: string
}

export default function ConsentManager({ consent, patientId }: ConsentProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [shareHistory, setShareHistory] = useState(consent.share_full_history)
  const isActive = consent.status === 'ACTIVE'
  const doc = consent.doctor

  async function revoke() {
    setLoading('revoke')
    const supabase = getSupabaseClient()
    await supabase.from('patient_doctor_consent').update({
      status: 'REVOKED',
      revoked_at: new Date().toISOString(),
    }).eq('id', consent.id)
    router.refresh()
    setLoading(null)
  }

  async function reconsent() {
    setLoading('reconsent')
    const supabase = getSupabaseClient()
    await supabase.from('patient_doctor_consent').update({
      status: 'ACTIVE',
      revoked_at: null,
      consented_at: new Date().toISOString(),
    }).eq('id', consent.id)
    router.refresh()
    setLoading(null)
  }

  async function toggleHistory() {
    const next = !shareHistory
    setShareHistory(next)
    const supabase = getSupabaseClient()
    await supabase.from('patient_doctor_consent')
      .update({ share_full_history: next }).eq('id', consent.id)
  }

  if (!doc) return null

  return (
    <div className={`card p-5 transition-all ${!isActive ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center text-brand-700 font-bold text-sm">
            {doc.first_name[0]}{doc.last_name[0]}
          </div>
          <div>
            <p className="font-semibold text-gray-900">Dr. {doc.first_name} {doc.last_name}</p>
            <p className="text-sm text-gray-500">{SPEC_LABELS[doc.ayush_specialization] ?? doc.ayush_specialization}</p>
          </div>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
          isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
        }`}>
          {isActive ? 'Access granted' : 'Access revoked'}
        </span>
      </div>

      {isActive && (
        <div className="mt-4 flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
          <div>
            <p className="text-sm font-medium text-gray-700">Share full health history</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {shareHistory ? 'Doctor sees all your past records' : 'Doctor sees new records only'}
            </p>
          </div>
          <button
            onClick={toggleHistory}
            className={`relative w-11 h-6 rounded-full transition-colors ${shareHistory ? 'bg-brand-600' : 'bg-gray-300'}`}>
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${shareHistory ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-gray-400">
          {isActive
            ? `Granted ${new Date(consent.consented_at).toLocaleDateString('en-IN')}`
            : `Revoked ${consent.revoked_at ? new Date(consent.revoked_at).toLocaleDateString('en-IN') : ''}`
          }
        </p>
        {isActive ? (
          <button onClick={revoke} disabled={loading === 'revoke'}
            className="text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50">
            {loading === 'revoke' ? 'Revoking…' : 'Revoke access'}
          </button>
        ) : (
          <button onClick={reconsent} disabled={loading === 'reconsent'}
            className="text-sm text-brand-600 hover:text-brand-700 font-medium disabled:opacity-50">
            {loading === 'reconsent' ? 'Reconnecting…' : 'Re-grant access'}
          </button>
        )}
      </div>
    </div>
  )
}
