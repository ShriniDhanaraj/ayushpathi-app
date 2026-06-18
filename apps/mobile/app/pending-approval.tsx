import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView,
} from 'react-native'
import { supabase } from '../lib/supabase'

type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | null

export default function PendingApprovalScreen() {
  const [status, setStatus] = useState<VerificationStatus>(null)
  const [doctorName, setDoctorName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDoctorStatus()
  }, [])

  async function loadDoctorStatus() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('doctor')
      .select('first_name, last_name, verification_status')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (data) {
      setDoctorName(`${data.first_name} ${data.last_name}`)
      setStatus(data.verification_status as VerificationStatus)
    }
    setLoading(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  const CONFIG: Record<string, { icon: string; title: string; color: string; bg: string; msg: string }> = {
    PENDING: {
      icon: '⏳',
      title: 'Awaiting Admin Approval',
      color: '#b7770d',
      bg: '#fef9e7',
      msg: 'Your registration is under review. Our team typically verifies credentials within 1–2 business days. You will receive an email once approved.',
    },
    REJECTED: {
      icon: '❌',
      title: 'Verification Rejected',
      color: '#c0392b',
      bg: '#fde8e8',
      msg: 'Unfortunately your credentials could not be verified. Please contact support at support@ayushpathi.in for more information.',
    },
    APPROVED: {
      icon: '✅',
      title: 'Account Verified',
      color: '#1a6b3a',
      bg: '#e8f5ee',
      msg: 'Your account has been verified. Doctor dashboard coming soon!',
    },
  }

  const cfg = status ? CONFIG[status] : CONFIG['PENDING']

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>🌿</Text>
        <Text style={styles.appName}>Ayushpathi</Text>
        <Text style={styles.role}>Doctor Portal</Text>
      </View>

      {loading ? (
        <ActivityIndicator color="#1a6b3a" size="large" style={{ marginTop: 60 }} />
      ) : (
        <>
          {/* Status card */}
          <View style={[styles.statusCard, { backgroundColor: cfg.bg, borderColor: cfg.color }]}>
            <Text style={styles.statusIcon}>{cfg.icon}</Text>
            <Text style={[styles.statusTitle, { color: cfg.color }]}>{cfg.title}</Text>
            <Text style={styles.statusMsg}>{cfg.msg}</Text>
          </View>

          {/* Doctor info */}
          {doctorName ? (
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Registered as</Text>
              <Text style={styles.infoValue}>Dr. {doctorName}</Text>
              <Text style={styles.infoLabel}>Status</Text>
              <View style={[styles.badge, { backgroundColor: cfg.color }]}>
                <Text style={styles.badgeText}>{status ?? 'PENDING'}</Text>
              </View>
            </View>
          ) : null}

          {/* What's next */}
          <View style={styles.stepsCard}>
            <Text style={styles.stepsTitle}>What happens next?</Text>
            {[
              { step: '1', text: 'Admin reviews your submitted credentials' },
              { step: '2', text: 'Verification email sent to your registered address' },
              { step: '3', text: 'Access to Doctor Dashboard unlocked' },
            ].map(item => (
              <View key={item.step} style={styles.stepRow}>
                <View style={styles.stepNum}><Text style={styles.stepNumText}>{item.step}</Text></View>
                <Text style={styles.stepText}>{item.text}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.refreshBtn} onPress={loadDoctorStatus}>
            <Text style={styles.refreshText}>↻  Refresh status</Text>
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f7f4' },
  content: { padding: 24, paddingBottom: 48 },
  header: { alignItems: 'center', paddingVertical: 32 },
  logo: { fontSize: 48, marginBottom: 8 },
  appName: { fontSize: 26, fontWeight: '700', color: '#1a6b3a' },
  role: { fontSize: 13, color: '#888', marginTop: 4 },
  statusCard: {
    borderWidth: 1.5, borderRadius: 16, padding: 24,
    alignItems: 'center', marginBottom: 20,
  },
  statusIcon: { fontSize: 48, marginBottom: 12 },
  statusTitle: { fontSize: 20, fontWeight: '700', marginBottom: 10, textAlign: 'center' },
  statusMsg: { fontSize: 14, color: '#555', textAlign: 'center', lineHeight: 22 },
  infoCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 20,
    borderWidth: 1, borderColor: '#d0e8da', marginBottom: 20,
  },
  infoLabel: { fontSize: 11, color: '#888', marginBottom: 4, marginTop: 8 },
  infoValue: { fontSize: 17, fontWeight: '600', color: '#1a6b3a' },
  badge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginTop: 4 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  stepsCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 20,
    borderWidth: 1, borderColor: '#d0e8da', marginBottom: 20,
  },
  stepsTitle: { fontSize: 15, fontWeight: '700', color: '#333', marginBottom: 16 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 12 },
  stepNum: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#1a6b3a', alignItems: 'center', justifyContent: 'center',
  },
  stepNumText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  stepText: { flex: 1, fontSize: 14, color: '#555', lineHeight: 20 },
  refreshBtn: {
    borderWidth: 1, borderColor: '#1a6b3a', borderRadius: 10,
    padding: 14, alignItems: 'center', marginBottom: 16,
  },
  refreshText: { color: '#1a6b3a', fontWeight: '600', fontSize: 15 },
  signOutBtn: { alignItems: 'center', padding: 12 },
  signOutText: { color: '#888', fontSize: 14 },
})

