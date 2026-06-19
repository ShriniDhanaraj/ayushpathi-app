import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getHospitalAdminContext } from '@/lib/auth-context'

// GET /api/admin/stats — aggregate stats for GROUP/GLOBAL admin
export async function GET(req: NextRequest) {
  const ctx = await getHospitalAdminContext(req)
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (ctx.scope === 'HOSPITAL') {
    return NextResponse.json({ error: 'Use /api/hospital-admin/stats' }, { status: 403 })
  }

  const supabase = getSupabaseAdmin()
  const today = new Date().toISOString().split('T')[0]
  const isGlobal = ctx.scope === 'GLOBAL'
  const hospitalIds = ctx.accessible_hospital_ids

  function applyHospitalFilter<T>(q: T & { in: Function }): T {
    if (!isGlobal && hospitalIds.length > 0) {
      return q.in('hospital_id', hospitalIds) as T
    }
    return q
  }

  // Total hospitals in scope
  let hospQuery = supabase.from('hospital').select('id', { count: 'exact', head: true }).eq('active', true)
  if (!isGlobal && hospitalIds.length > 0) hospQuery = hospQuery.in('id', hospitalIds)
  const { count: totalHospitals } = await hospQuery

  // Today's appointment totals
  let apptQ = supabase.from('appointment').select('status', { count: 'exact' }).eq('appointment_date', today)
  if (!isGlobal && hospitalIds.length > 0) apptQ = apptQ.in('hospital_id', hospitalIds)
  const { data: appts } = await apptQ

  const apptsList = appts ?? []
  const totalAppts = apptsList.length
  const completedAppts = apptsList.filter(a => a.status === 'COMPLETED').length
  const cancelledAppts = apptsList.filter(a => a.status === 'CANCELLED').length
  const inClinicAppts = apptsList.filter(a => a.status === 'ARRIVED').length

  // Active doctors across hospitals
  let docQ = supabase.from('hospital_doctor').select('id', { count: 'exact', head: true }).eq('active', true)
  if (!isGlobal && hospitalIds.length > 0) docQ = docQ.in('hospital_id', hospitalIds)
  const { count: totalDoctors } = await docQ

  // Prescriptions pending sign-off (global count)
  const { count: rxPending } = await supabase
    .from('prescription')
    .select('id', { count: 'exact', head: true })
    .eq('verified_by_doctor', false)
    .neq('entry_method', 'DOCTOR_DIRECT')

  return NextResponse.json({
    scope: ctx.scope,
    date: today,
    hospitals: totalHospitals ?? 0,
    appointments: {
      total: totalAppts,
      completed: completedAppts,
      in_clinic: inClinicAppts,
      cancelled: cancelledAppts,
      pending: totalAppts - completedAppts - cancelledAppts - inClinicAppts,
    },
    doctors: totalDoctors ?? 0,
    prescriptions_pending_verification: rxPending ?? 0,
  })
}
