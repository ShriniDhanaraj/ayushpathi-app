import { getSupabaseClient } from './supabase'
import type { UserRole } from '../../../packages/shared/constants'

export type AuthUser = {
  id: string
  email: string
  role: UserRole
  profileId: string | null   // patient.id or doctor.id etc.
}

// Fetch the role stored in user metadata (set at registration)
export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = getSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return {
    id: user.id,
    email: user.email!,
    role: user.user_metadata?.role ?? 'patient',
    profileId: user.user_metadata?.profile_id ?? null,
  }
}

export async function signOut() {
  const supabase = getSupabaseClient()
  await supabase.auth.signOut()
  window.location.href = '/auth/login'
}

// Role → dashboard path mapping
export const ROLE_DASHBOARD: Record<UserRole, string> = {
  patient:           '/dashboard/patient',
  doctor:            '/dashboard/doctor',
  receptionist:      '/dashboard/receptionist',
  hospital_admin:    '/dashboard/admin',
  ayushpathi_admin:  '/dashboard/admin',
}
