import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getHospitalAdminContext } from '@/lib/auth-context'

export async function GET(req: NextRequest) {
  const ctx = await getHospitalAdminContext(req)
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseAdmin()
  const today = new Date().toISOString().split('T')[0]

  // Build hospital filter
  const hospitalIds = ctx.accessible_hospital_ids
  const isGlobal = ctx.scope === 'GLOBAL'

  async function countApts(status?: string) {
    let q = supabase.from('appointment').select('id', { count: 'exact', head: true })
      .eq('appointment_date', today)
    if (!isGlobal && hospitalIds.length) q = q.in('hospital_id', hospitalIds)
    if (status) q = q.eq('status', status)
    const { count } = await q
    return count ?? 0
  }

  async function countDoctors() {
    let q = supabase.from('hospital_doctor').select('id', { count: 'exact', head: true })
      .eq('active', true)
    if (!isGlobal && hospitalIds.length) q = q.in('hospital_id', hospitalIds)
    const { count } = await q
    return count ?? 0
  }

  async function countReceptionists() {
    let q = supabase.from('receptionist').select('id', { count: 'exact', head: true })
      .eq('is_active', true)
    if (!isGlobal && hospitalIds.length) q = q.in('hospital_id', hospitalIds)
    const { count } = await q
    return count ?? 0
  }

  async function countPrescriptionsToVerify() {
    let q = supabase.from('prescription').select('id', { count: 'exact', head: true })
      .eq('verified_by_doctor', false)
      .eq('entry_method', 'RECEPTIONIST')
    // Can't filter prescriptions by hospital_id directly — approximate via today's consultations
    const { count } = await q
    return count ?? 0
  }

  const [
    apts_total, apts_completed, apts_no_show, apts_arrived,
    doctor_count, receptionist_count, rx_to_verify,
  ] = await Promise.all([
    countApts(), countApts('COMPLETED'), countApts('NO_SHOW'), countApts('ARRIVED'),
    countDoctors(), countReceptionists(), countPrescriptionsToVerify(),
  ])

  return NextResponse.json({
    date: today,
    appointments: {
      total: apts_total,
      completed: apts_completed,
      in_clinic: apts_arrived,
      no_show: apts_no_show,
      pending: apts_total - apts_completed - apts_no_show,
    },
    doctors: doctor_count,
    receptionists: receptionist_count,
    prescriptions_pending_verification: rx_to_verify,
  })
}
