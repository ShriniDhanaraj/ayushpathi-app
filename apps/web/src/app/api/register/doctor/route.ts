import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      auth_user_id,
      first_name, last_name, gender, mobile, email,
      registration_number, registration_council,
      degrees, ayush_specialization, years_of_experience,
      languages_spoken,
      degree_cert_url, registration_cert_url,
    } = body

    if (!auth_user_id || !first_name || !email || !registration_number) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()

    const { data: doctor, error: docErr } = await admin.from('doctor').insert({
      first_name, last_name, gender, mobile, email,
      registration_number, registration_council,
      degrees: degrees ?? [],
      ayush_specialization,
      years_of_experience: parseInt(years_of_experience) || 0,
      languages_spoken: languages_spoken ?? ['English'],
      degree_cert_url: degree_cert_url ?? null,
      registration_cert_url: registration_cert_url ?? null,
      auth_user_id,
      verification_status: 'PENDING',
    }).select().single()

    if (docErr) {
      console.error('doctor insert error:', docErr)
      return NextResponse.json({ error: docErr.message }, { status: 500 })
    }

    return NextResponse.json({ doctor_id: doctor.id })
  } catch (err) {
    console.error('register/doctor error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
