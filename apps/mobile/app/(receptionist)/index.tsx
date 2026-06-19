import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, RefreshControl,
  StyleSheet, ActivityIndicator, Alert, Modal, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { openWhatsApp, buildAppointmentConfirmation, buildWalkInToken } from '../../lib/whatsapp'

// ── Types ─────────────────────────────────────────────────────
interface Appointment {
  id: string; start_time: string; end_time: string; status: string; is_walk_in: boolean
  patient: { first_name: string; last_name: string; mobile: string } | null
  doctor: { first_name: string; last_name: string; ayush_specialization: string } | null
  appointment_date: string; type: string
}

interface IdentifiedPatient {
  id: string
  first_name: string
  last_name: string
  date_of_birth: string | null
  mobile: string | null
  gender: string | null
  address: {
    door_number: string | null
    street: string | null
    area: string | null
    city: string | null
    state: string | null
    pincode: string | null
  } | null
  known_conditions: string[]
  allergies: string[]
}

// ── Constants ─────────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  BOOKED: '#3B82F6', CONFIRMED: '#6366F1', ARRIVED: '#F59E0B',
  IN_PROGRESS: '#F97316', COMPLETED: '#16A34A', NO_SHOW: '#EF4444', CANCELLED: '#9CA3AF',
}
const NEXT_STATUS: Record<string, string[]> = {
  BOOKED: ['ARRIVED', 'NO_SHOW'], CONFIRMED: ['ARRIVED', 'NO_SHOW'],
  ARRIVED: ['IN_PROGRESS'], IN_PROGRESS: ['COMPLETED'],
  COMPLETED: [], NO_SHOW: [], CANCELLED: [],
}

const BASE_URL = 'https://rasbros.com'

async function getAuthToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? ''
}

async function authFetch(path: string, opts: RequestInit = {}) {
  const token = await getAuthToken()
  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(opts.headers ?? {}),
    },
  })
}

// ── Identify Caller Modal ─────────────────────────────────────
function IdentifyCallerModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [step, setStep] = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Step 1 inputs
  const [mobile, setMobile] = useState('')
  const [dob, setDob] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')

  // Step 1 result
  const [patientId, setPatientId] = useState('')
  const [maskedAddress, setMaskedAddress] = useState('')

  // Step 2 input
  const [addressInput, setAddressInput] = useState('')

  // Step 2 result
  const [profile, setProfile] = useState<IdentifiedPatient | null>(null)

  function reset() {
    setStep(1); setError(''); setLoading(false)
    setMobile(''); setDob(''); setFirstName(''); setLastName('')
    setPatientId(''); setMaskedAddress(''); setAddressInput(''); setProfile(null)
  }

  function handleClose() { reset(); onClose() }

  async function step1Lookup() {
    if (!mobile || !dob || !firstName || !lastName) {
      setError('All fields are required.')
      return
    }
    setLoading(true); setError('')
    try {
      const res = await authFetch('/api/receptionist/identify', {
        method: 'POST',
        body: JSON.stringify({
          mobile: mobile.trim(),
          date_of_birth: dob.trim(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Patient not found.'); return }
      setPatientId(json.patient_id)
      setMaskedAddress(json.masked_address)
      setStep(2)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function step2Confirm() {
    if (!addressInput.trim()) { setError('Please enter the address to confirm.'); return }
    setLoading(true); setError('')
    try {
      const res = await authFetch('/api/receptionist/identify/confirm', {
        method: 'POST',
        body: JSON.stringify({ patient_id: patientId, address_line_1: addressInput.trim() }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Address does not match.')
        return
      }
      setProfile(json.patient)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose} presentationStyle="pageSheet">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={id.container}>
          {/* Header */}
          <View style={id.header}>
            <TouchableOpacity onPress={handleClose} style={id.closeBtn}>
              <Text style={id.closeBtnText}>✕</Text>
            </TouchableOpacity>
            <Text style={id.title}>👤 Identify Caller</Text>
            {!profile && (
              <View style={id.stepIndicator}>
                <Text style={id.stepText}>Step {step} of 2</Text>
              </View>
            )}
          </View>

          <ScrollView style={id.body} keyboardShouldPersistTaps="handled">
            {error ? (
              <View style={id.errorBox}>
                <Text style={id.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* ── Step 1: Lookup ── */}
            {step === 1 && !profile && (
              <View>
                <Text style={id.hint}>Enter the caller's details to find their record.</Text>
                <Text style={id.label}>Mobile Number *</Text>
                <TextInput style={id.input} value={mobile} onChangeText={setMobile}
                  placeholder="10-digit mobile" keyboardType="phone-pad" placeholderTextColor="#bbb" />
                <Text style={id.label}>Date of Birth *</Text>
                <TextInput style={id.input} value={dob} onChangeText={setDob}
                  placeholder="YYYY-MM-DD" placeholderTextColor="#bbb" />
                <Text style={id.label}>First Name *</Text>
                <TextInput style={id.input} value={firstName} onChangeText={setFirstName}
                  placeholder="First name" placeholderTextColor="#bbb" />
                <Text style={id.label}>Last Name *</Text>
                <TextInput style={id.input} value={lastName} onChangeText={setLastName}
                  placeholder="Last name" placeholderTextColor="#bbb"
                  returnKeyType="done" onSubmitEditing={step1Lookup} />
                <TouchableOpacity style={[id.btn, loading && id.btnDisabled]}
                  onPress={step1Lookup} disabled={loading}>
                  {loading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={id.btnText}>Find Patient →</Text>}
                </TouchableOpacity>
              </View>
            )}

            {/* ── Step 2: GDPR Address Confirm ── */}
            {step === 2 && !profile && (
              <View>
                <View style={id.gdprBox}>
                  <Text style={id.gdprTitle}>🔒 GDPR Verification</Text>
                  <Text style={id.gdprText}>
                    A patient was found. To reveal their profile, ask the caller to state their
                    door number and street name.
                  </Text>
                </View>
                <Text style={id.maskedLabel}>Expected address starts with:</Text>
                <View style={id.maskedBox}>
                  <Text style={id.maskedText}>{maskedAddress}</Text>
                </View>
                <Text style={id.label}>Caller's Address (door + street) *</Text>
                <TextInput style={id.input} value={addressInput} onChangeText={setAddressInput}
                  placeholder="e.g. 12A Gandhi Street" placeholderTextColor="#bbb"
                  returnKeyType="done" onSubmitEditing={step2Confirm} />
                <TouchableOpacity style={[id.btn, loading && id.btnDisabled]}
                  onPress={step2Confirm} disabled={loading}>
                  {loading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={id.btnText}>Confirm Identity ✓</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={id.backBtn} onPress={() => { setStep(1); setError('') }}>
                  <Text style={id.backBtnText}>← Back to search</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ── Step 3: Profile revealed ── */}
            {profile && (
              <View>
                <View style={id.successBanner}>
                  <Text style={id.successIcon}>✅</Text>
                  <Text style={id.successText}>Identity Confirmed</Text>
                </View>

                <View style={id.profileCard}>
                  <Text style={id.profileName}>{profile.first_name} {profile.last_name}</Text>
                  <ProfileRow label="Date of Birth" value={profile.date_of_birth ?? '—'} />
                  <ProfileRow label="Gender"        value={profile.gender ?? '—'} />
                  <ProfileRow label="Mobile"        value={profile.mobile ?? '—'} />
                  {profile.address && (
                    <ProfileRow label="Address" value={[
                      profile.address.door_number, profile.address.street,
                      profile.address.area, profile.address.city,
                      profile.address.state, profile.address.pincode,
                    ].filter(Boolean).join(', ')} />
                  )}
                </View>

                {(profile.known_conditions?.length > 0 || profile.allergies?.length > 0) && (
                  <View style={id.healthCard}>
                    <Text style={id.healthTitle}>⚕️ Health Flags</Text>
                    {profile.known_conditions?.length > 0 && (
                      <Text style={id.healthRow}>
                        <Text style={id.healthLabel}>Conditions: </Text>
                        {profile.known_conditions.join(', ')}
                      </Text>
                    )}
                    {profile.allergies?.length > 0 && (
                      <Text style={id.healthRow}>
                        <Text style={id.healthLabel}>Allergies: </Text>
                        {profile.allergies.join(', ')}
                      </Text>
                    )}
                  </View>
                )}

                <TouchableOpacity style={[id.btn, { marginTop: 16 }]} onPress={handleClose}>
                  <Text style={id.btnText}>Done</Text>
                </TouchableOpacity>
                <TouchableOpacity style={id.backBtn} onPress={reset}>
                  <Text style={id.backBtnText}>Identify another caller</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={id.profileRow}>
      <Text style={id.profileLabel}>{label}</Text>
      <Text style={id.profileValue}>{value}</Text>
    </View>
  )
}

// ── Main Screen ───────────────────────────────────────────────
export default function ReceptionistQueueScreen() {
  const router = useRouter()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [identifyVisible, setIdentifyVisible] = useState(false)
  const today = new Date().toISOString().split('T')[0]

  async function load() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data: rec } = await supabase
      .from('receptionist')
      .select('hospital_id')
      .eq('auth_user_id', session.user.id)
      .maybeSingle()
    const url = `${BASE_URL}/api/receptionist/appointments?date=${today}${rec?.hospital_id ? `&hospital_id=${rec.hospital_id}` : ''}`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${session.access_token}` } })
    const json = await res.json()
    setAppointments(json.appointments ?? [])
    setLoading(false); setRefreshing(false)
  }

  useEffect(() => { load() }, [])
  const onRefresh = useCallback(() => { setRefreshing(true); load() }, [])

  async function updateStatus(id: string, status: string) {
    const token = await getAuthToken()
    const res = await fetch(`${BASE_URL}/api/receptionist/appointments/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    })
    if (!res.ok) { Alert.alert('Error', 'Failed to update status'); return }
    load()
  }

  function sendConfirmWA(apt: Appointment) {
    if (!apt.patient?.mobile) return
    const msg = buildAppointmentConfirmation({
      patientName: `${apt.patient.first_name} ${apt.patient.last_name}`,
      doctorName: `${apt.doctor?.first_name} ${apt.doctor?.last_name}`,
      specialization: apt.doctor?.ayush_specialization,
      date: apt.appointment_date, startTime: apt.start_time,
      type: apt.type, appointmentId: apt.id,
    })
    openWhatsApp(apt.patient.mobile, msg)
  }

  function sendWalkInWA(apt: Appointment, position: number) {
    if (!apt.patient?.mobile) return
    const msg = buildWalkInToken({
      patientName: `${apt.patient.first_name} ${apt.patient.last_name}`,
      doctorName: `${apt.doctor?.first_name} ${apt.doctor?.last_name}`,
      position,
    })
    openWhatsApp(apt.patient.mobile, msg)
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#16A34A" />

  let walkInCount = 0

  return (
    <>
      <ScrollView
        style={s.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16A34A" />}
      >
        <View style={s.header}>
          <View>
            <Text style={s.title}>Today's Queue</Text>
            <Text style={s.dateText}>
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </Text>
          </View>
          <View style={s.headerBtns}>
            <TouchableOpacity onPress={() => setIdentifyVisible(true)} style={[s.headerBtn, s.identifyBtn]}>
              <Text style={s.identifyBtnText}>👤 Identify</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/(receptionist)/book')} style={[s.headerBtn, s.bookBtn]}>
              <Text style={s.bookBtnText}>+ Book</Text>
            </TouchableOpacity>
          </View>
        </View>

        {appointments.length === 0 ? (
          <Text style={s.emptyText}>No appointments today</Text>
        ) : appointments.map(apt => {
          if (apt.is_walk_in) walkInCount++
          const pos = apt.is_walk_in ? walkInCount : 0
          const nextStatuses = NEXT_STATUS[apt.status] ?? []

          return (
            <View key={apt.id} style={s.card}>
              <View style={s.cardRow}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <Text style={s.patientName}>{apt.patient?.first_name} {apt.patient?.last_name}</Text>
                    {apt.is_walk_in && (
                      <View style={s.walkInBadge}><Text style={s.walkInText}>Walk-in #{pos}</Text></View>
                    )}
                  </View>
                  <Text style={s.subText}>{apt.start_time?.slice(0, 5)} · Dr. {apt.doctor?.first_name} {apt.doctor?.last_name}</Text>
                  <Text style={s.mobileText}>{apt.patient?.mobile}</Text>
                </View>
                <View style={[s.statusBadge, { backgroundColor: (STATUS_COLOR[apt.status] ?? '#9CA3AF') + '20' }]}>
                  <Text style={[s.statusText, { color: STATUS_COLOR[apt.status] ?? '#9CA3AF' }]}>{apt.status}</Text>
                </View>
              </View>

              {/* Status actions */}
              {nextStatuses.length > 0 && (
                <View style={[s.actionRow, { marginTop: 8 }]}>
                  {nextStatuses.map(s2 => (
                    <TouchableOpacity key={s2} onPress={() => updateStatus(apt.id, s2)} style={s.actionBtn}>
                      <Text style={s.actionBtnText}>{s2.replace('_', ' ')}</Text>
                    </TouchableOpacity>
                  ))}
                  {apt.status === 'COMPLETED' && (
                    <TouchableOpacity
                      onPress={() => router.push({
                        pathname: '/(receptionist)/prescription',
                        params: { appointmentId: apt.id, patientName: `${apt.patient?.first_name} ${apt.patient?.last_name}` },
                      })}
                      style={[s.actionBtn, { backgroundColor: '#16A34A' }]}
                    >
                      <Text style={[s.actionBtnText, { color: '#fff' }]}>+ Prescription</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* WhatsApp actions */}
              {apt.patient?.mobile && (
                <View style={[s.actionRow, { marginTop: 6 }]}>
                  {['BOOKED', 'CONFIRMED'].includes(apt.status) && (
                    <TouchableOpacity onPress={() => sendConfirmWA(apt)} style={s.waBtn}>
                      <Text style={s.waBtnText}>💬 Confirm</Text>
                    </TouchableOpacity>
                  )}
                  {apt.is_walk_in && apt.status === 'BOOKED' && (
                    <TouchableOpacity onPress={() => sendWalkInWA(apt, pos)} style={[s.waBtn, { borderColor: '#7C3AED' }]}>
                      <Text style={[s.waBtnText, { color: '#7C3AED' }]}>💬 Token</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          )
        })}
        <View style={{ height: 40 }} />
      </ScrollView>

      <IdentifyCallerModal visible={identifyVisible} onClose={() => setIdentifyVisible(false)} />
    </>
  )
}

// ── Styles ────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 16, paddingTop: 56 },
  title: { fontSize: 20, fontWeight: '700', color: '#166534' },
  dateText: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  headerBtns: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  headerBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  identifyBtn: { backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: '#C7D2FE' },
  identifyBtnText: { color: '#4338CA', fontSize: 13, fontWeight: '600' },
  bookBtn: { backgroundColor: '#16A34A' },
  bookBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  emptyText: { textAlign: 'center', color: '#9CA3AF', marginTop: 40 },
  card: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 10, borderRadius: 10, padding: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start' },
  patientName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  subText: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  mobileText: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  walkInBadge: { backgroundColor: '#EDE9FE', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  walkInText: { fontSize: 10, color: '#7C3AED', fontWeight: '600' },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  actionBtn: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 },
  actionBtnText: { fontSize: 12, color: '#374151' },
  waBtn: { borderWidth: 1, borderColor: '#25D366', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 },
  waBtnText: { fontSize: 12, color: '#16A34A', fontWeight: '600' },
})

const id = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { backgroundColor: '#fff', paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', flexDirection: 'row', alignItems: 'center', gap: 12 },
  closeBtn: { padding: 4 },
  closeBtnText: { fontSize: 18, color: '#6B7280' },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: '#111827' },
  stepIndicator: { backgroundColor: '#F3F4F6', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  stepText: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  body: { flex: 1, padding: 20 },
  hint: { fontSize: 14, color: '#6B7280', marginBottom: 20, lineHeight: 20 },
  label: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, fontSize: 15, color: '#111827' },
  btn: { backgroundColor: '#4F46E5', borderRadius: 10, padding: 15, alignItems: 'center', marginTop: 24 },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  backBtn: { alignItems: 'center', padding: 14 },
  backBtnText: { color: '#4F46E5', fontSize: 14, fontWeight: '600' },
  errorBox: { backgroundColor: '#FEE2E2', borderRadius: 8, padding: 12, marginBottom: 12 },
  errorText: { color: '#DC2626', fontSize: 13 },
  gdprBox: { backgroundColor: '#EFF6FF', borderRadius: 10, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#BFDBFE' },
  gdprTitle: { fontSize: 14, fontWeight: '700', color: '#1E40AF', marginBottom: 6 },
  gdprText: { fontSize: 13, color: '#1E40AF', lineHeight: 18 },
  maskedLabel: { fontSize: 12, color: '#6B7280', marginBottom: 6 },
  maskedBox: { backgroundColor: '#F3F4F6', borderRadius: 8, padding: 12, marginBottom: 16 },
  maskedText: { fontSize: 14, fontWeight: '600', color: '#374151', fontFamily: 'monospace' },
  successBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#ECFDF5', borderRadius: 10, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: '#A7F3D0' },
  successIcon: { fontSize: 22 },
  successText: { fontSize: 16, fontWeight: '700', color: '#065F46' },
  profileCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#D1D5DB', overflow: 'hidden', marginBottom: 12 },
  profileName: { fontSize: 18, fontWeight: '700', color: '#111827', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  profileRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  profileLabel: { fontSize: 13, color: '#9CA3AF', flex: 1 },
  profileValue: { fontSize: 13, fontWeight: '500', color: '#111827', flex: 2, textAlign: 'right' },
  healthCard: { backgroundColor: '#FFF7ED', borderRadius: 12, borderWidth: 1, borderColor: '#FED7AA', padding: 14 },
  healthTitle: { fontSize: 13, fontWeight: '700', color: '#92400E', marginBottom: 8 },
  healthRow: { fontSize: 13, color: '#92400E', marginBottom: 4, lineHeight: 18 },
  healthLabel: { fontWeight: '700' },
})
