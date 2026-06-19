import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  const { searchParams } = new URL(req.url)
  const search            = searchParams.get('search')           || ''
  const specialization    = searchParams.get('specialization')   || ''
  const verified_only     = searchParams.get('verified_only') !== 'false'

  let query = supabase
    .from('doctor')
    .select('id, first_name, last_name, ayush_specialization, verification_status, mobile, email, years_of_experience, languages_spoken')
    .order('last_name')

  if (verified_only)   query = query.eq('verification_status', 'APPROVED')
  if (specialization)  query = query.eq('ayush_specialization', specialization)
  if (search)          query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ doctors: data })
}
