import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * Fallback server-side sign-out (used when JS is unavailable).
 * NOTE: The primary signout path is SignOutButton (client-side) which
 * also clears browser localStorage. This route only clears server cookies.
 */
export async function GET() {
  const cookieStore = cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  await supabase.auth.signOut({ scope: 'local' })

  // Expire all sb-* auth cookies explicitly
  const allCookies = cookieStore.getAll()
  const response = NextResponse.redirect(
    new URL('/auth/login', process.env.NEXT_PUBLIC_APP_URL || 'https://www.rasbros.com')
  )
  for (const cookie of allCookies) {
    if (cookie.name.startsWith('sb-')) {
      response.cookies.set(cookie.name, '', { maxAge: 0, path: '/' })
    }
  }
  return response
}
