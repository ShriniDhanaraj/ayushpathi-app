'use client'
import { useRouter } from 'next/navigation'
import { getSupabaseClient, resetSupabaseClient } from '@/lib/supabase'

interface Props {
  className?: string
  label?: string
}

/**
 * Performs a proper client-side sign-out:
 * 1. Calls supabase.auth.signOut() in the browser → clears localStorage token
 * 2. Resets the in-memory singleton so the next login gets a clean client
 * 3. Navigates to /auth/login
 *
 * Use this everywhere instead of <a href="/api/auth/signout">
 */
export default function SignOutButton({ className, label = 'Sign out' }: Props) {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = getSupabaseClient()
    await supabase.auth.signOut()
    resetSupabaseClient()
    router.push('/auth/login')
    // Hard reload ensures no stale React state or cached fetches remain
    router.refresh()
  }

  return (
    <button onClick={handleSignOut} className={className}>
      {label}
    </button>
  )
}
