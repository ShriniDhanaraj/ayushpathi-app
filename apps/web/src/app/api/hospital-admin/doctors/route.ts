import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getHospitalAdminContext } from '@/lib/auth-context'

export async function GET(req: NextRequest) {
  const ctx = await getHospitalAdminContext(req)
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase  = getSupabaseAdmin()
  const isGlobal  = ctx.scope === 'GLOBAL'
  const statusFilter = new URL(req.url).searchParams.get('status')

  // ?status=PENDING → return pending doctors affiliated with this admin's hospitals
  if (statusFilter === 'PENDING') {
    let pendingQuery = supabase
      .from('doctor')
      .select('id, first_name, last_name, ayush_specialization, mobile, email, registration_number, registration_council, degrees, years_of_experience, created_at')
      .eq('verification_status', 'PENDING')
      .order('created_at', { ascending: false })

    // Non-global admins: only doctors linked to their hospitals
    if (!isGlobal && ctx.accessible_hospital_ids.length) {
      const { data: linked } = await supabase
        .from('hospital_doctor')
        .select('doctor_id')
        .in('hospital_id', ctx.accessible_hospital_ids)
      const doctorIds = (linked ?? []).map(l => l.doctor_id)
      if (doctorIds.length === 0) return NextResponse.json({ pending: [] })
      pendingQuery = pendingQuery.in('id', doctorIds)
    }

    const { data, error } = await pendingQuery
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ pending: data ?? [] })
  }

  // Default: return hospital_doctor links
  let query = supabase
    .from('hospital_doctor')
    .select(`
      id, active, joined_at, created_at, updated_at, created_by, updated_by,
      doctor:doctor_id(id, first_name, last_name, ayush_specialization, mobile, email, verification_status, years_of_experience),
      hospital:hospital_id(id, name)
    `)
    .order('joined_at', { ascending: false })

  if (!isGlobal && ctx.accessible_hospital_ids.length) {
    query = query.in('hospital_id', ctx.accessible_hospital_ids)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ doctors: data })
}

// Link a doctor to a hospital
export async function POST(req: NextRequest) {
  const ctx = await getHospitalAdminContext(req)
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseAdmin()
  const { doctor_id, hospital_id } = await req.json()

  if (ctx.scope !== 'GLOBAL' && !ctx.accessible_hospital_ids.includes(hospital_id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('hospital_doctor')
    .upsert(
      { doctor_id, hospital_id, active: true, created_by: ctx.auth_user_id, updated_by: ctx.auth_user_id },
      { onConflict: 'hospital_id,doctor_id' }
    )
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ link: data }, { status: 201 })
}

// Soft-remove a doctor from a hospital
export async function DELETE(req: NextRequest) {
  const ctx = await getHospitalAdminContext(req)
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseAdmin()
  const { doctor_id, hospital_id } = await req.json()

  if (ctx.scope !== 'GLOBAL' && !ctx.accessible_hospital_ids.includes(hospital_id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await supabase
    .from('hospital_doctor')
    .update({ active: false, updated_by: ctx.auth_user_id })
    .eq('doctor_id', doctor_id)
    .eq('hospital_id', hospital_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
