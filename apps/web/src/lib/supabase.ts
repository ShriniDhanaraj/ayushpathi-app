import { createBrowserClient } from '@supabase/ssr'

export function createSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Singleton for use in client components
let client: ReturnType<typeof createSupabaseClient> | null = null

export function getSupabaseClient() {
  if (!client) client = createSupabaseClient()
  return client
}

/**
 * Call this after signOut() to drop the in-memory singleton.
 * Next call to getSupabaseClient() will create a fresh instance
 * with no cached session.
 */
export function resetSupabaseClient() {
  client = null
}
