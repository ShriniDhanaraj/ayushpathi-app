import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const PLATFORM_WA = '919361287432'

const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  const token = req.headers.get('authorization')?.replace('Bearer ', '')

  if (!token) return NextResponse.json({ whatsapp: PLATFORM_WA, source: 'platform' })
  const { data: { user } } = await supabaseAnon.auth.getUser(token)
  if (!user) return NextResponse.json({ whatsapp: PLATFORM_WA, source: 'platform' })

  // Patient → most recent hospital WA
  const { data: patient } = await supabase
    .from('patient').select('id').eq('auth_user_id', user.id).maybeSingle()
  if (patient) {
    const { data: apt } = await supabase
      .from('appointment')
      .select('hospital:hospital_id(whatsapp_number, name)')
      .eq('patient_id', patient.id).not('hospital_id', 'is', null)
      .order('appointment_date', { ascending: false }).limit(1).maybeSingle()
    const h = apt?.hospital as { whatsapp_number?: string; name?: string } | null
    if (h?.whatsapp_number) return NextResponse.json({ whatsapp: h.whatsapp_number, source: 'hospital', name: h.name })
    return NextResponse.json({ whatsapp: PLATFORM_WA, source: 'platform' })
  }

  // Doctor → primary hospital WA
  const { data: doctor } = await supabase
    .from('doctor').select('id').eq('auth_user_id', user.id).maybeSingle()
  if (doctor) {
    const { data: link } = await supabase
      .from('hospital_doctor')
      .select('hospital:hospital_id(whatsapp_number, name)')
      .eq('doctor_id', doctor.id).eq('active', true)
      .order('joined_at', { ascending: false }).limit(1).maybeSingle()
    const h = link?.hospital as { whatsapp_number?: string; name?: string } | null
    if (h?.whatsapp_number) return NextResponse.json({ whatsapp: h.whatsapp_number, source: 'hospital', name: h.name })
    return NextResponse.json({ whatsapp: PLATFORM_WA, source: 'platform' })
  }

  // Receptionist → hospital WA
  const { data: rec } = await supabase
    .from('receptionist').select('hospital:hospital_id(whatsapp_number, name)').eq('auth_user_id', user.id).maybeSingle()
  if (rec) {
    const h = rec.hospital as { whatsapp_number?: string; name?: string } | null
    if (h?.whatsapp_number) return NextResponse.json({ whatsapp: h.whatsapp_number, source: 'hospital', name: h.name })
  }

  // Hospital admin → group WA or platform
  const { data: admin } = await supabase
    .from('hospital_admin')
    .select('scope, hospital_group:hospital_group_id(whatsapp_number)')
    .eq('auth_user_id', user.id).maybeSingle()
  if (admin?.scope === 'HOSPITAL') {
    const g = admin.hospital_group as { whatsapp_number?: string } | null
    if (g?.whatsapp_number) return NextResponse.json({ whatsapp: g.whatsapp_number, source: 'group' })
  }

  return NextResponse.json({ whatsapp: PLATFORM_WA, source: 'platform' })
}
