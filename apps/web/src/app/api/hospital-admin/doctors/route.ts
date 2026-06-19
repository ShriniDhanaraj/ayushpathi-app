import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getHospitalAdminContext } from '@/lib/auth-context'

export async function GET(req: NextRequest) {
  const ctx = await getHospitalAdminContext(req)
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseAdmin()
  const isGlobal = ctx.scope === 'GLOBAL'

  let query = supabase
    .from('hospital_doctor')
    .select(`
      id, active, joined_at, created_at, updated_at, created_by, updated_by,
      doctor:doctor_id(
        id, first_name, last_name, ayush_specialization,
        mobile, email, verification_status, years_of_experience
      ),
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

  // Verify admin can access this hospital
  if (ctx.scope !== 'GLOBAL' && !ctx.accessible_hospital_ids.includes(hospital_id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('hospital_doctor')
    .upsert(
      {
        doctor_id, hospital_id, active: true,
        created_by: ctx.auth_user_id, updated_by: ctx.auth_user_id,
      },
      { onConflict: 'hospital_id,doctor_id' }
    )
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ link: data }, { status: 201 })
}

// Remove a doctor from a hospital (soft deactivate)
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
