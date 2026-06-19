import { useEffect, useState } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { registerForPushNotifications, useNotificationListeners } from '../lib/push-notifications'

type UserRole = 'patient' | 'doctor-approved' | 'doctor-pending' | 'receptionist' | 'unknown'

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null)
  const [role, setRole] = useState<UserRole>('unknown')
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const segments = useSegments()

  async function detectRole(userId: string): Promise<UserRole> {
    // Check receptionist table first
    const { data: recRow } = await supabase
      .from('receptionist')
      .select('id')
      .eq('auth_user_id', userId)
      .maybeSingle()
    if (recRow) return 'receptionist'

    // Check doctor table
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
        registerForPushNotifications(session.user.id).catch(console.error)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      if (session) {
        const r = await detectRole(session.user.id)
        setRole(r)
        registerForPushNotifications(session.user.id).catch(console.error)
      } else {
        setRole('unknown')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Listen for notification taps and route accordingly
  useEffect(() => {
    const cleanup = useNotificationListeners(
      undefined,
      (response) => {
        const data = response.notification.request.content.data as Record<string, string>
        if (data?.type === 'appointment') router.push('/(tabs)/appointments')
        else if (data?.type === 'consultation') router.push('/consultation')
        else if (data?.type === 'queue') router.push('/(receptionist)/')
      }
    )
    return cleanup
  }, [])

  useEffect(() => {
    if (loading) return

    const inAuthGroup        = segments[0] === '(auth)'
    const inPending          = segments[0] === 'pending-approval'
    const inDoctorDashboard  = segments[0] === 'doctor-dashboard'
    const inTabs             = segments[0] === '(tabs)'
    const inReceptionist     = segments[0] === '(receptionist)'

    if (!session) {
      if (!inAuthGroup) router.replace('/(auth)/login')
      return
    }

    switch (role) {
      case 'receptionist':
        if (!inReceptionist) router.replace('/(receptionist)/')
        break
      case 'doctor-approved':
        if (!inDoctorDashboard) router.replace('/doctor-dashboard')
        break
      case 'doctor-pending':
        if (!inPending) router.replace('/pending-approval')
        break
      case 'patient':
      case 'unknown':
        if (inAuthGroup || inPending || inDoctorDashboard || inReceptionist) router.replace('/(tabs)/')
        break
    }
  }, [session, role, segments, loading])

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(receptionist)" />
      <Stack.Screen name="pending-approval" />
      <Stack.Screen name="doctor-dashboard" />
      <Stack.Screen name="doctor-availability" />
      <Stack.Screen name="consultation" />
    </Stack>
  )
}
