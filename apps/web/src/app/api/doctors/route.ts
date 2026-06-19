import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || ''
  const specialization = searchParams.get('specialization') || ''
  const verified_only = searchParams.get('verified_only') !== 'false'

  let query = supabase
    .from('doctor')
    .select('id, full_name, specialization, verification_status, phone, email, bio')
    .order('full_name')

  if (verified_only) {
    query = query.eq('verification_status', 'APPROVED')
  }
  if (search) {
    query = query.ilike('full_name', `%${search}%`)
  }
  if (specialization) {
    query = query.ilike('specialization', `%${specialization}%`)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ doctors: data })
}
