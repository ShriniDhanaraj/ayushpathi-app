import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      auth_user_id,
      first_name, last_name, date_of_birth, gender,
      email, mobile, whatsapp_enabled, communication_consent,
      door_number, street, area, city, district, state, pincode,
      guardian_name, guardian_mobile,
      // Language preferences (all mandatory — validated below)
      known_languages,
      ui_language,
      preferred_interaction_language,
    } = body

    if (!auth_user_id || !first_name || !email || !city || !state) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Language fields are mandatory
    if (
      !known_languages || !Array.isArray(known_languages) || known_languages.length === 0
    ) {
      return NextResponse.json({ error: 'At least one known language is required' }, { status: 400 })
    }
    if (!ui_language) {
      return NextResponse.json({ error: 'App display language is required' }, { status: 400 })
    }
    if (!preferred_interaction_language) {
      return NextResponse.json({ error: 'Preferred consultation language is required' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()

    // 1. Insert address (service role — bypasses RLS)
    const { data: addr, error: addrErr } = await admin.from('address').insert({
      door_number, street, area, city, district, state,
      pincode, country: 'India',
    }).select().single()

    if (addrErr) {
      console.error('address insert error:', addrErr)
      return NextResponse.json({ error: addrErr.message }, { status: 500 })
    }

    // 2. Insert patient (service role — bypasses RLS)
    const isMinor = date_of_birth
      ? new Date(date_of_birth) > new Date(new Date().setFullYear(new Date().getFullYear() - 18))
      : false

    const { data: patient, error: patErr } = await admin.from('patient').insert({
      first_name, last_name, date_of_birth, gender,
      email, mobile, whatsapp_enabled,
      communication_consent: communication_consent ?? ['WHATSAPP'],
      address_id: addr.id,
      auth_user_id,
      // Language preferences
      known_languages,
      ui_language,
      preferred_interaction_language,
      ...(isMinor && guardian_name ? {
        guardian_name,
        guardian_mobile,
        guardian_consent_at: new Date().toISOString(),
      } : {}),
    }).select().single()

    if (patErr) {
      console.error('patient insert error:', patErr)
      // Clean up address on failure
      await admin.from('address').delete().eq('id', addr.id)
      return NextResponse.json({ error: patErr.message }, { status: 500 })
    }

    return NextResponse.json({ patient_id: patient.id })
  } catch (err) {
    console.error('register/patient error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
