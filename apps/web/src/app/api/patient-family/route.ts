import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

async function resolveAccess(token: string, patientId: string): Promise<'allowed' | 'forbidden' | 'unauthorized'> {
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return 'unauthorized'

  // Patient accessing own record
  const { data: myPatient } = await supabaseAdmin
    .from('patient').select('id').eq('auth_user_id', user.id).maybeSingle()
  if (myPatient?.id === patientId) return 'allowed'

  // Doctor, receptionist, or hospital admin — staff can read
  const [{ data: doc }, { data: rec }, { data: adm }] = await Promise.all([
    supabaseAdmin.from('doctor').select('id').eq('auth_user_id', user.id).maybeSingle(),
    supabaseAdmin.from('receptionist').select('id').eq('auth_user_id', user.id).eq('is_active', true).maybeSingle(),
    supabaseAdmin.from('hospital_admin').select('id').eq('auth_user_id', user.id).eq('is_active', true).maybeSingle(),
  ])
  if (doc || rec || adm) return 'allowed'

  return 'forbidden'
}

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const patientId = searchParams.get('patient_id')
  if (!patientId) return NextResponse.json({ error: 'patient_id required' }, { status: 400 })

  const access = await resolveAccess(token, patientId)
  if (access === 'unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (access === 'forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabaseAdmin
    .from('patient_family')
    .select('id, relation_type, first_name, last_name, date_of_birth, known_conditions, allergies, notes, related_patient_id')
    .eq('patient_id', patientId)
    .order('relation_type')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ family_members: data ?? [] })
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { patient_id, relation_type, first_name, last_name, date_of_birth, known_conditions, allergies, notes } = body

  if (!patient_id || !relation_type) {
    return NextResponse.json({ error: 'patient_id and relation_type are required' }, { status: 400 })
  }

  const validRelations = ['FATHER','MOTHER','SPOUSE','SIBLING','CHILD','GRANDPARENT','OTHER']
  if (!validRelations.includes(relation_type)) {
    return NextResponse.json({ error: 'Invalid relation_type' }, { status: 400 })
  }

  // Ownership check: only the patient (or staff) can add family members
  const access = await resolveAccess(token, patient_id)
  if (access === 'unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (access === 'forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabaseAdmin
    .from('patient_family')
    .insert({
      patient_id, relation_type,
      first_name: first_name || null,
      last_name: last_name || null,
      date_of_birth: date_of_birth || null,
      known_conditions: known_conditions ?? [],
      allergies: allergies ?? [],
      notes: notes || null,
      created_by: user.id,
      updated_by: user.id,
    })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ family_member: data }, { status: 201 })
}
