import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  const { user_id, token, platform } = await req.json()

  if (!user_id || !token) {
    return NextResponse.json({ error: 'user_id and token are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('device_push_token')
    .upsert(
      { user_id, token, platform: platform ?? 'expo' },
      { onConflict: 'user_id,token' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ device: data }, { status: 201 })
}
