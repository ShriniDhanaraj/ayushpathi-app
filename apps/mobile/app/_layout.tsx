import { useEffect, useState } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

type UserRole = 'patient' | 'doctor-approved' | 'doctor-pending' | 'unknown'

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null)
  const [role, setRole] = useState<UserRole>('unknown')
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const segments = useSegments()

  async function detectRole(userId: string): Promise<UserRole> {
    // Check doctor table first
    const { data: doctorRow } = await supabase
      .from('doctor')
      .select('verification_status')
      .eq('auth_user_id', userId)
      .maybeSingle()

    if (doctorRow) {
      return doctorRow.verification_status === 'APPROVED'
        ? 'doctor-approved'
        : 'doctor-pending'
    }

    // Check patient table
    const { data: patientRow } = await supabase
      .from('patient')
      .select('id')
      .eq('auth_user_id', userId)
      .maybeSingle()
    if (patientRow) return 'patient'

    // Fallback: check user metadata
    const meta = (await supabase.auth.getUser()).data.user?.user_metadata
    if (meta?.role === 'doctor') return 'doctor-pending'
    if (meta?.role === 'patient') return 'patient'

    return 'unknown'
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      if (session) {
        const r = await detectRole(session.user.id)
        setRole(r)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      if (session) {
        const r = await detectRole(session.user.id)
        setRole(r)
      } else {
        setRole('unknown')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (loading) return

    const inAuthGroup       = segments[0] === '(auth)'
    const inPending         = segments[0] === 'pending-approval'
    const inDoctorDashboard = segments[0] === 'doctor-dashboard'
    const inTabs            = segments[0] === '(tabs)'

    if (!session) {
      if (!inAuthGroup) router.replace('/(auth)/login')
      return
    }

    switch (role) {
      case 'doctor-approved':
        // Approved doctors go to their own dashboard
        if (!inDoctorDashboard) router.replace('/doctor-dashboard')
        break
      case 'doctor-pending':
        // Pending / rejected doctors wait on the approval screen
        if (!inPending) router.replace('/pending-approval')
        break
      case 'patient':
      case 'unknown':
        // Patients (and freshly registered users) go to the patient tabs
        if (inAuthGroup || inPending || inDoctorDashboard) router.replace('/(tabs)/')
        break
    }
  }, [session, role, segments, loading])

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="pending-approval" />
      <Stack.Screen name="doctor-dashboard" />
    </Stack>
  )
}
