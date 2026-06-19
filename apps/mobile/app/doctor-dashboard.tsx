import { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from './lib/supabase'

interface DoctorProfile {
  id: string
  first_name: string
  last_name: string
  specialization: string
  verification_status: string
}

interface Appointment {
  id: string
  scheduled_at: string
  status: string
  type: string
  patient: { first_name: string; last_name: string } | null
}

const SPEC: Record<string, string> = {
  AYU: 'Ayurveda', YOG: 'Yoga & Naturopathy', UNA: 'Unani', SID: 'Siddha', HOM: 'Homeopathy',
}

const STATUS_COLOR: Record<string, string> = {
  SCHEDULED: '#1a6b3a', CONFIRMED: '#2e86ab', COMPLETED: '#888', CANCELLED: '#e74c3c',
}

export default function DoctorDashboardScreen() {
  const router = useRouter()
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null)
  const [todayApts, setTodayApts] = useState<Appointment[]>([])
  const [upcomingCount, setUpcomingCount] = useState(0)
  const [totalPatients, setTotalPatients] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: doc } = await supabase
      .from('doctor')
      .select('id, first_name, last_name, specialization, verification_status')
      .eq('auth_user_id', user.id)
      .single()
    if (!doc) { setLoading(false); return }
    setDoctor(doc)

    if (doc.verification_status !== 'APPROVED') { setLoading(false); return }

    // Today's date range
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    const { data: apts } = await supabase
      .from('appointment')
      .select('id, scheduled_at, status, type, patient:patient_id(first_name, last_name)')
      .eq('doctor_id', doc.id)
      .gte('scheduled_at', todayStart.toISOString())
      .lte('scheduled_at', todayEnd.toISOString())
      .in('status', ['SCHEDULED', 'CONFIRMED'])
      .order('scheduled_at', { ascending: true })

    setTodayApts((apts ?? []).map(a => ({
      ...a,
      patient: Array.isArray(a.patient) ? a.patient[0] ?? null : a.patient,
    })) as Appointment[])

    // Upcoming count (after today)
    const tomorrow = new Date(todayEnd)
    tomorrow.setSeconds(tomorrow.getSeconds() + 1)
    const { count: upcoming } = await supabase
      .from('appointment')
      .select('id', { count: 'exact', head: true })
      .eq('doctor_id', doc.id)
      .gte('scheduled_at', tomorrow.toISOString())
      .in('status', ['SCHEDULED', 'CONFIRMED'])

    setUpcomingCount(upcoming ?? 0)

    // Active patients (consented)
    const { count: pts } = await supabase
      .from('patient_doctor_consent')
      .select('id', { count: 'exact', head: true })
      .eq('doctor_id', doc.id)
      .eq('status', 'ACTIVE')

    setTotalPatients(pts ?? 0)
    setLoading(false)
  }

  useFocusEffect(useCallback(() => {
    setLoading(true)
    load()
  }, []))

  async function onRefresh() {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.replace('/(auth)/login')
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#1a6b3a" size="large" /></View>
  }

  if (!doctor) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Doctor profile not found.</Text>
      </View>
    )
  }

  // PENDING state
  if (doctor.verification_status === 'PENDING') {
    return (
      <View style={styles.container}>
        <PendingHeader doctor={doctor} onSignOut={handleSignOut} />
        <View style={styles.center}>
          <Ionicons name="time-outline" size={64} color="#f0c040" />
          <Text style={styles.pendingTitle}>Application Under Review</Text>
          <Text style={styles.pendingBody}>
            Your profile is being verified by the Ayushpathi team. This usually takes 1–2 business days.
          </Text>
        </View>
      </View>
    )
  }

  // REJECTED state
  if (doctor.verification_status === 'REJECTED') {
    return (
      <View style={styles.container}>
        <PendingHeader doctor={doctor} onSignOut={handleSignOut} />
        <View style={styles.center}>
          <Ionicons name="close-circle-outline" size={64} color="#e74c3c" />
          <Text style={[styles.pendingTitle, { color: '#e74c3c' }]}>Application Not Approved</Text>
          <Text style={styles.pendingBody}>
            Unfortunately your registration was not approved. Please contact support at support@rasbros.com.
          </Text>
        </View>
      </View>
    )
  }

  // APPROVED — full dashboard
  const initials = `${doctor.first_name[0]}${doctor.last_name[0]}`.toUpperCase()

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.headerInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.doctorName}>Dr. {doctor.first_name} {doctor.last_name}</Text>
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={13} color="#fff" />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            </View>
            <Text style={styles.specialization}>{SPEC[doctor.specialization] ?? doctor.specialization}</Text>
          </View>
          <TouchableOpacity onPress={handleSignOut} style={styles.signOutBtn}>
            <Ionicons name="log-out-outline" size={20} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1a6b3a" />}
      >
        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatCard value={todayApts.length} label="Today" icon="today-outline" />
          <StatCard value={upcomingCount} label="Upcoming" icon="calendar-outline" />
          <StatCard value={totalPatients} label="Patients" icon="people-outline" />
        </View>

        {/* Today's appointments */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Appointments</Text>
          {todayApts.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="checkmark-circle-outline" size={32} color="#a8d5b5" />
              <Text style={styles.emptyText}>No appointments today</Text>
            </View>
          ) : (
            todayApts.map(apt => (
              <AptRow
                key={apt.id}
                apt={apt}
                onPress={() => router.push(`/consultation?appointmentId=${apt.id}`)}
              />
            ))
          )}
        </View>

        {/* Quick actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <ActionCard
              icon="time-outline"
              label="Set Availability"
              color="#1a6b3a"
              onPress={() => router.push('/doctor-availability')}
            />
            <ActionCard
              icon="document-text-outline"
              label="My Consultations"
              color="#2e86ab"
              onPress={() => router.push('/my-consultations')}
              comingSoon
            />
            <ActionCard
              icon="stats-chart-outline"
              label="Analytics"
              color="#8b5cf6"
              onPress={() => {}}
              comingSoon
            />
            <ActionCard
              icon="storefront-outline"
              label="E-Pharmacy"
              color="#f59e0b"
              onPress={() => {}}
              comingSoon
            />
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PendingHeader({ doctor, onSignOut }: { doctor: DoctorProfile; onSignOut: () => void }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <View style={styles.headerInfo}>
          <Text style={styles.doctorName}>Dr. {doctor.first_name} {doctor.last_name}</Text>
        </View>
        <TouchableOpacity onPress={onSignOut} style={styles.signOutBtn}>
          <Ionicons name="log-out-outline" size={20} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
      </View>
    </View>
  )
}

function StatCard({ value, label, icon }: { value: number; label: string; icon: string }) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon as any} size={20} color="#1a6b3a" style={{ marginBottom: 4 }} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

function AptRow({ apt, onPress }: { apt: Appointment; onPress: () => void }) {
  const date = new Date(apt.scheduled_at)
  const time = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  const patientName = apt.patient
    ? `${apt.patient.first_name} ${apt.patient.last_name}`
    : 'Unknown Patient'
  const statusColor = STATUS_COLOR[apt.status] ?? '#888'

  return (
    <TouchableOpacity style={styles.aptRow} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.timeBlock, { borderLeftColor: statusColor }]}>
        <Text style={styles.aptTime}>{time}</Text>
      </View>
      <View style={styles.aptInfo}>
        <Text style={styles.aptPatient}>{patientName}</Text>
        <View style={styles.aptBadgeRow}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{apt.status}</Text>
          </View>
          {apt.type === 'TELECONSULT' && (
            <View style={styles.teleconsultBadge}>
              <Ionicons name="videocam-outline" size={11} color="#2e86ab" />
              <Text style={styles.teleconsultText}>Teleconsult</Text>
            </View>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#ccc" />
    </TouchableOpacity>
  )
}

function ActionCard({
  icon, label, color, onPress, comingSoon,
}: { icon: string; label: string; color: string; onPress: () => void; comingSoon?: boolean }) {
  return (
    <TouchableOpacity
      style={styles.actionCard}
      onPress={comingSoon ? () => {} : onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.actionIcon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon as any} size={22} color={color} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
      {comingSoon && <Text style={styles.comingSoon}>Soon</Text>}
    </TouchableOpacity>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f7f4' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#f0f7f4' },
  errorText: { fontSize: 16, color: '#888' },
  pendingTitle: { fontSize: 20, fontWeight: '700', color: '#222', marginTop: 16, textAlign: 'center' },
  pendingBody: { fontSize: 14, color: '#666', marginTop: 10, textAlign: 'center', lineHeight: 20 },
  header: { backgroundColor: '#1a6b3a', paddingTop: 56, paddingBottom: 24, paddingHorizontal: 16 },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  doctorName: { color: '#fff', fontSize: 17, fontWeight: '700' },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 10,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  verifiedText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  specialization: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 2 },
  signOutBtn: { padding: 6 },
  body: { flex: 1 },
  statsRow: { flexDirection: 'row', padding: 16, gap: 10 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: '#d0e8da',
  },
  statValue: { fontSize: 26, fontWeight: '800', color: '#1a6b3a' },
  statLabel: { fontSize: 11, color: '#888', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.4 },
  section: { marginHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#222', marginBottom: 10 },
  emptyCard: {
    backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#d0e8da',
    alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8,
  },
  emptyText: { color: '#aaa', fontSize: 14 },
  aptRow: {
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#d0e8da',
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8, overflow: 'hidden',
  },
  timeBlock: {
    borderLeftWidth: 3, borderLeftColor: '#1a6b3a',
    paddingHorizontal: 12, paddingVertical: 16, minWidth: 72, alignItems: 'center',
  },
  aptTime: { fontSize: 13, fontWeight: '700', color: '#222' },
  aptInfo: { flex: 1 },
  aptPatient: { fontSize: 15, fontWeight: '600', color: '#222', marginBottom: 4 },
  aptBadgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  statusText: { fontSize: 11, fontWeight: '600' },
  teleconsultBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#e8f4fb', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2,
  },
  teleconsultText: { fontSize: 11, color: '#2e86ab', fontWeight: '600' },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionCard: {
    backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#d0e8da',
    width: '47%', padding: 16, alignItems: 'center', position: 'relative',
  },
  actionIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  actionLabel: { fontSize: 13, fontWeight: '600', color: '#222', textAlign: 'center' },
  comingSoon: {
    position: 'absolute', top: 8, right: 8,
    fontSize: 9, color: '#aaa', backgroundColor: '#f5f5f5',
    borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2, fontWeight: '600',
  },
})
