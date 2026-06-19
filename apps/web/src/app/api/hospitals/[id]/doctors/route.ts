import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

type Params = { params: { id: string } }

// List doctors linked to this hospital
export async function GET(_req: NextRequest, { params }: Params) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('doctor_hospital')
    .select('*, doctor(id, full_name, specialization, verification_status, phone)')
    .eq('hospital_id', params.id)
    .order('joined_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ links: data })
}

// Link a doctor to this hospital
export async function POST(req: NextRequest, { params }: Params) {
  const supabase = getSupabaseAdmin()
  const { doctor_id, role = 'VISITING', is_primary = false } = await req.json()

  if (!doctor_id) return NextResponse.json({ error: 'doctor_id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('doctor_hospital')
    .upsert(
      { doctor_id, hospital_id: params.id, role, is_primary },
      { onConflict: 'doctor_id,hospital_id' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ link: data }, { status: 201 })
}

// Unlink a doctor from this hospital
export async function DELETE(req: NextRequest, { params }: Params) {
  const supabase = getSupabaseAdmin()
  const { doctor_id } = await req.json()

  if (!doctor_id) return NextResponse.json({ error: 'doctor_id required' }, { status: 400 })

  const { error } = await supabase
    .from('doctor_hospital')
    .delete()
    .eq('hospital_id', params.id)
    .eq('doctor_id', doctor_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
