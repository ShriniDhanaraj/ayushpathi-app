import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getHospitalAdminContext } from '@/lib/auth-context'

export async function GET(req: NextRequest) {
  const ctx = await getHospitalAdminContext(req)
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseAdmin()
  const { searchParams } = new URL(req.url)

  const date     = searchParams.get('date') ?? new Date().toISOString().split('T')[0]
  const status   = searchParams.get('status')
  const doctor_id = searchParams.get('doctor_id')
  const page     = parseInt(searchParams.get('page') ?? '1')
  const limit    = parseInt(searchParams.get('limit') ?? '50')
  const offset   = (page - 1) * limit

  const isGlobal = ctx.scope === 'GLOBAL'

  let query = supabase
    .from('appointment')
    .select(`
      id, appointment_date, start_time, end_time, status, type, is_walk_in,
      booked_by_role, notes, created_at, updated_at, created_by, updated_by,
      patient:patient_id(id, first_name, last_name, mobile),
      doctor:doctor_id(id, first_name, last_name, ayush_specialization),
      hospital:hospital_id(id, name)
    `, { count: 'exact' })
    .eq('appointment_date', date)
    .order('start_time')
    .range(offset, offset + limit - 1)

  if (!isGlobal && ctx.accessible_hospital_ids.length) {
    query = query.in('hospital_id', ctx.accessible_hospital_ids)
  }
  if (status) query = query.eq('status', status)
  if (doctor_id) query = query.eq('doctor_id', doctor_id)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    appointments: data,
    total: count ?? 0,
    page,
    limit,
    pages: Math.ceil((count ?? 0) / limit),
  })
}
