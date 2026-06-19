import { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'

type Appointment = {
  id: string
  appointment_date: string
  start_time: string
  status: string
  doctor: { first_name: string; last_name: string; ayush_specialization: string } | null
}

const SPEC: Record<string, string> = {
  AYU: 'Ayurveda', YOG: 'Yoga & Naturopathy', UNA: 'Unani', SID: 'Siddha', HOM: 'Homeopathy',
}

const STATUS_COLOR: Record<string, string> = {
  BOOKED: '#2980b9', CONFIRMED: '#6366F1', ARRIVED: '#F59E0B',
  IN_PROGRESS: '#F97316', COMPLETED: '#27ae60', CANCELLED: '#e74c3c',
}

export default function HomeScreen() {
  const router = useRouter()
  const [userName, setUserName] = useState('')
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setUserName(user.user_metadata?.first_name ?? user.email?.split('@')[0] ?? 'Patient')

    const { data } = await supabase
      .from('appointment')
      .select('id, appointment_date, start_time, status, doctor:doctor_id(first_name, last_name, ayush_specialization)')
      .eq('patient_auth_id', user.id)
      .not('status', 'in', '("CANCELLED","NO_SHOW")')
      .gte('appointment_date', new Date().toISOString().split('T')[0])
      .order('appointment_date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(5)

    setAppointments((data as unknown as Appointment[]) ?? [])
    setLoading(false)
  }

  useFocusEffect(useCallback(() => { load() }, []))

  async function onRefresh() {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  const upcoming = appointments.filter(a => !['COMPLETED'].includes(a.status))
  const todayStr = new Date().toISOString().split('T')[0]
  const todayApts = appointments.filter(a => a.appointment_date === todayStr)

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1a6b3a" />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Namaste 🙏</Text>
          <Text style={styles.userName}>{userName}</Text>
        </View>
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutBtn}>
          <Ionicons name="log-out-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{todayApts.length}</Text>
          <Text style={styles.statLabel}>Today</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{upcoming.length}</Text>
          <Text style={styles.statLabel}>Upcoming</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{appointments.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
      </View>

      {/* Today's appointments highlight */}
      {todayApts.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Today</Text>
          {todayApts.map(apt => (
            <View key={apt.id} style={[styles.aptCard, styles.aptCardToday]}>
              <View style={styles.aptHeader}>
                <Text style={styles.aptDoctor}>
                  Dr. {apt.doctor?.first_name} {apt.doctor?.last_name}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[apt.status] ?? '#999' }]}>
                  <Text style={styles.statusText}>{apt.status.replace('_', ' ')}</Text>
                </View>
              </View>
              <Text style={styles.aptSpec}>{SPEC[apt.doctor?.ayush_specialization ?? ''] ?? apt.doctor?.ayush_specialization}</Text>
              <Text style={styles.aptDate}>Today at {apt.start_time?.slice(0, 5)}</Text>
            </View>
          ))}
        </>
      )}

      {/* Upcoming */}
      <Text style={styles.sectionTitle}>
        {todayApts.length > 0 ? 'Coming Up' : 'Your Appointments'}
      </Text>

      {loading ? (
        <ActivityIndicator color="#1a6b3a" style={{ marginTop: 32 }} />
      ) : upcoming.filter(a => a.appointment_date > todayStr).length === 0 && todayApts.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyIcon}>📅</Text>
          <Text style={styles.emptyText}>No upcoming appointments.</Text>
          <TouchableOpacity style={styles.bookBtn} onPress={() => router.push('/(tabs)/appointments')}>
            <Text style={styles.bookBtnText}>Book a Consultation</Text>
          </TouchableOpacity>
        </View>
      ) : (
        upcoming
          .filter(a => a.appointment_date > todayStr)
          .map(apt => (
            <View key={apt.id} style={styles.aptCard}>
              <View style={styles.aptHeader}>
                <Text style={styles.aptDoctor}>
                  Dr. {apt.doctor?.first_name} {apt.doctor?.last_name}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[apt.status] ?? '#999' }]}>
                  <Text style={styles.statusText}>{apt.status.replace('_', ' ')}</Text>
                </View>
              </View>
              <Text style={styles.aptSpec}>{SPEC[apt.doctor?.ayush_specialization ?? ''] ?? apt.doctor?.ayush_specialization}</Text>
              <Text style={styles.aptDate}>{apt.appointment_date} at {apt.start_time?.slice(0, 5)}</Text>
            </View>
          ))
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f7f4' },
  header: {
    backgroundColor: '#1a6b3a', padding: 24, paddingTop: 56,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  greeting: { color: '#a8d5b5', fontSize: 13 },
  userName: { color: '#fff', fontSize: 20, fontWeight: '700', marginTop: 2 },
  signOutBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, padding: 8 },
  statsRow: { flexDirection: 'row', padding: 16, gap: 12 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: '#d0e8da',
  },
  statNum: { fontSize: 24, fontWeight: '700', color: '#1a6b3a' },
  statLabel: { fontSize: 11, color: '#888', marginTop: 2 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#555', paddingHorizontal: 16, marginBottom: 10, marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  aptCard: {
    backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 12,
    borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#d0e8da',
  },
  aptCardToday: { borderColor: '#1a6b3a', borderWidth: 1.5 },
  aptHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  aptDoctor: { fontSize: 15, fontWeight: '700', color: '#1a6b3a' },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  aptSpec: { fontSize: 13, color: '#555', marginBottom: 4 },
  aptDate: { fontSize: 12, color: '#888' },
  emptyBox: { alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#555', marginBottom: 16 },
  bookBtn: { backgroundColor: '#1a6b3a', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
  bookBtnText: { color: '#fff', fontWeight: '600' },
})
