import { useEffect, useState } from 'react'
import {
  Pressable, RefreshControl, ScrollView,
  StyleSheet, Text, View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { colors } from '@/lib/colors'

interface Stats {
  upcoming: number
  activeDoctors: number
  prescriptions: number
  hasHealthProfile: boolean
}

interface StatCardProps {
  icon: string; label: string; value: number | string; onPress: () => void
}

function StatCard({ icon, label, value, onPress }: StatCardProps) {
  return (
    <Pressable style={styles.statCard} onPress={onPress}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Pressable>
  )
}

function QuickAction({ icon, title, desc, onPress }: { icon: string; title: string; desc: string; onPress: () => void }) {
  return (
    <Pressable style={styles.quickAction} onPress={onPress}>
      <Text style={styles.qaIcon}>{icon}</Text>
      <View style={styles.qaText}>
        <Text style={styles.qaTitle}>{title}</Text>
        <Text style={styles.qaDesc}>{desc}</Text>
      </View>
      <Text style={styles.qaArrow}>›</Text>
    </Pressable>
  )
}

export default function HomeScreen() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [stats, setStats] = useState<Stats>({ upcoming: 0, activeDoctors: 0, prescriptions: 0, hasHealthProfile: false })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: patient } = await supabase
      .from('patient').select('id, first_name').eq('auth_user_id', user.id).single()
    if (!patient) { setLoading(false); return }
    setName(patient.first_name)

    const today = new Date().toISOString().split('T')[0]
    const [upcomingRes, doctorsRes, rxRes, profileRes] = await Promise.all([
      supabase.from('appointment').select('id', { count: 'exact', head: true })
        .eq('patient_id', patient.id).in('status', ['CONFIRMED','PENDING','BOOKED']).gte('appointment_date', today),
      supabase.from('patient_doctor_consent').select('id', { count: 'exact', head: true })
        .eq('patient_id', patient.id).eq('status', 'ACTIVE'),
      supabase.from('prescription').select('consultation_id', { count: 'exact', head: true })
        .eq('patient_id', patient.id),
      supabase.from('patient_health_profile').select('patient_id').eq('patient_id', patient.id).maybeSingle(),
    ])

    setStats({
      upcoming: upcomingRes.count ?? 0,
      activeDoctors: doctorsRes.count ?? 0,
      prescriptions: rxRes.count ?? 0,
      hasHealthProfile: !!profileRes.data,
    })
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { load() }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    // Root layout auth listener handles redirect
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.gray[50] }}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            {loading ? 'Loading…' : `Namaste, ${name} 🙏`}
          </Text>
          <Text style={styles.subGreeting}>Ayushpathi Patient App</Text>
        </View>
        <Pressable onPress={handleSignOut} style={styles.signOutBtn}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor={colors.brand[600]} />}
      >
        {/* Health profile nudge */}
        {!loading && !stats.hasHealthProfile && (
          <View style={styles.nudge}>
            <Text style={styles.nudgeIcon}>⚠️</Text>
            <View style={styles.nudgeText}>
              <Text style={styles.nudgeTitle}>Complete your health profile</Text>
              <Text style={styles.nudgeDesc}>Add conditions, allergies & medications for better care</Text>
            </View>
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatCard icon="📅" label="Upcoming" value={loading ? '–' : stats.upcoming}
            onPress={() => {}} />
          <StatCard icon="👨‍⚕️" label="My Doctors" value={loading ? '–' : stats.activeDoctors}
            onPress={() => {}} />
          <StatCard icon="💊" label="Prescriptions" value={loading ? '–' : stats.prescriptions}
            onPress={() => {}} />
        </View>

        {/* Quick actions */}
        <Text style={styles.sectionTitle}>Quick actions</Text>
        <View style={styles.quickActions}>
          <QuickAction icon="🔍" title="Find doctors near me"
            desc="Search by specialization" onPress={() => {}} />
          <QuickAction icon="📋" title="Health records"
            desc="Consultations & prescriptions" onPress={() => {}} />
          <QuickAction icon="💚" title="Health profile"
            desc="Conditions, allergies, medications" onPress={() => {}} />
          <QuickAction icon="🔒" title="Consent & privacy"
            desc="Manage doctor access" onPress={() => {}} />
        </View>

        <Text style={styles.footer}>Data stored securely in India · DPDP Act 2023</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.gray[100],
  },
  greeting: { fontSize: 18, fontWeight: '700', color: colors.gray[900] },
  subGreeting: { fontSize: 12, color: colors.gray[500], marginTop: 2 },
  signOutBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1, borderColor: colors.gray[200] },
  signOutText: { fontSize: 13, color: colors.gray[500] },
  scroll: { padding: 16, gap: 16 },
  nudge: {
    backgroundColor: colors.amber[50], borderWidth: 1, borderColor: colors.amber[200],
    borderRadius: 14, padding: 14, flexDirection: 'row', gap: 12, alignItems: 'flex-start',
  },
  nudgeIcon: { fontSize: 22 },
  nudgeText: { flex: 1, gap: 2 },
  nudgeTitle: { fontSize: 14, fontWeight: '600', color: colors.amber[900] },
  nudgeDesc: { fontSize: 12, color: colors.amber[800], lineHeight: 16 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1, backgroundColor: colors.white, borderRadius: 14, padding: 14,
    alignItems: 'center', gap: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  statIcon: { fontSize: 22 },
  statValue: { fontSize: 24, fontWeight: '700', color: colors.gray[900] },
  statLabel: { fontSize: 11, color: colors.gray[500], textAlign: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.gray[900] },
  quickActions: { gap: 10 },
  quickAction: {
    backgroundColor: colors.white, borderRadius: 14, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  qaIcon: { fontSize: 26 },
  qaText: { flex: 1, gap: 2 },
  qaTitle: { fontSize: 14, fontWeight: '600', color: colors.gray[900] },
  qaDesc: { fontSize: 12, color: colors.gray[500] },
  qaArrow: { fontSize: 20, color: colors.gray[300] },
  footer: { textAlign: 'center', fontSize: 11, color: colors.gray[400], paddingBottom: 8 },
})
