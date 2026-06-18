import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

// PATCH /api/profile/patient/health
// Body: {
//   auth_user_id: string,
//   known_conditions?:     string[],
//   allergies?:            string[],
//   current_medications?:  { name: string; dosage: string; frequency: string; since: string }[],
//   past_surgeries?:       { procedure: string; year: string; hospital: string }[],
//   family_history?:       { relation: string; condition: string }[],
// }
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      auth_user_id,
      known_conditions,
      allergies,
      current_medications,
      past_surgeries,
      family_history,
    } = body

    if (!auth_user_id) {
      return NextResponse.json({ error: 'auth_user_id required' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()

    // Build update payload — only include fields that were sent
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (known_conditions    !== undefined) update.known_conditions    = known_conditions
    if (allergies           !== undefined) update.allergies           = allergies
    if (current_medications !== undefined) update.current_medications = current_medications
    if (past_surgeries      !== undefined) update.past_surgeries      = past_surgeries
    if (family_history      !== undefined) update.family_history      = family_history

    const { error } = await admin
      .from('patient')
      .update(update)
      .eq('auth_user_id', auth_user_id)

    if (error) {
      console.error('health profile update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('profile/patient/health PATCH error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/profile/patient/health?auth_user_id=xxx
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const auth_user_id = searchParams.get('auth_user_id')
  if (!auth_user_id) return NextResponse.json({ error: 'auth_user_id required' }, { status: 400 })

  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('patient')
    .select('known_conditions, allergies, current_medications, past_surgeries, family_history')
    .eq('auth_user_id', auth_user_id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data)  return NextResponse.json({ error: 'Patient not found' }, { status: 404 })

  return NextResponse.json({ health: data })
}
