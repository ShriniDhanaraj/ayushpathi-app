import { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native'
import { useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'

type Appointment = {
  id: string
  appointment_date: string
  appointment_time: string
  status: string
  doctor: { first_name: string; last_name: string; specialization: string } | null
}

export default function HomeScreen() {
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
      .select('id, appointment_date, appointment_time, status, doctor:doctor_id(first_name, last_name, specialization)')
      .eq('patient_auth_id', user.id)
      .order('appointment_date', { ascending: true })
      .limit(5)

    setAppointments((data as Appointment[]) ?? [])
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

  const statusColor: Record<string, string> = {
    SCHEDULED: '#2980b9',
    COMPLETED: '#27ae60',
    CANCELLED: '#e74c3c',
    PENDING: '#f39c12',
  }

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
          <Text style={styles.statNum}>{appointments.filter(a => a.status === 'SCHEDULED').length}</Text>
          <Text style={styles.statLabel}>Upcoming</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{appointments.filter(a => a.status === 'COMPLETED').length}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{appointments.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
      </View>

      {/* Appointments */}
      <Text style={styles.sectionTitle}>Your Appointments</Text>

      {loading ? (
        <ActivityIndicator color="#1a6b3a" style={{ marginTop: 32 }} />
      ) : appointments.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyIcon}>📅</Text>
          <Text style={styles.emptyText}>No appointments yet.</Text>
          <Text style={styles.emptySub}>Visit rasbros.com to book your first consultation.</Text>
        </View>
      ) : (
        appointments.map(apt => (
          <View key={apt.id} style={styles.aptCard}>
            <View style={styles.aptHeader}>
              <Text style={styles.aptDoctor}>
                Dr. {apt.doctor?.first_name} {apt.doctor?.last_name}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: statusColor[apt.status] ?? '#999' }]}>
                <Text style={styles.statusText}>{apt.status}</Text>
              </View>
            </View>
            <Text style={styles.aptSpec}>{apt.doctor?.specialization}</Text>
            <Text style={styles.aptDate}>
              {apt.appointment_date} at {apt.appointment_time}
            </Text>
          </View>
        ))
      )}
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
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#333', paddingHorizontal: 16, marginBottom: 12 },
  aptCard: {
    backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 12,
    borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#d0e8da',
  },
  aptHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  aptDoctor: { fontSize: 15, fontWeight: '700', color: '#1a6b3a' },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  aptSpec: { fontSize: 13, color: '#555', marginBottom: 4 },
  aptDate: { fontSize: 12, color: '#888' },
  emptyBox: { alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#555' },
  emptySub: { fontSize: 12, color: '#888', textAlign: 'center', marginTop: 6 },
})
