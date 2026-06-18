import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

// GET /api/profile/patient?auth_user_id=xxx
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const auth_user_id = searchParams.get('auth_user_id')
  if (!auth_user_id) return NextResponse.json({ error: 'auth_user_id required' }, { status: 400 })

  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('patient')
    .select('*, address:address_id(*)')
    .eq('auth_user_id', auth_user_id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Patient not found' }, { status: 404 })

  return NextResponse.json({ patient: data })
}

// PATCH /api/profile/patient
// Body: { auth_user_id, first_name?, last_name?, date_of_birth?, gender?, mobile?,
//         street?, city?, state?, pincode?, door_number?, area?, district? }
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      auth_user_id,
      // patient PII fields
      first_name, last_name, date_of_birth, gender, mobile,
      // address fields
      door_number, street, area, city, district, state, pincode,
    } = body

    if (!auth_user_id) {
      return NextResponse.json({ error: 'auth_user_id required' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()

    // 1. Fetch current patient to get address_id
    const { data: current, error: fetchErr } = await admin
      .from('patient')
      .select('id, address_id')
      .eq('auth_user_id', auth_user_id)
      .maybeSingle()

    if (fetchErr || !current) {
      return NextResponse.json({ error: fetchErr?.message ?? 'Patient not found' }, { status: 404 })
    }

    // 2. Build patient update payload (only include non-undefined fields)
    const patientUpdate: Record<string, unknown> = {}
    if (first_name !== undefined) patientUpdate.first_name = first_name
    if (last_name !== undefined) patientUpdate.last_name = last_name
    if (date_of_birth !== undefined) patientUpdate.date_of_birth = date_of_birth
    if (gender !== undefined) patientUpdate.gender = gender
    if (mobile !== undefined) patientUpdate.mobile = mobile
    patientUpdate.updated_at = new Date().toISOString()

    if (Object.keys(patientUpdate).length > 1) {
      const { error: patErr } = await admin
        .from('patient')
        .update(patientUpdate)
        .eq('auth_user_id', auth_user_id)

      if (patErr) {
        console.error('patient update error:', patErr)
        return NextResponse.json({ error: patErr.message }, { status: 500 })
      }
    }

    // 3. Build address update payload
    const addressUpdate: Record<string, unknown> = {}
    if (door_number !== undefined) addressUpdate.door_number = door_number
    if (street !== undefined) addressUpdate.street = street
    if (area !== undefined) addressUpdate.area = area
    if (city !== undefined) addressUpdate.city = city
    if (district !== undefined) addressUpdate.district = district
    if (state !== undefined) addressUpdate.state = state
    if (pincode !== undefined) addressUpdate.pincode = pincode

    if (Object.keys(addressUpdate).length > 0 && current.address_id) {
      const { error: addrErr } = await admin
        .from('address')
        .update(addressUpdate)
        .eq('id', current.address_id)

      if (addrErr) {
        console.error('address update error:', addrErr)
        return NextResponse.json({ error: addrErr.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('profile/patient PATCH error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
