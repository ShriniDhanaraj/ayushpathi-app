import { NextRequest, NextResponse } from 'next/server'
import { getDoctorProfile } from '@/lib/doctor-profile'

// GET /api/doctors/[id]  — public doctor profile (no auth required)
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const doctor = await getDoctorProfile(params.id)
  if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })
  return NextResponse.json({ doctor })
}
