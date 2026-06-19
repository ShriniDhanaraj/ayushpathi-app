import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || ''
  const active = searchParams.get('active')

  let query = supabase
    .from('hospital')
    .select('*, address(*)')
    .order('name')

  if (search) {
    query = query.ilike('name', `%${search}%`)
  }
  if (active !== null) {
    query = query.eq('is_active', active === 'true')
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ hospitals: data })
}

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  const body = await req.json()

  const { name, registration_no, phone, email, website, ayush_specializations, address } = body

  if (!name || !registration_no) {
    return NextResponse.json({ error: 'name and registration_no are required' }, { status: 400 })
  }

  let address_id: string | null = null
  if (address) {
    const { data: addrRow, error: addrErr } = await supabase
      .from('address')
      .insert({
        street: address.street,
        city: address.city,
        district: address.district,
        state: address.state,
        pincode: address.pincode,
        latitude: address.latitude ?? null,
        longitude: address.longitude ?? null,
      })
      .select('id')
      .single()
    if (addrErr) return NextResponse.json({ error: addrErr.message }, { status: 500 })
    address_id = addrRow.id
  }

  const { data, error } = await supabase
    .from('hospital')
    .insert({
      name,
      registration_no,
      phone: phone ?? null,
      email: email ?? null,
      website: website ?? null,
      ayush_specializations: ayush_specializations ?? [],
      address_id,
      is_active: true,
    })
    .select('*, address(*)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ hospital: data }, { status: 201 })
}
