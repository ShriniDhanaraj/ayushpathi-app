import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getHospitalAdminContext } from '@/lib/auth-context'

const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// PATCH /api/hospital-admin/doctors/[id]/verify
// Body: { action: 'APPROVE' | 'REJECT', rejection_reason?: string }
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Authenticate admin
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Resolve admin scope
  const ctx = await getHospitalAdminContext(req)
  if (!ctx) return NextResponse.json({ error: 'Forbidden — hospital admin role required' }, { status: 403 })

  const { action, rejection_reason } = await req.json() as {
    action: 'APPROVE' | 'REJECT'
    rejection_reason?: string
  }

  if (!['APPROVE', 'REJECT'].includes(action)) {
    return NextResponse.json({ error: "action must be 'APPROVE' or 'REJECT'" }, { status: 400 })
  }
  if (action === 'REJECT' && !rejection_reason?.trim()) {
    return NextResponse.json({ error: 'rejection_reason required when rejecting' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  // For HOSPITAL/GROUP scope: verify doctor is affiliated with an accessible hospital
  if (ctx.scope !== 'GLOBAL') {
    const { data: link } = await supabase
      .from('hospital_doctor')
      .select('id')
      .eq('doctor_id', params.id)
      .in('hospital_id', ctx.accessible_hospital_ids)
      .maybeSingle()

    if (!link) {
      return NextResponse.json({ error: 'Doctor not affiliated with your hospital(s)' }, { status: 403 })
    }
  }

  const updates: Record<string, unknown> = {
    verification_status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
    verified_by: user.id,
    verified_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    updated_by: user.id,
  }
  if (action === 'REJECT') updates.rejection_reason = rejection_reason

  const { error: updateError } = await supabase
    .from('doctor')
    .update(updates)
    .eq('id', params.id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({ ok: true, status: updates.verification_status })
}
