import { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'

interface Prescription {
  id: string
  entry_method: string
  created_at: string
  medicines: Array<{
    name: string
    dosage?: string
    frequency?: string
    duration?: string
    instructions?: string
  }> | null
  notes: string | null
  appointment: {
    appointment_date: string
    start_time: string
    patient: { first_name: string; last_name: string } | null
  } | null
}

async function authFetch(path: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  return fetch(`${process.env.EXPO_PUBLIC_API_URL ?? ''}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token ?? ''}`,
      ...(options.headers ?? {}),
    },
  })
}

export default function PrescriptionSignOff() {
  const router = useRouter()
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [verifying, setVerifying] = useState<string | null>(null)

  async function load() {
    try {
      const res = await authFetch('/api/doctor/prescription/verify')
      const json = await res.json()
      setPrescriptions(json.prescriptions ?? [])
    } catch {}
    setLoading(false)
    setRefreshing(false)
  }

  useFocusEffect(useCallback(() => { load() }, []))
  function onRefresh() { setRefreshing(true); load() }

  async function verify(id: string, patientName: string) {
    Alert.alert(
      'Verify Prescription',
      `Confirm this prescription for ${patientName} is clinically correct?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Verify ✓',
          onPress: async () => {
            setVerifying(id)
            try {
              const res = await authFetch('/api/doctor/prescription/verify', {
                method: 'PATCH',
                body: JSON.stringify({ prescription_id: id }),
              })
              if (res.ok) {
                setPrescriptions(p => p.filter(rx => rx.id !== id))
              } else {
                const json = await res.json()
                Alert.alert('Error', json.error ?? 'Could not verify')
              }
            } catch {
              Alert.alert('Error', 'Network error')
            }
            setVerifying(null)
          },
        },
      ],
    )
  }

  function methodBadge(method: string) {
    const map: Record<string, { label: string; color: string }> = {
      RECEPTIONIST: { label: 'Receptionist', color: '#f59e0b' },
      SCANNED: { label: 'Scanned', color: '#8b5cf6' },
      IMPORTED: { label: 'Imported', color: '#3b82f6' },
    }
    return map[method] ?? { label: method, color: '#6b7280' }
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#16A34A" />

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#374151" />
        </TouchableOpacity>
        <Text style={s.title}>Prescriptions to Sign Off</Text>
        <View style={s.badge}>
          <Text style={s.badgeText}>{prescriptions.length}</Text>
        </View>
      </View>

      {prescriptions.length === 0 ? (
        <View style={s.emptyState}>
          <Text style={s.emptyIcon}>✅</Text>
          <Text style={s.emptyTitle}>All caught up!</Text>
          <Text style={s.emptyText}>No prescriptions pending your sign-off.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16A34A" />}
        >
          <Text style={s.subtext}>
            Review prescriptions entered by receptionists or scanned documents. Verify they're clinically correct before they become official.
          </Text>
          {prescriptions.map(rx => {
            const patient = rx.appointment?.patient
            const patientName = patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown Patient'
            const apptDate = rx.appointment?.appointment_date
            const badge = methodBadge(rx.entry_method)
            return (
              <View key={rx.id} style={s.card}>
                <View style={s.cardHeader}>
                  <View style={s.patientInfo}>
                    <Text style={s.patientName}>{patientName}</Text>
                    {apptDate && (
                      <Text style={s.apptDate}>
                        {new Date(apptDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {rx.appointment?.start_time ? ` · ${rx.appointment.start_time.slice(0, 5)}` : ''}
                      </Text>
                    )}
                  </View>
                  <View style={[s.methodBadge, { backgroundColor: badge.color + '20', borderColor: badge.color }]}>
                    <Text style={[s.methodText, { color: badge.color }]}>{badge.label}</Text>
                  </View>
                </View>

                {/* Medicines */}
                {rx.medicines && rx.medicines.length > 0 && (
                  <View style={s.medicinesSection}>
                    <Text style={s.sectionLabel}>Medicines</Text>
                    {rx.medicines.map((med, i) => (
                      <View key={i} style={s.medRow}>
                        <View style={s.medBullet} />
                        <View style={s.medInfo}>
                          <Text style={s.medName}>{med.name}</Text>
                          <Text style={s.medDetail}>
                            {[med.dosage, med.frequency, med.duration].filter(Boolean).join(' · ')}
                          </Text>
                          {med.instructions && (
                            <Text style={s.medInstructions}>{med.instructions}</Text>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Notes */}
                {rx.notes && (
                  <View style={s.notesSection}>
                    <Text style={s.sectionLabel}>Notes</Text>
                    <Text style={s.notesText}>{rx.notes}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[s.verifyBtn, verifying === rx.id && s.verifyBtnDisabled]}
                  onPress={() => verify(rx.id, patientName)}
                  disabled={verifying === rx.id}
                >
                  {verifying === rx.id ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color="#fff" />
                      <Text style={s.verifyBtnText}>Verify Prescription</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )
          })}
        </ScrollView>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  backBtn: { padding: 4 },
  title: { flex: 1, fontSize: 17, fontWeight: '600', color: '#111827' },
  badge: {
    backgroundColor: '#f59e0b', borderRadius: 12,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  badgeText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  list: { padding: 16, gap: 12 },
  subtext: { fontSize: 13, color: '#6b7280', marginBottom: 4 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 4 },
  emptyText: { fontSize: 14, color: '#6b7280', textAlign: 'center' },
  card: {
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1, borderColor: '#e5e7eb', padding: 14, gap: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  patientInfo: { flex: 1 },
  patientName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  apptDate: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  methodBadge: {
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  methodText: { fontSize: 11, fontWeight: '600' },
  medicinesSection: { gap: 6 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  medRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  medBullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#16A34A', marginTop: 5 },
  medInfo: { flex: 1 },
  medName: { fontSize: 14, fontWeight: '500', color: '#111827' },
  medDetail: { fontSize: 12, color: '#6b7280' },
  medInstructions: { fontSize: 12, color: '#d97706', fontStyle: 'italic' },
  notesSection: { gap: 4 },
  notesText: { fontSize: 13, color: '#374151' },
  verifyBtn: {
    backgroundColor: '#16A34A', borderRadius: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 11,
  },
  verifyBtnDisabled: { opacity: 0.6 },
  verifyBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
})
