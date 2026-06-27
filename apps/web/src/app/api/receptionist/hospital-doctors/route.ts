import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// GET /api/receptionist/hospital-doctors
// Returns APPROVED doctors linked to the calling receptionist's hospital.
export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? ''
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user }, error: userErr } = await supabaseAnon.auth.getUser(token)
  if (userErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()

  // Get receptionist's hospital
  const { data: rec } = await admin
    .from('receptionist')
    .select('id, hospital_id')
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (!rec) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Get all APPROVED doctors at this hospital via hospital_doctor junction
  const { data: links } = await admin
    .from('hospital_doctor')
    .select('doctor_id')
    .eq('hospital_id', rec.hospital_id)
    .eq('active', true)

  const doctorIds = (links ?? []).map(l => l.doctor_id)

  if (doctorIds.length === 0) {
    return NextResponse.json({ doctors: [], hospital_id: rec.hospital_id })
  }

  const { data: doctors, error } = await admin
    .from('doctor')
    .select('id, first_name, last_name, ayush_specialization, teleconsult_enabled, teleconsult_fee, languages_spoken')
    .in('id', doctorIds)
    .eq('verification_status', 'APPROVED')
    .order('last_name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ doctors: doctors ?? [], hospital_id: rec.hospital_id })
}
