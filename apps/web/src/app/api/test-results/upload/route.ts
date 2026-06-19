import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(req: NextRequest) {
  // Validate JWT
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const appointmentId = formData.get('appointment_id') as string
  const patientId = formData.get('patient_id') as string
  const uploadedByRole = (formData.get('uploaded_by_role') as string) || 'DOCTOR'
  const notes = (formData.get('notes') as string) || null

  if (!file || !appointmentId || !patientId) {
    return NextResponse.json({ error: 'file, appointment_id, and patient_id are required' }, { status: 400 })
  }

  const allowedTypes = ['image/jpeg','image/png','image/webp','application/pdf','image/heic','image/heif']
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: 'File type not allowed. Use JPG, PNG, PDF, or HEIC.' }, { status: 400 })
  }
  if (file.size > 52428800) {
    return NextResponse.json({ error: 'File too large. Max 50 MB.' }, { status: 400 })
  }

  const ext = file.name.split('.').pop() ?? 'bin'
  const storagePath = `${patientId}/${appointmentId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`

  const arrayBuffer = await file.arrayBuffer()
  const { error: storageErr } = await supabaseAdmin.storage
    .from('test-results')
    .upload(storagePath, arrayBuffer, { contentType: file.type, upsert: false })

  if (storageErr) {
    console.error('Storage upload error:', storageErr)
    return NextResponse.json({ error: 'File upload failed: ' + storageErr.message }, { status: 500 })
  }

  // Get signed URL (valid 10 years — effectively permanent for private bucket)
  const { data: signedData } = await supabaseAdmin.storage
    .from('test-results')
    .createSignedUrl(storagePath, 60 * 60 * 24 * 365 * 10)

  const fileUrl = signedData?.signedUrl ?? storagePath

  const { data, error: insertErr } = await supabaseAdmin
    .from('test_result')
    .insert({
      appointment_id: appointmentId,
      patient_id: patientId,
      uploaded_by: user.id,
      uploaded_by_role: uploadedByRole,
      file_url: fileUrl,
      file_name: file.name,
      file_type: file.type,
      notes,
      created_by: user.id,
      updated_by: user.id,
    })
    .select()
    .single()

  if (insertErr) {
    console.error('Insert error:', insertErr)
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  return NextResponse.json({ test_result: data }, { status: 201 })
}
