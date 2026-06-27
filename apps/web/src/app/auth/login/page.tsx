'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseClient, resetSupabaseClient } from '@/lib/supabase'
import { ROLE_DASHBOARD } from '@/lib/auth'
import { LANGUAGES } from '@ayushpathi/shared/constants/languages'
import { getTranslations } from '@ayushpathi/shared/i18n/translations'

const FRIENDLY_ERRORS: Record<string, string> = {
  'Invalid login credentials': 'Incorrect email or password. Please try again.',
  'Email not confirmed': 'Please confirm your email before signing in.',
  'Too many requests': 'Too many attempts. Please wait a minute and try again.',
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  // UI language on the login page (pre-login, defaults to EN)
  const [uiLang, setUiLang] = useState('EN')

  // Flush any lingering session from a previous user on every visit to this page.
  // Without this, the Supabase browser client reads the old token from localStorage
  // and signs in automatically as the previous user.
  useEffect(() => {
    const supabase = getSupabaseClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        supabase.auth.signOut({ scope: 'local' }).then(() => {
          resetSupabaseClient()
        })
      }
    })
  }, [])

  const T = getTranslations(uiLang)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = getSupabaseClient()

    const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password })
    if (authErr) {
      setError(FRIENDLY_ERRORS[authErr.message] ?? authErr.message)
      setLoading(false)
      return
    }

    const meta = data.user?.user_metadata ?? {}
    const role = meta.role ?? 'patient'

    // Derive ui_language from user metadata (set at registration) or profile
    // The metadata stores ui_language directly for fast access without an extra DB fetch.
    // If not present, fetch from patient/doctor table.
    let derivedLang: string = meta.ui_language ?? 'EN'

    if (!meta.ui_language && role === 'patient') {
      const { data: profile } = await supabase
        .from('patient')
        .select('ui_language')
        .eq('auth_user_id', data.user.id)
        .single()
      derivedLang = profile?.ui_language ?? 'EN'
    } else if (!meta.ui_language && (role === 'doctor-approved' || role === 'doctor-pending' || role === 'doctor')) {
      const { data: profile } = await supabase
        .from('doctor')
        .select('ui_language')
        .eq('auth_user_id', data.user.id)
        .single()
      derivedLang = profile?.ui_language ?? 'EN'
    }

    // Store derived language in sessionStorage so the dashboard can read it immediately.
    // The full i18n context picks this up on mount.
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('ayushpathi_ui_lang', derivedLang)
    }

    router.push(ROLE_DASHBOARD[role as keyof typeof ROLE_DASHBOARD] ?? '/dashboard/patient')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Language selector — top right, no auth required */}
        <div className="flex justify-end mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{T.changeLanguage}</span>
            <select
              value={uiLang}
              onChange={e => setUiLang(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700 focus:outline-none focus:border-brand-400"
            >
              {LANGUAGES.map(l => (
                <option key={l.code} value={l.code}>
                  {l.nativeLabel} ({l.label})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* App header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-600 rounded-2xl mb-4">
            <span className="text-white text-2xl font-bold">A</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{T.appName}</h1>
          <p className="text-gray-500 text-sm mt-1">{T.appTagline}</p>
        </div>

        <div className="card p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">{T.signIn}</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="label">{T.email}</label>
              <input
                type="email"
                className="input"
                placeholder="you@example.com"
                value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                disabled={loading}
                required
                autoComplete="email"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label mb-0">{T.password}</label>
                <button
                  type="button"
                  className="text-xs text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPassword(p => !p)}
                >
                  {showPassword ? T.hidePassword : T.showPassword}
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                disabled={loading}
                required
                autoComplete="current-password"
              />
            </div>

            <div className="text-right -mt-1">
              <Link href="/auth/forgot-password" className="text-xs text-brand-600 hover:underline">
                {T.forgotPassword}
              </Link>
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                <span className="text-red-500 text-sm mt-0.5">⚠</span>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              type="submit"
              className="btn-primary w-full relative"
              disabled={loading || !email || !password}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  {T.signingIn}
                </span>
              ) : T.signIn}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            {T.noAccount}{' '}
            <Link href="/auth/register" className="text-brand-600 font-medium hover:underline">
              {T.createAccount}
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          By signing in, you agree to our{' '}
          <Link href="/privacy" className="underline">Privacy Policy</Link>
          {' '}— your data is stored securely in India per DPDP Act 2023.
        </p>
      </div>
    </div>
  )
}
