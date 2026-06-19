import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

type Params = { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('hospital')
    .select('*, address(*), doctor_hospital(*, doctor(id, full_name, specialization, verification_status))')
    .eq('id', params.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ hospital: data })
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const supabase = getSupabaseAdmin()
  const body = await req.json()

  const allowed = ['name', 'registration_no', 'phone', 'email', 'website', 'ayush_specializations', 'is_active']
  const update: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) update[key] = body[key]
  }

  if (body.address) {
    const hosp = await supabase.from('hospital').select('address_id').eq('id', params.id).single()
    if (hosp.data?.address_id) {
      await supabase.from('address').update(body.address).eq('id', hosp.data.address_id)
    }
  }

  const { data, error } = await supabase
    .from('hospital')
    .update(update)
    .eq('id', params.id)
    .select('*, address(*)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ hospital: data })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('hospital')
    .update({ is_active: false })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
