import { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, TextInput,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import { resolveAndOpenSupportWA } from '../lib/whatsapp'
import * as ImagePicker from 'expo-image-picker'
import * as DocumentPicker from 'expo-document-picker'

const WEB_API = 'https://rasbros.com'

// ── Types ─────────────────────────────────────────────────────
interface DoctorProfile {
  id: string; first_name: string; last_name: string
  ayush_specialization: string; verification_status: string
}
interface Appointment {
  id: string; appointment_date: string; start_time: string
  end_time: string; status: string; type: string
  patient: { id: string; first_name: string; last_name: string; mobile: string } | null
}
interface ConsultationForm {
  chief_complaint: string; diagnosis: string; notes: string; next_visit_date: string
}
interface TestResultRow {
  id: string; file_name: string; file_type: string; notes: string | null
}
interface PatientFamilyRow {
  id: string; relation_type: string; first_name: string | null; last_name: string | null
  known_conditions: string[]; allergies: string[]; notes: string | null
}
const RELATION_LABEL: Record<string, string> = {
  FATHER:'Father', MOTHER:'Mother', SPOUSE:'Spouse', SIBLING:'Sibling',
  CHILD:'Child', GRANDPARENT:'Grandparent', OTHER:'Other',
}

const SPEC: Record<string, string> = {
  AYU: 'Ayurveda', YOG: 'Yoga & Naturopathy', UNA: 'Unani', SID: 'Siddha', HOM: 'Homeopathy',
}
const STATUS_COLOR: Record<string, string> = {
  BOOKED: '#2980b9', CONFIRMED: '#6366F1', ARRIVED: '#F59E0B',
  IN_PROGRESS: '#F97316', COMPLETED: '#27ae60', CANCELLED: '#e74c3c',
}

// ── Consultation + Attachment Modal ───────────────────────────
function ConsultationModal({
  appointment, doctorId, onClose, onSaved,
}: {
  appointment: Appointment | null
  doctorId: string
  onClose: () => void
  onSaved: () => void
}) {
  const [step, setStep] = useState<'form' | 'attachments'>('form')
  const [savedConsultId, setSavedConsultId] = useState<string | null>(null)
  const [savedPatientId, setSavedPatientId] = useState<string | null>(null)
  const [form, setForm] = useState<ConsultationForm>({
    chief_complaint: '', diagnosis: '', notes: '', next_visit_date: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Family history state
  const [familyMembers, setFamilyMembers] = useState<PatientFamilyRow[] | null>(null)
  const [familyExpanded, setFamilyExpanded] = useState(false)

  async function loadFamilyHistory(patientId: string) {
    if (familyMembers !== null) return // already loaded
    const { data } = await supabase
      .from('patient_family')
      .select('id, relation_type, first_name, last_name, known_conditions, allergies, notes')
      .eq('patient_id', patientId)
      .order('relation_type')
    setFamilyMembers((data ?? []) as PatientFamilyRow[])
  }

  // Attachment state
  const [attachments, setAttachments] = useState<TestResultRow[]>([])
  const [uploading, setUploading] = useState(false)
  const [attachNote, setAttachNote] = useState('')

  function setField(field: keyof ConsultationForm, val: string) {
    setForm(p => ({ ...p, [field]: val }))
  }

  async function save() {
    if (!form.chief_complaint.trim()) { setError('Chief complaint is required.'); return }
    if (!appointment) return
    setSaving(true); setError('')
    try {
      const patientId = appointment.patient?.id
      if (!patientId) throw new Error('Patient record not found on this appointment')

      const { data, error: insertErr } = await supabase.from('consultation').insert({
        appointment_id: appointment.id,
        patient_id: patientId,
        doctor_id: doctorId,
        chief_complaint: form.chief_complaint.trim(),
        diagnosis: form.diagnosis.trim() || null,
        notes: form.notes.trim() || null,
        next_visit_date: form.next_visit_date.trim() || null,
      }).select('id').single()
      if (insertErr) throw insertErr
      setSavedConsultId(data.id)
      setSavedPatientId(patientId)
      onSaved()
      setStep('attachments')
    } catch (e: any) {
      setError(e.message ?? 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  async function uploadFile(uri: string, name: string, mimeType: string) {
    if (!savedConsultId || !savedPatientId || !appointment) return
    setUploading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const formData = new FormData()
      formData.append('file', { uri, name, type: mimeType } as any)
      formData.append('appointment_id', appointment.id)
      formData.append('patient_id', savedPatientId)
      formData.append('uploaded_by_role', 'DOCTOR')
      if (attachNote.trim()) formData.append('notes', attachNote.trim())

      const res = await fetch(`${WEB_API}/api/test-results/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Upload failed')
      setAttachments(prev => [...prev, json.test_result])
      setAttachNote('')
    } catch (e: any) {
      Alert.alert('Upload Failed', e.message)
    } finally {
      setUploading(false)
    }
  }

  async function pickImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) { Alert.alert('Permission needed', 'Allow photo access to attach images.'); return }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsMultipleSelection: false,
    })
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0]
      const name = asset.fileName ?? `image_${Date.now()}.jpg`
      const mime = asset.mimeType ?? 'image/jpeg'
      await uploadFile(asset.uri, name, mime)
    }
  }

  async function pickDocument() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
    })
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0]
      await uploadFile(asset.uri, asset.name, asset.mimeType ?? 'application/pdf')
    }
  }

  if (!appointment) return null

  return (
    <Modal visible animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={cm.header}>
          <TouchableOpacity onPress={onClose} style={cm.closeBtn}>
            <Ionicons name="close" size={22} color="#6B7280" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={cm.title}>
              {step === 'form' ? 'Consultation Notes' : 'Attach Test Results'}
            </Text>
            <Text style={cm.sub}>
              {appointment.patient?.first_name} {appointment.patient?.last_name} · {appointment.start_time?.slice(0, 5)}
            </Text>
          </View>
          {step === 'attachments' && (
            <View style={cm.savedBadge}>
              <Text style={cm.savedBadgeText}>✓ Saved</Text>
            </View>
          )}
        </View>

        <ScrollView style={cm.body} keyboardShouldPersistTaps="handled">
          {step === 'form' ? (
            <>
              {error ? <View style={cm.errorBox}><Text style={cm.errorText}>{error}</Text></View> : null}
              <Text style={cm.label}>Chief Complaint *</Text>
              <TextInput style={cm.input} value={form.chief_complaint} onChangeText={v => setField('chief_complaint', v)}
                placeholder="e.g. Chronic back pain, digestive issues…" placeholderTextColor="#bbb"
                multiline numberOfLines={3} textAlignVertical="top" />
              <Text style={cm.label}>Diagnosis</Text>
              <TextInput style={cm.input} value={form.diagnosis} onChangeText={v => setField('diagnosis', v)}
                placeholder="Diagnosis (optional)" placeholderTextColor="#bbb" />
              <Text style={cm.label}>Clinical Notes</Text>
              <TextInput style={[cm.input, { minHeight: 80 }]} value={form.notes} onChangeText={v => setField('notes', v)}
                placeholder="Observations, treatment plan, lifestyle advice…" placeholderTextColor="#bbb"
                multiline numberOfLines={4} textAlignVertical="top" />
              <Text style={cm.label}>Next Visit Date</Text>
              <TextInput style={cm.input} value={form.next_visit_date} onChangeText={v => setField('next_visit_date', v)}
                placeholder="YYYY-MM-DD (optional)" placeholderTextColor="#bbb" />
              <TouchableOpacity style={[cm.saveBtn, saving && cm.saveBtnDisabled]} onPress={save} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={cm.saveBtnText}>Save &amp; Attach Results →</Text>}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={cm.attachInfo}>
                <Text style={cm.attachInfoText}>
                  Consultation saved ✓{'\n'}Optionally attach lab reports, X-rays, or scans.
                </Text>
              </View>
              <Text style={cm.label}>Note for attachment (optional)</Text>
              <TextInput style={cm.input} value={attachNote} onChangeText={setAttachNote}
                placeholder="e.g. CBC report, Chest X-ray" placeholderTextColor="#bbb" />
              <View style={cm.attachButtons}>
                <TouchableOpacity style={cm.attachBtn} onPress={pickImage} disabled={uploading}>
                  <Ionicons name="image-outline" size={20} color="#166534" />
                  <Text style={cm.attachBtnText}>Photo / Scan</Text>
                </TouchableOpacity>
                <TouchableOpacity style={cm.attachBtn} onPress={pickDocument} disabled={uploading}>
                  <Ionicons name="document-outline" size={20} color="#166534" />
                  <Text style={cm.attachBtnText}>PDF / File</Text>
                </TouchableOpacity>
              </View>
              {uploading && (
                <View style={cm.uploadingRow}>
                  <ActivityIndicator size="small" color="#166534" />
                  <Text style={cm.uploadingText}>Uploading…</Text>
                </View>
              )}
              {attachments.length > 0 && (
                <View style={cm.attachList}>
                  <Text style={cm.attachListTitle}>Attached ({attachments.length})</Text>
                  {attachments.map(a => (
                    <View key={a.id} style={cm.attachItem}>
                      <Ionicons
                        name={a.file_type === 'application/pdf' ? 'document-text' : 'image'}
                        size={16} color="#6B7280"
                      />
                      <Text style={cm.attachItemText} numberOfLines={1}>{a.file_name}</Text>
                      {a.notes ? <Text style={cm.attachItemNote}>{a.notes}</Text> : null}
                    </View>
                  ))}
                </View>
              )}
              <TouchableOpacity style={cm.doneBtn} onPress={onClose}>
                <Text style={cm.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ── Main Screen ───────────────────────────────────────────────
export default function DoctorDashboardScreen() {
  const router = useRouter()
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null)
  const [todayApts, setTodayApts] = useState<Appointment[]>([])
  const [upcomingCount, setUpcomingCount] = useState(0)
  const [totalPatients, setTotalPatients] = useState(0)
  const [pendingRx, setPendingRx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [consultApt, setConsultApt] = useState<Appointment | null>(null)

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: doc } = await supabase
      .from('doctor')
      .select('id, first_name, last_name, ayush_specialization, verification_status')
      .eq('auth_user_id', user.id)
      .single()
    if (!doc) { setLoading(false); return }
    setDoctor(doc as DoctorProfile)
    if (doc.verification_status !== 'APPROVED') { setLoading(false); return }

    const today = new Date().toISOString().split('T')[0]
    const { data: apts } = await supabase
      .from('appointment')
      .select('id, appointment_date, start_time, end_time, status, type, patient:patient_id(id, first_name, last_name, mobile)')
      .eq('doctor_id', doc.id)
      .eq('appointment_date', today)
      .not('status', 'in', '("CANCELLED","NO_SHOW")')
      .order('start_time', { ascending: true })

    setTodayApts((apts ?? []).map(a => ({
      ...a,
      patient: Array.isArray(a.patient) ? a.patient[0] ?? null : a.patient,
    })) as Appointment[])

    const { count: upcoming } = await supabase
      .from('appointment').select('id', { count: 'exact', head: true })
      .eq('doctor_id', doc.id).gt('appointment_date', today)
      .not('status', 'in', '("CANCELLED","NO_SHOW")')
    setUpcomingCount(upcoming ?? 0)

    const { count: patients } = await supabase
      .from('appointment').select('patient_id', { count: 'exact', head: true })
      .eq('doctor_id', doc.id).eq('status', 'COMPLETED')
    setTotalPatients(patients ?? 0)

    const aptIds = (apts ?? []).map(a => a.id)
    if (aptIds.length > 0) {
      const { count: pending } = await supabase
        .from('prescription').select('id', { count: 'exact', head: true })
        .eq('verified_by_doctor', false).in('appointment_id', aptIds)
      setPendingRx(pending ?? 0)
    }

    setLoading(false); setRefreshing(false)
  }

  useFocusEffect(useCallback(() => { load() }, []))
  function onRefresh() { setRefreshing(true); load() }
  async function signOut() { await supabase.auth.signOut() }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#16A34A" />

  if (doctor && doctor.verification_status !== 'APPROVED') {
    return (
      <View style={s.center}>
        <Text style={s.pendingIcon}>⏳</Text>
        <Text style={s.pendingTitle}>Verification Pending</Text>
        <Text style={s.pendingText}>Your account is under review. You'll be notified once approved.</Text>
        <TouchableOpacity onPress={signOut} style={s.signOutBtn}>
          <Text style={s.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const activeApts    = todayApts.filter(a => ['BOOKED','CONFIRMED','ARRIVED','IN_PROGRESS'].includes(a.status))
  const completedApts = todayApts.filter(a => a.status === 'COMPLETED')

  return (
    <>
      <ScrollView
        style={s.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16A34A" />}
      >
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.greeting}>Good {greeting()}</Text>
            <Text style={s.doctorName}>Dr. {doctor?.first_name} {doctor?.last_name}</Text>
            <Text style={s.spec}>{SPEC[doctor?.ayush_specialization ?? ''] ?? doctor?.ayush_specialization}</Text>
          </View>
          <View style={s.headerActions}>
            <TouchableOpacity onPress={() => resolveAndOpenSupportWA()} style={s.headerBtn}>
              <Text style={s.headerBtnIcon}>💬</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={signOut} style={s.headerBtn}>
              <Ionicons name="log-out-outline" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={s.statsRow}>
          {[
            { label: "Today's Patients", value: todayApts.length,      color: '#EFF6FF', border: '#BFDBFE', text: '#1E40AF' },
            { label: 'Active Now',       value: activeApts.length,     color: '#FFF7ED', border: '#FED7AA', text: '#92400E' },
            { label: 'Completed Today',  value: completedApts.length,  color: '#ECFDF5', border: '#A7F3D0', text: '#065F46' },
            { label: 'Upcoming',         value: upcomingCount,          color: '#F5F3FF', border: '#DDD6FE', text: '#5B21B6' },
          ].map(stat => (
            <View key={stat.label} style={[s.statCard, { backgroundColor: stat.color, borderColor: stat.border }]}>
              <Text style={[s.statNum, { color: stat.text }]}>{stat.value}</Text>
              <Text style={[s.statLabel, { color: stat.text }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {pendingRx > 0 && (
          <TouchableOpacity style={s.rxBanner} onPress={() => router.push('/prescription-signoff')}>
            <View style={s.rxBannerRow}>
              <Text style={s.rxBannerText}>⚠️ {pendingRx} prescription{pendingRx > 1 ? 's' : ''} pending your sign-off</Text>
              <Text style={s.rxBannerCta}>Review →</Text>
            </View>
          </TouchableOpacity>
        )}

        <View style={s.section}>
          <Text style={s.sectionTitle}>Today's Queue</Text>
          <Text style={s.sectionDate}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
        </View>

        {todayApts.length === 0 ? (
          <View style={s.emptyBox}>
            <Text style={s.emptyIcon}>📅</Text>
            <Text style={s.emptyText}>No appointments today</Text>
          </View>
        ) : todayApts.map(apt => (
          <View key={apt.id} style={s.aptCard}>
            <View style={s.aptRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.aptName}>{apt.patient?.first_name} {apt.patient?.last_name}</Text>
                <Text style={s.aptTime}>{apt.start_time?.slice(0, 5)} – {apt.end_time?.slice(0, 5)}</Text>
                <Text style={s.aptType}>{apt.type === 'TELECONSULT' ? '💻 Teleconsult' : '🏥 In-person'}</Text>
              </View>
              <View style={[s.aptStatus, { backgroundColor: (STATUS_COLOR[apt.status] ?? '#9CA3AF') + '22' }]}>
                <Text style={[s.aptStatusText, { color: STATUS_COLOR[apt.status] ?? '#9CA3AF' }]}>
                  {apt.status.replace('_', ' ')}
                </Text>
              </View>
            </View>
            <View style={s.aptActions}>
              {['ARRIVED', 'IN_PROGRESS', 'COMPLETED'].includes(apt.status) && (
                <TouchableOpacity style={s.consultBtn} onPress={() => setConsultApt(apt)}>
                  <Ionicons name="document-text-outline" size={14} color="#fff" />
                  <Text style={s.consultBtnText}>
                    {apt.status === 'COMPLETED' ? 'Add Notes' : 'Start Consultation'}
                  </Text>
                </TouchableOpacity>
              )}
              {apt.patient?.mobile && (
                <TouchableOpacity style={s.waAptBtn} onPress={() => {
                  const { Linking } = require('react-native')
                  Linking.openURL(`https://wa.me/${apt.patient!.mobile.replace(/\D/g, '')}`)
                }}>
                  <Text style={s.waAptBtnText}>💬</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}

        <View style={s.section}><Text style={s.sectionTitle}>Quick Actions</Text></View>
        <View style={s.quickActions}>
          <TouchableOpacity style={s.quickBtn} onPress={() => router.push('/doctor-availability')}>
            <Text style={s.quickIcon}>🗓️</Text><Text style={s.quickLabel}>Availability</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.quickBtn} onPress={() => router.push('/consultation')}>
            <Text style={s.quickIcon}>🩺</Text><Text style={s.quickLabel}>Consultations</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.quickBtn} onPress={() => resolveAndOpenSupportWA()}>
            <Text style={s.quickIcon}>💬</Text><Text style={s.quickLabel}>Support</Text>
          </TouchableOpacity>
        </View>
        <View style={{ height: 48 }} />
      </ScrollView>

      {consultApt && doctor && (
        <ConsultationModal
          appointment={consultApt}
          doctorId={doctor.id}
          onClose={() => setConsultApt(null)}
          onSaved={load}
        />
      )}
    </>
  )
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#F9FAFB' },
  pendingIcon: { fontSize: 48, marginBottom: 12 },
  pendingTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 8 },
  pendingText: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  signOutBtn: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
  signOutText: { color: '#EF4444', fontWeight: '600' },
  header: { backgroundColor: '#166534', paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'flex-start' },
  greeting: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  doctorName: { color: '#fff', fontSize: 22, fontWeight: '700', marginTop: 2 },
  spec: { color: '#A7F3D0', fontSize: 13, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  headerBtn: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: 8 },
  headerBtnIcon: { fontSize: 18 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 10 },
  statCard: { width: '47%', borderRadius: 12, padding: 14, borderWidth: 1, alignItems: 'center' },
  statNum: { fontSize: 28, fontWeight: '800' },
  statLabel: { fontSize: 11, fontWeight: '600', marginTop: 2, textAlign: 'center' },
  rxBanner: { backgroundColor: '#FEF3C7', marginHorizontal: 16, marginBottom: 8, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#FDE68A' },
  rxBannerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rxBannerText: { fontSize: 13, color: '#92400E', fontWeight: '600', flex: 1 },
  rxBannerCta: { fontSize: 13, color: '#92400E', fontWeight: '700', marginLeft: 8 },
  section: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 6 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  sectionDate: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  emptyBox: { alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 36, marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#9CA3AF' },
  aptCard: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 10, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  aptRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  aptName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  aptTime: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  aptType: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  aptStatus: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  aptStatusText: { fontSize: 11, fontWeight: '600' },
  aptActions: { flexDirection: 'row', gap: 8 },
  consultBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#166534', borderRadius: 7, paddingHorizontal: 12, paddingVertical: 7, flex: 1 },
  consultBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  waAptBtn: { borderWidth: 1, borderColor: '#D1FAE5', borderRadius: 7, paddingHorizontal: 10, paddingVertical: 7, alignItems: 'center' },
  waAptBtnText: { fontSize: 16 },
  quickActions: { flexDirection: 'row', paddingHorizontal: 16, gap: 10 },
  quickBtn: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  quickIcon: { fontSize: 24, marginBottom: 6 },
  quickLabel: { fontSize: 12, fontWeight: '600', color: '#374151' },
})

const cm = StyleSheet.create({
  header: { backgroundColor: '#fff', paddingTop: 56, paddingBottom: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', flexDirection: 'row', alignItems: 'center', gap: 12 },
  closeBtn: { padding: 4 },
  title: { fontSize: 17, fontWeight: '700', color: '#111827' },
  sub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  savedBadge: { backgroundColor: '#DCFCE7', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  savedBadgeText: { color: '#166534', fontSize: 12, fontWeight: '600' },
  body: { flex: 1, padding: 20, backgroundColor: '#F9FAFB' },
  label: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 16 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, fontSize: 15, color: '#111827' },
  errorBox: { backgroundColor: '#FEE2E2', borderRadius: 8, padding: 12, marginBottom: 8 },
  errorText: { color: '#DC2626', fontSize: 13 },
  saveBtn: { backgroundColor: '#166534', borderRadius: 10, padding: 15, alignItems: 'center', marginTop: 24 },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  attachInfo: { backgroundColor: '#DCFCE7', borderRadius: 8, padding: 14, marginBottom: 4 },
  attachInfoText: { color: '#166534', fontSize: 13, lineHeight: 20 },
  attachButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  attachBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: '#166534', borderRadius: 10, paddingVertical: 14, backgroundColor: '#fff' },
  attachBtnText: { color: '#166534', fontWeight: '600', fontSize: 14 },
  uploadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  uploadingText: { color: '#6B7280', fontSize: 13 },
  attachList: { marginTop: 16, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', padding: 12 },
  attachListTitle: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8 },
  attachItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  attachItemText: { flex: 1, fontSize: 13, color: '#374151' },
  attachItemNote: { fontSize: 11, color: '#9CA3AF' },
  doneBtn: { backgroundColor: '#166534', borderRadius: 10, padding: 15, alignItems: 'center', marginTop: 24 },
  doneBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  familyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginTop: 16 },
  familyHeaderText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  familyBody: { backgroundColor: '#F9FAFB', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#E5E7EB', marginTop: 4, gap: 8 },
  familyEmpty: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingVertical: 8 },
  familyRow: { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  familyRelation: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 4 },
  conditionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 3 },
  condBadge: { backgroundColor: '#FEE2E2', borderRadius: 12, paddingHorizontal: 7, paddingVertical: 2 },
  condBadgeText: { fontSize: 11, color: '#DC2626' },
  allergyBadge: { backgroundColor: '#FEF9C3', borderRadius: 12, paddingHorizontal: 7, paddingVertical: 2 },
  allergyBadgeText: { fontSize: 11, color: '#854D0E' },
  familyNotes: { fontSize: 11, color: '#6B7280', marginTop: 2, fontStyle: 'italic' },
})
