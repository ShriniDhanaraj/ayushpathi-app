'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [status, setStatus]       = useState<'idle' | 'saving' | 'done' | 'error' | 'invalid'>('idle')
  const [errorMsg, setErrorMsg]   = useState('')
  const [showPw, setShowPw]       = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  // Supabase puts the recovery token in the URL hash on redirect.
  // The client SDK automatically exchanges it for a session.
  useEffect(() => {
    const supabase = getSupabaseClient()
    // Listen for the PASSWORD_RECOVERY event which fires after token exchange
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setSessionReady(true)
    })
    // Also check if already in a session (page refreshed after token exchange)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) { setErrorMsg('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setErrorMsg('Passwords do not match.'); return }

    setStatus('saving')
    setErrorMsg('')
    const supabase = getSupabaseClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setErrorMsg(error.message)
      setStatus('error')
    } else {
      setStatus('done')
      setTimeout(() => router.push('/auth/login'), 2500)
    }
  }

  if (!sessionReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-50 to-white flex items-center justify-center p-4">
        <div className="card p-8 max-w-md w-full text-center space-y-4">
          <p className="text-4xl">🔐</p>
          <p className="text-gray-500 text-sm">Verifying your reset link…</p>
          <p className="text-xs text-gray-400">
            If this takes more than 10 seconds, the link may have expired.{' '}
            <a href="/auth/forgot-password" className="text-brand-600 hover:underline">Request a new one.</a>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-600 rounded-2xl mb-4">
            <span className="text-white text-2xl font-bold">A</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Ayushpathi</h1>
        </div>

        <div className="card p-8">
          {status === 'done' ? (
            <div className="text-center space-y-3">
              <div className="text-5xl">✅</div>
              <h2 className="text-lg font-semibold text-gray-900">Password updated</h2>
              <p className="text-sm text-gray-500">Redirecting you to sign in…</p>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Set new password</h2>
              <p className="text-sm text-gray-500 mb-6">Choose a strong password (min. 8 characters).</p>

              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="label mb-0">New password</label>
                    <button type="button" className="text-xs text-gray-400 hover:text-gray-600"
                      onClick={() => setShowPw(p => !p)}>
                      {showPw ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <input
                    type={showPw ? 'text' : 'password'}
                    className="input"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setErrorMsg('') }}
                    required
                    minLength={8}
                    disabled={status === 'saving'}
                  />
                </div>
                <div>
                  <label className="label">Confirm new password</label>
                  <input
                    type={showPw ? 'text' : 'password'}
                    className="input"
                    placeholder="••••••••"
                    value={confirm}
                    onChange={e => { setConfirm(e.target.value); setErrorMsg('') }}
                    required
                    disabled={status === 'saving'}
                  />
                </div>

                {errorMsg && (
                  <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-sm text-red-700">
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  className="btn-primary w-full"
                  disabled={!password || !confirm || status === 'saving'}
                >
                  {status === 'saving' ? 'Updating…' : 'Update password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
