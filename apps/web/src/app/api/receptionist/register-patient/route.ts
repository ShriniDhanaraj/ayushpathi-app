/**
 * POST /api/receptionist/register-patient
 * Receptionist-initiated patient registration.
 * Creates Supabase auth account (email + default password) then inserts the patient record.
 * Patient can reset password via /auth/forgot-password.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()

  const { data: { user: caller }, error: authErr } = await admin.auth.getUser(token)
  if (authErr || !caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Must be receptionist or hospital admin
  const { data: rec } = await admin
    .from('receptionist').select('id').eq('auth_user_id', caller.id).eq('is_active', true).maybeSingle()
  const { data: hadmin } = !rec
    ? await admin.from('hospital_admin').select('id').eq('auth_user_id', caller.id).eq('is_active', true).maybeSingle()
    : { data: null }

  if (!rec && !hadmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const {
    first_name, last_name, date_of_birth, gender,
    email, mobile, whatsapp_enabled = true, communication_consent = ['WHATSAPP'],
    door_number, street, area, city, district, state, pincode,
    guardian_name, guardian_mobile,
    known_languages = ['EN'],
    ui_language = 'EN',
    preferred_interaction_language = 'EN',
  } = body

  if (!first_name || !last_name || !email || !mobile || !city || !state) {
    return NextResponse.json(
      { error: 'first_name, last_name, email, mobile, city, state are required' },
      { status: 400 }
    )
  }

  // 1. Create Supabase auth user
  const { data: authData, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: 'Ayush@2026!',
    email_confirm: true,
    user_metadata: { role: 'patient', first_name, last_name },
  })

  if (createErr) {
    if (createErr.message?.includes('already been registered') || createErr.message?.includes('already exists')) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Ask the patient to log in directly.' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: createErr.message }, { status: 500 })
  }

  const auth_user_id = authData.user.id

  // 2. Insert address
  const { data: addr, error: addrErr } = await admin.from('address').insert({
    door_number: door_number ?? null, street: street ?? null,
    area: area ?? null, city, district: district ?? null,
    state, pincode: pincode ?? null, country: 'India',
  }).select().single()

  if (addrErr) {
    await admin.auth.admin.deleteUser(auth_user_id)
    return NextResponse.json({ error: addrErr.message }, { status: 500 })
  }

  // 3. Insert patient record
  const isMinor = date_of_birth
    ? new Date(date_of_birth) > new Date(new Date().setFullYear(new Date().getFullYear() - 18))
    : false

  const { data: patient, error: patErr } = await admin.from('patient').insert({
    first_name, last_name, date_of_birth: date_of_birth ?? null, gender: gender ?? null,
    email, mobile, whatsapp_enabled, communication_consent,
    address_id: addr.id, auth_user_id,
    known_languages, ui_language, preferred_interaction_language,
    ...(isMinor && guardian_name ? {
      guardian_name, guardian_mobile,
      guardian_consent_at: new Date().toISOString(),
    } : {}),
  }).select('id, first_name, last_name').single()

  if (patErr) {
    await admin.auth.admin.deleteUser(auth_user_id)
    await admin.from('address').delete().eq('id', addr.id)
    return NextResponse.json({ error: patErr.message }, { status: 500 })
  }

  return NextResponse.json({
    patient_id: patient.id,
    first_name: patient.first_name,
    last_name: patient.last_name,
    message: 'Patient registered. Temp password: Ayush@2026! — ask them to reset via forgot-password.',
  }, { status: 201 })
}
