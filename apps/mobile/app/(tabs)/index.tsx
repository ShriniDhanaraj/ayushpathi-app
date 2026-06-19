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
  doctor: { id: string; first_name: string; last_name: string; ayush_specialization: string } | null
}

type NextVisit = {
  next_visit_date: string
  doctor: { id: string; first_name: string; last_name: string } | null
}

const SPEC: Record<string, string> = {
  AYU: 'Ayurveda', YOG: 'Yoga & Naturopathy', UNA: 'Unani', SID: 'Siddha', HOM: 'Homeopathy',
}

const STATUS_COLOR: Record<string, string> = {
  BOOKED: '#2980b9', CONFIRMED: '#6366F1', ARRIVED: '#F59E0B',
  IN_PROGRESS: '#F97316', COMPLETED: '#27ae60', CANCELLED: '#e74c3c',
}

function daysFromToday(dateStr: string): number {
  const today = new Date(); today.setHours(0,0,0,0)
  const d = new Date(dateStr); d.setHours(0,0,0,0)
  return Math.round((d.getTime() - today.getTime()) / 86400000)
}

export default function HomeScreen() {
  const router = useRouter()
  const [userName, setUserName] = useState('')
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [nextVisit, setNextVisit] = useState<NextVisit | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setUserName(user.user_metadata?.first_name ?? user.email?.split('@')[0] ?? 'Patient')
    const today = new Date().toISOString().split('T')[0]

    // Upcoming appointments
    const { data: apts } = await supabase
      .from('appointment')
      .select('id, appointment_date, start_time, status, doctor:doctor_id(id, first_name, last_name, ayush_specialization)')
      .eq('patient_auth_id', user.id)
      .not('status', 'in', '("CANCELLED","NO_SHOW")')
      .gte('appointment_date', today)
      .order('appointment_date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(5)
    setAppointments((apts as unknown as Appointment[]) ?? [])

    // Nearest next_visit_date from consultations
    const { data: patient } = await supabase
      .from('patient').select('id').eq('auth_user_id', user.id).maybeSingle()
    if (patient) {
      const { data: consults } = await supabase
        .from('consultation')
        .select('next_visit_date, doctor:doctor_id(id, first_name, last_name)')
        .eq('patient_id', patient.id)
        .not('next_visit_date', 'is', null)
        .order('next_visit_date', { ascending: true })
        .limit(10)

      if (consults) {
        // Find the most relevant: overdue first, then soonest upcoming
        const all = (consults as unknown as NextVisit[]).filter(c => c.next_visit_date)
        const overdue = all.filter(c => c.next_visit_date < today)
        const upcoming = all.filter(c => c.next_visit_date >= today)
        setNextVisit(overdue[0] ?? upcoming[0] ?? null)
      }
    }

    setLoading(false)
  }

  useFocusEffect(useCallback(() => { load() }, []))

  async function onRefresh() {
    setRefreshing(true); await load(); setRefreshing(false)
  }

  async function handleSignOut() { await supabase.auth.signOut() }

  const upcoming  = appointments.filter(a => a.status !== 'COMPLETED')
  const todayStr  = new Date().toISOString().split('T')[0]
  const todayApts = appointments.filter(a => a.appointment_date === todayStr)

  // Next visit card colour
  const nvDays = nextVisit ? daysFromToday(nextVisit.next_visit_date) : null
  const nvColor = nvDays === null ? '#166534'
    : nvDays < 0  ? '#DC2626'     // overdue — red
    : nvDays <= 7 ? '#D97706'     // within 7 days — orange
    : '#166534'                   // fine — green

  function handleBookAgain(doctorId?: string) {
    if (doctorId) {
      router.push(`/(tabs)/appointments?doctor_id=${doctorId}`)
    } else {
      router.push('/(tabs)/appointments')
    }
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

      {/* ── Next Visit Due Card ──────────────────────────────── */}
      {nextVisit && (
        <View style={[styles.nextVisitCard, { borderColor: nvColor }]}>
          <View style={styles.nextVisitLeft}>
            <Text style={[styles.nextVisitLabel, { color: nvColor }]}>
              {nvDays !== null && nvDays < 0
                ? `⚠️ Visit overdue by ${Math.abs(nvDays)} day${Math.abs(nvDays) !== 1 ? 's' : ''}`
                : nvDays === 0
                ? '🏥 Next visit is TODAY'
                : `📅 Next visit in ${nvDays} day${nvDays !== 1 ? 's' : ''}`}
            </Text>
            <Text style={styles.nextVisitDate}>
              {new Date(nextVisit.next_visit_date).toLocaleDateString('en-IN', {
                weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
              })}
            </Text>
            {nextVisit.doctor && (
              <Text style={styles.nextVisitDoctor}>
                Dr. {(nextVisit.doctor as any).first_name} {(nextVisit.doctor as any).last_name}
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={[styles.bookAgainBtn, { backgroundColor: nvColor }]}
            onPress={() => handleBookAgain((nextVisit.doctor as any)?.id)}
          >
            <Text style={styles.bookAgainBtnText}>Book Now</Text>
          </TouchableOpacity>
        </View>
      )}

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

      {/* Today's appointments */}
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
        upcoming.filter(a => a.appointment_date > todayStr).map(apt => (
          <View key={apt.id} style={styles.aptCard}>
            <View style={styles.aptHeader}>
              <Text style={styles.aptDoctor}>Dr. {apt.doctor?.first_name} {apt.doctor?.last_name}</Text>
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

  // Next Visit Card
  nextVisitCard: {
    marginHorizontal: 16, marginTop: 16, marginBottom: 4,
    backgroundColor: '#fff', borderRadius: 14, borderWidth: 2,
    padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6,
    elevation: 2,
  },
  nextVisitLeft: { flex: 1 },
  nextVisitLabel: { fontSize: 14, fontWeight: '700' },
  nextVisitDate: { fontSize: 13, color: '#374151', marginTop: 2 },
  nextVisitDoctor: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  bookAgainBtn: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  bookAgainBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  statsRow: { flexDirection: 'row', padding: 16, gap: 12 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: '#d0e8da',
  },
  statNum: { fontSize: 24, fontWeight: '700', color: '#1a6b3a' },
  statLabel: { fontSize: 11, color: '#888', marginTop: 2 },
  sectionTitle: {
    fontSize: 14, fontWeight: '700', color: '#555', paddingHorizontal: 16,
    marginBottom: 10, marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.5,
  },
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
