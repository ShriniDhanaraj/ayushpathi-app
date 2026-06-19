import { createSupabaseServerClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat      = parseFloat(searchParams.get('lat')    ?? '0')
  const lng      = parseFloat(searchParams.get('lng')    ?? '0')
  const radius   = parseFloat(searchParams.get('radius') ?? '10')
  const spec     = searchParams.get('specialization')    ?? null
  // Optional: filter by doctor's consultation language
  const lang     = searchParams.get('language')          ?? null

  if (!lat || !lng) return NextResponse.json({ error: 'lat/lng required' }, { status: 400 })

  const supabase = createSupabaseServerClient()
  let query = supabase.rpc('doctors_near_location', { p_lat: lat, p_lng: lng, p_radius_km: radius })
  if (spec) query = query.eq('ayush_specialization', spec)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Apply language filter in JS (the RPC returns all doctors; filter post-fetch).
  // When the RPC is customised to accept the language param, this can move to SQL.
  let doctors = data ?? []
  if (lang) {
    doctors = doctors.filter((d: { languages_spoken: string[] }) =>
      Array.isArray(d.languages_spoken) && d.languages_spoken.includes(lang)
    )
  }

  return NextResponse.json({ doctors })
}
