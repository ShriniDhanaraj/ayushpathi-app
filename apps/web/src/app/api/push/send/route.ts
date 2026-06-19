import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

interface ExpoPushMessage {
  to: string
  title: string
  body: string
  data?: Record<string, unknown>
  sound?: 'default'
}

async function sendExpoNotifications(messages: ExpoPushMessage[]) {
  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
    },
    body: JSON.stringify(messages),
  })
  return res.json()
}

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  const { user_ids, title, body, data } = await req.json()

  if (!user_ids?.length || !title || !body) {
    return NextResponse.json({ error: 'user_ids, title, body are required' }, { status: 400 })
  }

  // Fetch all push tokens for these users
  const { data: tokens, error } = await supabase
    .from('device_push_token')
    .select('token')
    .in('user_id', user_ids)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!tokens?.length) return NextResponse.json({ sent: 0, message: 'No registered devices' })

  const messages: ExpoPushMessage[] = tokens.map((t) => ({
    to: t.token,
    title,
    body,
    sound: 'default',
    data: data ?? {},
  }))

  const result = await sendExpoNotifications(messages)
  return NextResponse.json({ sent: messages.length, result })
}
