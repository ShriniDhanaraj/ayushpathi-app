import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  const { searchParams } = new URL(req.url)
  const search         = searchParams.get('search')         || ''
  const specialization = searchParams.get('specialization') || ''
  const language       = searchParams.get('language')       || ''
  const city           = searchParams.get('city')           || ''
  const verified_only  = searchParams.get('verified_only') !== 'false'

  let query = supabase
    .from('doctor')
    .select(`
      id, first_name, last_name, ayush_specialization,
      verification_status, years_of_experience,
      languages_spoken, profile_photo_url,
      address:address_id(city, state)
    `)
    .order('last_name')

  if (verified_only)   query = query.eq('verification_status', 'APPROVED')
  if (specialization)  query = query.eq('ayush_specialization', specialization)
  if (language)        query = query.contains('languages_spoken', [language])
  if (search)          query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // City filter is applied in-memory since address is a joined table
  let doctors = data ?? []
  if (city) {
    const c = city.toLowerCase()
    doctors = doctors.filter(d => {
      const addr = Array.isArray(d.address) ? d.address[0] : d.address
      return addr?.city?.toLowerCase().includes(c) || addr?.state?.toLowerCase().includes(c)
    })
  }

  return NextResponse.json({ doctors })
}
