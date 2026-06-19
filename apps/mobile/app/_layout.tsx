import { useEffect, useState } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { registerForPushNotifications, useNotificationListeners } from '../lib/push-notifications'

type UserRole = 'patient' | 'doctor-approved' | 'doctor-pending' | 'receptionist' | 'hospital-admin' | 'unknown'

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null)
  const [role, setRole] = useState<UserRole>('unknown')
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const segments = useSegments()

  async function detectRole(userId: string): Promise<UserRole> {
    // Hospital admin (check before receptionist — admins outrank)
    const { data: adminRow } = await supabase
      .from('hospital_admin')
      .select('id')
      .eq('auth_user_id', userId)
      .eq('is_active', true)
      .maybeSingle()
    if (adminRow) return 'hospital-admin'

    // Receptionist
    const { data: recRow } = await supabase
      .from('receptionist')
      .select('id')
      .eq('auth_user_id', userId)
      .maybeSingle()
    if (recRow) return 'receptionist'

    // Doctor
    const { data: doctorRow } = await supabase
      .from('doctor')
      .select('verification_status')
      .eq('auth_user_id', userId)
      .maybeSingle()
    if (doctorRow) {
      return doctorRow.verification_status === 'APPROVED' ? 'doctor-approved' : 'doctor-pending'
    }

    // Patient
    const { data: patientRow } = await supabase
      .from('patient')
      .select('id')
      .eq('auth_user_id', userId)
      .maybeSingle()
    if (patientRow) return 'patient'

    // Metadata fallback
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

    const seg0 = segments[0]
    const inAuth         = seg0 === '(auth)'
    const inPending      = seg0 === 'pending-approval'
    const inDoctor       = seg0 === 'doctor-dashboard'
    const inTabs         = seg0 === '(tabs)'
    const inReceptionist = seg0 === '(receptionist)'
    const inHospAdmin    = seg0 === '(hospital-admin)'

    if (!session) {
      if (!inAuth) router.replace('/(auth)/login')
      return
    }

    switch (role) {
      case 'hospital-admin':
        // Hospital admins use the web dashboard; mobile shows a minimal info screen
        if (!inHospAdmin) router.replace('/(hospital-admin)/')
        break
      case 'receptionist':
        if (!inReceptionist) router.replace('/(receptionist)/')
        break
      case 'doctor-approved':
        if (!inDoctor) router.replace('/doctor-dashboard')
        break
      case 'doctor-pending':
        if (!inPending) router.replace('/pending-approval')
        break
      case 'patient':
      case 'unknown':
        if (inAuth || inPending || inDoctor || inReceptionist || inHospAdmin) router.replace('/(tabs)/')
        break
    }
  }, [session, role, segments, loading])

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(receptionist)" />
      <Stack.Screen name="(hospital-admin)" />
      <Stack.Screen name="pending-approval" />
      <Stack.Screen name="doctor-dashboard" />
      <Stack.Screen name="doctor-availability" />
      <Stack.Screen name="consultation" />
    </Stack>
  )
}
