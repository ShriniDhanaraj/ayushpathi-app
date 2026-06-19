/**
 * POST /api/receptionist/identify
 *
 * Step 1 of the GDPR two-step patient/doctor lookup.
 * Receptionist asks the caller for:
 *   - mobile (WhatsApp number they called from)
 *   - date_of_birth (YYYY-MM-DD)
 *   - first_name
 *   - last_name
 *
 * Returns:
 *   { found: true, type: 'patient'|'doctor', record_id, masked_address }
 *   or { found: false }
 *
 * The masked_address is shown to the receptionist who then asks the
 * caller to confirm it verbally — GDPR identity gate before any info is shared.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getHospitalAdminContext } from '@/lib/auth-context'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function maskAddress(line: string | null): string {
  if (!line) return '(no address on record)'
  // Show first 3 chars + asterisks + last 3 chars
  // e.g. "42 Gandhi Street" → "42 **********eet"
  if (line.length <= 6) return line
  return line.slice(0, 3) + '*'.repeat(line.length - 6) + line.slice(-3)
}

export async function POST(req: NextRequest) {
  // Must be a receptionist or hospital admin
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(token)
  if (userErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify caller is a receptionist or hospital admin
  const { data: rec } = await supabaseAdmin
    .from('receptionist')
    .select('id, hospital_id')
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  let hospitalId: string | null = rec?.hospital_id ?? null

  if (!hospitalId) {
    // Try hospital admin
    const { data: admin } = await supabaseAdmin
      .from('hospital_admin')
      .select('hospital_id, scope')
      .eq('auth_user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    hospitalId = admin.hospital_id ?? null
  }

  const body = await req.json()
  const { mobile, date_of_birth, first_name, last_name } = body

  if (!mobile || !date_of_birth || !first_name || !last_name) {
    return NextResponse.json(
      { error: 'mobile, date_of_birth, first_name, last_name are required' },
      { status: 400 }
    )
  }

  // Search patient
  const { data: patients } = await supabaseAdmin
    .from('patient')
    .select('id, first_name, last_name, date_of_birth, mobile, address_id')
    .eq('mobile', mobile)
    .eq('date_of_birth', date_of_birth)
    .ilike('first_name', first_name.trim())
    .ilike('last_name', last_name.trim())
    .limit(2)

  if (patients && patients.length === 1) {
    const p = patients[0]
    let addressLine: string | null = null

    if (p.address_id) {
      const { data: addr } = await supabaseAdmin
        .from('address')
        .select('address_line_1')
        .eq('id', p.address_id)
        .maybeSingle()
      addressLine = addr?.address_line_1 ?? null
    }

    return NextResponse.json({
      found: true,
      type: 'patient',
      record_id: p.id,
      masked_address: maskAddress(addressLine),
      // Receptionist sees this to ask the caller: "Can you confirm your address starts with..."
    })
  }

  if (patients && patients.length > 1) {
    // Collision — extremely rare with 4-key match, but handle gracefully
    return NextResponse.json({
      found: false,
      error: 'Multiple records matched — please ask for ABHA ID to disambiguate',
    }, { status: 409 })
  }

  // Search doctor
  const { data: doctors } = await supabaseAdmin
    .from('doctor')
    .select('id, first_name, last_name, date_of_birth, mobile, address_id')
    .eq('mobile', mobile)
    .eq('date_of_birth', date_of_birth)
    .ilike('first_name', first_name.trim())
    .ilike('last_name', last_name.trim())
    .limit(2)

  if (doctors && doctors.length === 1) {
    const d = doctors[0]
    let addressLine: string | null = null

    if (d.address_id) {
      const { data: addr } = await supabaseAdmin
        .from('address')
        .select('address_line_1')
        .eq('id', d.address_id)
        .maybeSingle()
      addressLine = addr?.address_line_1 ?? null
    }

    return NextResponse.json({
      found: true,
      type: 'doctor',
      record_id: d.id,
      masked_address: maskAddress(addressLine),
    })
  }

  return NextResponse.json({ found: false })
}
