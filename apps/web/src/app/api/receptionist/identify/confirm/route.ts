/**
 * POST /api/receptionist/identify/confirm
 *
 * Step 2 of the GDPR two-step patient/doctor lookup.
 * After Step 1 returns masked_address, receptionist asks the caller
 * to confirm their address verbally. Receptionist then submits:
 *   { record_id, type: 'patient'|'doctor', address_input }
 *
 * This endpoint checks address_input against the stored address_line_1
 * (case-insensitive, trimmed).
 *
 * On match → returns safe profile fields the receptionist can use.
 * On mismatch → returns { confirmed: false } (do NOT reveal why).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function normalize(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(token)
  if (userErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Must be receptionist or hospital admin
  const { data: rec } = await supabaseAdmin
    .from('receptionist')
    .select('id')
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (!rec) {
    const { data: admin } = await supabaseAdmin
      .from('hospital_admin')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { record_id, type, address_input } = body

  if (!record_id || !type || !address_input) {
    return NextResponse.json({ error: 'record_id, type, address_input required' }, { status: 400 })
  }

  const table = type === 'doctor' ? 'doctor' : 'patient'

  // Fetch address_line_1 for this record
  const { data: record } = await supabaseAdmin
    .from(table)
    .select('id, first_name, last_name, mobile, email, address_id')
    .eq('id', record_id)
    .maybeSingle()

  if (!record) return NextResponse.json({ confirmed: false })

  let storedLine: string | null = null
  if (record.address_id) {
    const { data: addr } = await supabaseAdmin
      .from('address')
      .select('address_line_1, area, city, state, pincode')
      .eq('id', record.address_id)
      .maybeSingle()

    storedLine = addr?.address_line_1 ?? null

    if (storedLine && normalize(storedLine) === normalize(address_input)) {
      // ✅ GDPR confirmed — return safe fields for receptionist use
      return NextResponse.json({
        confirmed: true,
        type,
        profile: {
          id: record.id,
          first_name: record.first_name,
          last_name: record.last_name,
          mobile: record.mobile,
          email: record.email,
          address: addr
            ? `${addr.address_line_1 ?? ''}, ${addr.area ?? ''}, ${addr.city}, ${addr.state} ${addr.pincode ?? ''}`.replace(/,\s*,/g, ',').trim()
            : null,
        },
      })
    }
  }

  // No address on record — auto-confirm (can't validate what doesn't exist)
  // but flag it so receptionist knows
  if (!storedLine) {
    return NextResponse.json({
      confirmed: true,
      type,
      warning: 'No address on record — identity confirmed by 3-key match only',
      profile: {
        id: record.id,
        first_name: record.first_name,
        last_name: record.last_name,
        mobile: record.mobile,
        email: record.email,
        address: null,
      },
    })
  }

  // Address doesn't match
  return NextResponse.json({ confirmed: false })
}
