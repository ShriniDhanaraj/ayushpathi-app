import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getHospitalAdminContext } from '@/lib/auth-context'

// GET /api/admin/hospitals — list hospitals accessible to this GROUP/GLOBAL admin
// Returns each hospital with today's appointment count
export async function GET(req: NextRequest) {
  const ctx = await getHospitalAdminContext(req)
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (ctx.scope === 'HOSPITAL') {
    return NextResponse.json({ error: 'Use /api/hospital-admin for HOSPITAL scope' }, { status: 403 })
  }

  const supabase = getSupabaseAdmin()
  const today = new Date().toISOString().split('T')[0]
  const isGlobal = ctx.scope === 'GLOBAL'

  // Fetch hospitals
  let hospitalsQuery = supabase
    .from('hospital')
    .select('id, name, city, state, whatsapp_number, active, hospital_group_id')
    .eq('active', true)
    .order('name')

  if (!isGlobal && ctx.accessible_hospital_ids.length > 0) {
    hospitalsQuery = hospitalsQuery.in('id', ctx.accessible_hospital_ids)
  }

  const { data: hospitals, error } = await hospitalsQuery
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const hospitalIds = (hospitals ?? []).map(h => h.id)
  if (hospitalIds.length === 0) return NextResponse.json({ hospitals: [] })

  // Per-hospital today's appointment counts
  const { data: apptCounts } = await supabase
    .from('appointment')
    .select('hospital_id, status')
    .in('hospital_id', hospitalIds)
    .eq('appointment_date', today)

  // Per-hospital doctor counts
  const { data: doctorCounts } = await supabase
    .from('hospital_doctor')
    .select('hospital_id')
    .in('hospital_id', hospitalIds)
    .eq('active', true)

  // Build per-hospital summary
  const result = (hospitals ?? []).map(h => {
    const appts = (apptCounts ?? []).filter(a => a.hospital_id === h.id)
    const doctors = (doctorCounts ?? []).filter(d => d.hospital_id === h.id).length
    return {
      id: h.id,
      name: h.name,
      city: h.city,
      state: h.state,
      whatsapp_number: h.whatsapp_number,
      hospital_group_id: h.hospital_group_id,
      stats: {
        appointments_today: appts.length,
        completed: appts.filter(a => a.status === 'COMPLETED').length,
        in_clinic: appts.filter(a => a.status === 'ARRIVED').length,
        cancelled: appts.filter(a => a.status === 'CANCELLED').length,
        doctors,
      },
    }
  })

  return NextResponse.json({ hospitals: result, scope: ctx.scope })
}
