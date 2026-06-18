import { createSupabaseServerClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat    = parseFloat(searchParams.get('lat')    ?? '0')
  const lng    = parseFloat(searchParams.get('lng')    ?? '0')
  const radius = parseFloat(searchParams.get('radius') ?? '10')
  const spec   = searchParams.get('specialization')    ?? null

  if (!lat || !lng) return NextResponse.json({ error: 'lat/lng required' }, { status: 400 })

  const supabase = createSupabaseServerClient()
  let query = supabase.rpc('doctors_near_location', { p_lat: lat, p_lng: lng, p_radius_km: radius })
  if (spec) query = query.eq('ayush_specialization', spec)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ doctors: data ?? [] })
}
