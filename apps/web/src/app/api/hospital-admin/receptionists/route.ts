import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getHospitalAdminContext } from '@/lib/auth-context'

export async function GET(req: NextRequest) {
  const ctx = await getHospitalAdminContext(req)
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseAdmin()
  const isGlobal = ctx.scope === 'GLOBAL'

  let query = supabase
    .from('receptionist')
    .select('id, first_name, last_name, email, mobile, is_active, created_at, updated_at, created_by, updated_by, hospital:hospital_id(id, name)')
    .order('created_at', { ascending: false })

  if (!isGlobal && ctx.accessible_hospital_ids.length) {
    query = query.in('hospital_id', ctx.accessible_hospital_ids)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ receptionists: data })
}

export async function PATCH(req: NextRequest) {
  const ctx = await getHospitalAdminContext(req)
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseAdmin()
  const { id, is_active } = await req.json()

  // Verify the receptionist belongs to an accessible hospital
  const { data: rec } = await supabase
    .from('receptionist')
    .select('hospital_id')
    .eq('id', id)
    .single()

  if (!rec) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (ctx.scope !== 'GLOBAL' && rec.hospital_id && !ctx.accessible_hospital_ids.includes(rec.hospital_id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('receptionist')
    .update({ is_active, updated_by: ctx.auth_user_id })
    .eq('id', id)
    .select('id, first_name, last_name, is_active, updated_at, updated_by')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ receptionist: data })
}
