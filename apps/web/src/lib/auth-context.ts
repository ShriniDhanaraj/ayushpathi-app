import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from './supabase-admin'

// Lightweight anon client — only used to verify the caller's JWT
const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export type AdminScope = 'HOSPITAL' | 'GROUP' | 'GLOBAL'

export interface HospitalAdminContext {
  auth_user_id: string
  scope: AdminScope
  hospital_id: string | null
  hospital_group_id: string | null
  /** IDs of all hospitals this admin can see */
  accessible_hospital_ids: string[]
}

/**
 * Extracts the Supabase JWT from Authorization header, verifies it,
 * then loads the hospital_admin record. Returns null if not authenticated
 * or not a hospital admin.
 */
export async function getHospitalAdminContext(
  req: NextRequest
): Promise<HospitalAdminContext | null> {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabaseAnon.auth.getUser(token)
  if (error || !user) return null

  const supabase = getSupabaseAdmin()
  const { data: adminRow } = await supabase
    .from('hospital_admin')
    .select('auth_user_id, scope, hospital_id, hospital_group_id, is_active')
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (!adminRow) return null

  let accessible_hospital_ids: string[] = []

  if (adminRow.scope === 'GLOBAL') {
    // No restriction — accessible_hospital_ids stays empty (caller must handle)
  } else if (adminRow.scope === 'GROUP' && adminRow.hospital_group_id) {
    const { data: hospitals } = await supabase
      .from('hospital')
      .select('id')
      .eq('hospital_group_id', adminRow.hospital_group_id)
    accessible_hospital_ids = (hospitals ?? []).map(h => h.id)
  } else if (adminRow.scope === 'HOSPITAL' && adminRow.hospital_id) {
    accessible_hospital_ids = [adminRow.hospital_id]
  }

  return {
    auth_user_id: user.id,
    scope: adminRow.scope as AdminScope,
    hospital_id: adminRow.hospital_id,
    hospital_group_id: adminRow.hospital_group_id,
    accessible_hospital_ids,
  }
}
