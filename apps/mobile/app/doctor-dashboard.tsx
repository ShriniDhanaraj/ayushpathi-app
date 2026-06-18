import { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native'
import { useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'

const SPEC_LABELS: Record<string, string> = {
  AYU: 'Ayurveda', YOG: 'Yoga & Naturopathy',
  UNA: 'Unani', SID: 'Siddha', HOM: 'Homeopathy',
}

const STATUS_COLOR: Record<string, string> = {
  BOOKED: '#2980b9', CONFIRMED: '#27ae60',
  COMPLETED: '#27ae60', CANCELLED: '#e74c3c', PENDING: '#f39c12',
}

interface Doctor {
  id: string
  first_name: string
  last_name: string
  ayush_specialization: string
  verification_status: string
}

interface Appointment {
  id: string
  start_time: string
  end_time: string
  type: string
  status: string
  patient: { first_name: string; last_name: string } | null
}

interface Stats {
  today: number
  upcoming: number
  activePatients: number
}

export default function DoctorDashboardScreen() {
  const [doctor, setDoctor] = useState<Doctor | null>(null)
  const [todayApts, setTodayApts] = useState<Appointment[]>([])
  const [stats, setStats] = useState<Stats>({ today: 0, upcoming: 0, activePatients: 0 })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Load doctor profile
    const { data: doc } = await supabase
      .from('doctor')
      .select('id, first_name, last_name, ayush_specialization, verification_status')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (!doc) { setLoading(false); return }
    setDoctor(doc)

    if (doc.verification_status !== 'APPROVED') { setLoading(false); return }

    const today = new Date().toISOString().split('T')[0]

    // Load today's appointments
    const { data: aptData } = await supabase
      .from('appointment')
      .select('id, start_time, end_time, type, status, patient:patient_id(first_name, last_name)')
      .eq('doctor_id', doc.id)
      .eq('appointment_date', today)
      .neq('status', 'CANCELLED')
      .order('start_time', { ascending: true })

    setTodayApts((aptData ?? []) as unknown as Appointment[])

    // Load stats
    const [upcomingRes, patientsRes] = await Promise.all([
      supabase
        .from('appointment')
        .select('id', { count: 'exact', head: true })
        .eq('doctor_id', doc.id)
        .gt('appointment_date', today)
        .in('status', ['BOOKED', 'CONFIRMED']),
      supabase
        .from('patient_doctor_consent')
        .select('id', { count: 'exact', head: true })
        .eq('doctor_id', doc.id)
        .eq('status', 'ACTIVE'),
    ])

    setStats({
      today: aptData?.length ?? 0,
      upcoming: upcomingRes.count ?? 0,
      activePatients: patientsRes.count ?? 0,
    })

    setLoading(false)
  }

  useFocusEffect(useCallback(() => { load() }, []))

  async function onRefresh() {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  async function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ])
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#1a6b3a" size="large" />
      </View>
    )
  }

  if (!doctor) return null

  const isApproved = doctor.verification_status === 'APPROVED'
  const isPending  = doctor.verification_status === 'PENDING'
  const isRejected = doctor.verification_status === 'REJECTED'

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1a6b3a" />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Namaste 🙏</Text>
            <Text style={styles.doctorName}>Dr. {doctor.first_name} {doctor.last_name}</Text>
            <Text style={styles.specialization}>{SPEC_LABELS[doctor.ayush_specialization] ?? doctor.ayush_specialization}</Text>
          </View>
          <TouchableOpacity onPress={handleSignOut} style={styles.signOutBtn}>
            <Ionicons name="log-out-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Verification badge */}
        {isApproved && (
          <View style={styles.verifiedBadge}>
            <Ionicons name="shield-checkmark-outline" size={14} color="#27ae60" />
            <Text style={styles.verifiedText}>Verified Doctor</Text>
          </View>
        )}
      </View>

      {/* Pending / Rejected banner */}
      {isPending && (
        <View style={[styles.banner, styles.bannerAmber]}>
          <Text style={styles.bannerIcon}>⏳</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Verification pending</Text>
            <Text style={styles.bannerSub}>Our team is reviewing your credentials. Usually within 48 hours.</Text>
          </View>
        </View>
      )}
      {isRejected && (
        <View style={[styles.banner, styles.bannerRed]}>
          <Text style={styles.bannerIcon}>❌</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Verification unsuccessful</Text>
            <Text style={styles.bannerSub}>Contact support@ayushpathi.in with your credentials.</Text>
          </View>
        </View>
      )}

      {isApproved && (
        <>
          {/* Stats row */}
          <View style={styles.statsRow}>
            <StatCard value={stats.today}         label="Today" icon="📅" />
            <StatCard value={stats.upcoming}       label="Upcoming" icon="🗓" />
            <StatCard value={stats.activePatients} label="Patients" icon="👥" />
          </View>

          {/* Today's schedule */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Today's Schedule</Text>
            {todayApts.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyIcon}>🎉</Text>
                <Text style={styles.emptyText}>No appointments today.</Text>
                <Text style={styles.emptySub}>Enjoy your day, Doctor!</Text>
              </View>
            ) : (
              todayApts.map(apt => (
                <AptRow key={apt.id} apt={apt} />
              ))
            )}
          </View>

          {/* Quick actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionsGrid}>
              <ActionCard icon="📋" title="Today's Schedule" sub="Full appointment list" />
              <ActionCard icon="👤" title="My Profile"       sub="Update bio & fees" />
              <ActionCard icon="💊" title="Write Prescription" sub="After a consultation" />
              <ActionCard icon="📊" title="Patient Records"  sub="With patient consent" />
            </View>
          </View>
        </>
      )}

      <Text style={styles.footer}>Data stored securely in India · DPDP Act 2023</Text>
      <View style={{ height: 40 }} />
    </ScrollView>
  )
}

// ──────────────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────────────
function StatCard({ value, label, icon }: { value: number; label: string; icon: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

function AptRow({ apt }: { apt: Appointment }) {
  const color = STATUS_COLOR[apt.status] ?? '#999'
  return (
    <View style={styles.aptRow}>
      <View style={styles.aptTime}>
        <Text style={styles.aptTimeText}>{apt.start_time}</Text>
        <Text style={styles.aptEndTime}>{apt.end_time}</Text>
      </View>
      <View style={styles.aptInfo}>
        <Text style={styles.aptPatient}>
          {apt.patient?.first_name ?? '—'} {apt.patient?.last_name ?? ''}
        </Text>
        <View style={styles.aptMeta}>
          <View style={[styles.statusBadge, { backgroundColor: color }]}>
            <Text style={styles.statusText}>{apt.status}</Text>
          </View>
          {apt.type === 'TELECONSULT' && (
            <View style={styles.teleconsultBadge}>
              <Text style={styles.teleconsultText}>💻 Tele</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  )
}

function ActionCard({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <TouchableOpacity
      style={styles.actionCard}
      onPress={() => Alert.alert('Coming soon', `${title} screen is coming in the next update.`)}
    >
      <Text style={styles.actionIcon}>{icon}</Text>
      <Text style={styles.actionTitle}>{title}</Text>
      <Text style={styles.actionSub}>{sub}</Text>
    </TouchableOpacity>
  )
}

// ──────────────────────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  loadingContainer: { flex: 1, backgroundColor: '#f0f7f4', alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, backgroundColor: '#f0f7f4' },
  header: {
    backgroundColor: '#1a6b3a', paddingTop: 56, paddingBottom: 24, paddingHorizontal: 20,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greeting: { color: 'rgba(255,255,255,0.75)', fontSize: 13 },
  doctorName: { color: '#fff', fontSize: 22, fontWeight: '700', marginTop: 2 },
  specialization: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 3 },
  signOutBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, padding: 8 },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#e8f5ee', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start', marginTop: 12,
  },
  verifiedText: { fontSize: 12, color: '#27ae60', fontWeight: '700' },
  banner: {
    flexDirection: 'row', gap: 12, margin: 16,
    borderRadius: 12, padding: 14, borderWidth: 1,
  },
  bannerAmber: { backgroundColor: '#fef9e7', borderColor: '#f0c040' },
  bannerRed:   { backgroundColor: '#fde8e8', borderColor: '#e74c3c' },
  bannerIcon: { fontSize: 22 },
  bannerTitle: { fontSize: 14, fontWeight: '700', color: '#333' },
  bannerSub: { fontSize: 12, color: '#666', marginTop: 3, lineHeight: 18 },
  statsRow: { flexDirection: 'row', padding: 16, gap: 10 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: '#d0e8da',
  },
  statIcon: { fontSize: 22, marginBottom: 4 },
  statValue: { fontSize: 24, fontWeight: '800', color: '#1a6b3a' },
  statLabel: { fontSize: 11, color: '#888', marginTop: 2 },
  section: { marginHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#222', marginBottom: 10 },
  emptyBox: { backgroundColor: '#fff', borderRadius: 12, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: '#d0e8da' },
  emptyIcon: { fontSize: 36, marginBottom: 8 },
  emptyText: { fontSize: 15, fontWeight: '600', color: '#555' },
  emptySub: { fontSize: 13, color: '#aaa', marginTop: 4 },
  aptRow: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1, borderColor: '#d0e8da', marginBottom: 8, overflow: 'hidden',
  },
  aptTime: {
    backgroundColor: '#1a6b3a', width: 68, alignItems: 'center',
    justifyContent: 'center', paddingVertical: 14,
  },
  aptTimeText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  aptEndTime: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2 },
  aptInfo: { flex: 1, padding: 12, justifyContent: 'center' },
  aptPatient: { fontSize: 15, fontWeight: '700', color: '#222', marginBottom: 6 },
  aptMeta: { flexDirection: 'row', gap: 6 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  teleconsultBadge: { backgroundColor: '#e8f0fe', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  teleconsultText: { fontSize: 11, color: '#1a56db', fontWeight: '600' },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionCard: {
    width: '47%', backgroundColor: '#fff', borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: '#d0e8da',
  },
  actionIcon: { fontSize: 26, marginBottom: 8 },
  actionTitle: { fontSize: 13, fontWeight: '700', color: '#222', marginBottom: 2 },
  actionSub: { fontSize: 11, color: '#888' },
  footer: { textAlign: 'center', fontSize: 11, color: '#aaa', paddingVertical: 8 },
})
