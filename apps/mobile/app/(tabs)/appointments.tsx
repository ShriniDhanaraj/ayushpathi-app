import { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native'
import { useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────
type BookingStep = 'list' | 'spec' | 'doctor' | 'slot' | 'confirm'

const SPECIALIZATIONS = [
  { code: 'AYU', label: 'Ayurveda', icon: '🌿' },
  { code: 'YOG', label: 'Yoga & Naturopathy', icon: '🧘' },
  { code: 'UNA', label: 'Unani', icon: '⚗️' },
  { code: 'SID', label: 'Siddha', icon: '🔬' },
  { code: 'HOM', label: 'Homeopathy', icon: '💊' },
]

interface Doctor {
  id: string
  first_name: string
  last_name: string
  ayush_specialization: string
  years_of_experience: number
  languages_spoken: string[]
  teleconsult_enabled: boolean
  teleconsult_fee: number
}

interface Slot {
  date: string
  start_time: string
  end_time: string
}

interface Appointment {
  id: string
  appointment_date: string
  start_time: string
  status: string
  doctor: { first_name: string; last_name: string; ayush_specialization: string } | null
}

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────
function specLabel(code: string) {
  return SPECIALIZATIONS.find(s => s.code === code)?.label ?? code
}

function generateSlots(
  avail: { start_time: string; end_time: string; slot_duration: number }[],
  date: string,
): Slot[] {
  const slots: Slot[] = []
  avail.forEach(a => {
    const [sh, sm] = a.start_time.split(':').map(Number)
    const [eh, em] = a.end_time.split(':').map(Number)
    let cur = sh * 60 + sm
    const end = eh * 60 + em
    while (cur + a.slot_duration <= end) {
      const hh = String(Math.floor(cur / 60)).padStart(2, '0')
      const mm = String(cur % 60).padStart(2, '0')
      const nh = String(Math.floor((cur + a.slot_duration) / 60)).padStart(2, '0')
      const nm = String((cur + a.slot_duration) % 60).padStart(2, '0')
      slots.push({ date, start_time: `${hh}:${mm}`, end_time: `${nh}:${nm}` })
      cur += a.slot_duration
    }
  })
  return slots
}

const STATUS_COLOR: Record<string, string> = {
  BOOKED: '#2980b9', SCHEDULED: '#2980b9',
  COMPLETED: '#27ae60', CANCELLED: '#e74c3c', PENDING: '#f39c12',
}

// ──────────────────────────────────────────────────────────────
// Screen
// ──────────────────────────────────────────────────────────────
export default function AppointmentsScreen() {
  // List state
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Booking flow state
  const [step, setStep] = useState<BookingStep>('list')
  const [spec, setSpec] = useState('')
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loadingDoctors, setLoadingDoctors] = useState(false)
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [slots, setSlots] = useState<Slot[]>([])
  const [bookedSlotTimes, setBookedSlotTimes] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [aptType, setAptType] = useState<'F2F' | 'TELECONSULT'>('F2F')
  const [booking, setBooking] = useState(false)

  // Date helpers
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split('T')[0]
  const maxDate = new Date(Date.now() + 30 * 864e5).toISOString().split('T')[0]

  // ── load appointments list ──
  async function loadAppointments() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('appointment')
      .select('id, appointment_date, start_time, status, doctor:doctor_id(first_name, last_name, ayush_specialization)')
      .eq('patient_auth_id', user.id)
      .order('appointment_date', { ascending: true })
    setAppointments((data ?? []) as unknown as Appointment[])
    setLoadingList(false)
  }

  useFocusEffect(useCallback(() => {
    loadAppointments()
    if (step !== 'list') resetBooking()
  }, []))

  async function onRefresh() {
    setRefreshing(true)
    await loadAppointments()
    setRefreshing(false)
  }

  // ── booking flow ──
  function resetBooking() {
    setStep('list')
    setSpec('')
    setDoctors([])
    setSelectedDoctor(null)
    setSelectedDate('')
    setSlots([])
    setBookedSlotTimes([])
    setSelectedSlot(null)
    setAptType('F2F')
  }

  async function searchDoctors() {
    if (!spec) return
    setLoadingDoctors(true)
    const { data } = await supabase
      .from('doctor')
      .select('id, first_name, last_name, ayush_specialization, years_of_experience, languages_spoken, teleconsult_enabled, teleconsult_fee')
      .eq('ayush_specialization', spec)
      .eq('verification_status', 'VERIFIED')
    setDoctors((data ?? []) as Doctor[])
    setLoadingDoctors(false)
    setStep('doctor')
  }

  async function loadSlots(doctorId: string, date: string) {
    if (!doctorId || !date) return
    setLoadingSlots(true)
    const dayCode = new Date(date).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase().slice(0, 3)
    const [{ data: avail }, { data: booked }] = await Promise.all([
      supabase
        .from('doctor_availability')
        .select('start_time, end_time, slot_duration')
        .eq('doctor_id', doctorId)
        .eq('day_of_week', dayCode)
        .eq('active', true),
      supabase
        .from('appointment')
        .select('start_time')
        .eq('doctor_id', doctorId)
        .eq('appointment_date', date)
        .neq('status', 'CANCELLED'),
    ])
    setBookedSlotTimes((booked ?? []).map(b => b.start_time))
    setSlots(generateSlots(avail ?? [], date))
    setLoadingSlots(false)
  }

  function selectDoctor(doc: Doctor) {
    setSelectedDoctor(doc)
    setSelectedSlot(null)
    setSlots([])
    setStep('slot')
  }

  function selectDate(date: string) {
    setSelectedDate(date)
    setSelectedSlot(null)
    if (selectedDoctor) loadSlots(selectedDoctor.id, date)
  }

  async function confirmBooking() {
    if (!selectedSlot || !selectedDoctor) return
    setBooking(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in')
      const { data: patient } = await supabase
        .from('patient').select('id').eq('auth_user_id', user.id).single()
      if (!patient) throw new Error('Patient profile not found')

      const { error } = await supabase.from('appointment').insert({
        patient_id: patient.id,
        patient_auth_id: user.id,
        doctor_id: selectedDoctor.id,
        appointment_date: selectedSlot.date,
        start_time: selectedSlot.start_time,
        end_time: selectedSlot.end_time,
        type: aptType,
        status: 'BOOKED',
        booked_by_role: 'PATIENT',
      })
      if (error) throw error

      Alert.alert('Booked! 🎉', `Your appointment with Dr. ${selectedDoctor.last_name} on ${selectedSlot.date} at ${selectedSlot.start_time} is confirmed.`,
        [{ text: 'OK', onPress: () => { resetBooking(); loadAppointments() } }])
    } catch (e: any) {
      Alert.alert('Booking failed', e.message ?? 'Please try again.')
    } finally {
      setBooking(false)
    }
  }

  // ──────────────────────────────────────────────────────────────
  // Render helpers
  // ──────────────────────────────────────────────────────────────
  function renderList() {
    const upcoming = appointments.filter(a => !['COMPLETED', 'CANCELLED'].includes(a.status))
    const past = appointments.filter(a => ['COMPLETED', 'CANCELLED'].includes(a.status))

    return (
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1a6b3a" />}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Appointments</Text>
          <TouchableOpacity style={styles.bookBtn} onPress={() => setStep('spec')}>
            <Ionicons name="add-circle-outline" size={18} color="#fff" />
            <Text style={styles.bookBtnText}>Book New</Text>
          </TouchableOpacity>
        </View>

        {loadingList ? (
          <ActivityIndicator color="#1a6b3a" style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.listBody}>
            <Text style={styles.sectionLabel}>Upcoming ({upcoming.length})</Text>
            {upcoming.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyIcon}>📅</Text>
                <Text style={styles.emptyMsg}>No upcoming appointments.</Text>
                <TouchableOpacity style={styles.emptyBookBtn} onPress={() => setStep('spec')}>
                  <Text style={styles.emptyBookBtnText}>Book an appointment</Text>
                </TouchableOpacity>
              </View>
            ) : (
              upcoming.map(a => <AptCard key={a.id} apt={a} />)
            )}

            {past.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Past ({past.length})</Text>
                {past.map(a => <AptCard key={a.id} apt={a} />)}
              </>
            )}
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    )
  }

  function renderSpecPicker() {
    return (
      <ScrollView style={styles.container}>
        <BookingHeader title="Choose Specialization" step={1} onBack={resetBooking} />
        <View style={styles.listBody}>
          <Text style={styles.hint}>Which AYUSH system do you want a consultation in?</Text>
          {SPECIALIZATIONS.map(s => (
            <TouchableOpacity
              key={s.code}
              style={[styles.specCard, spec === s.code && styles.specCardActive]}
              onPress={() => setSpec(s.code)}
            >
              <Text style={styles.specIcon}>{s.icon}</Text>
              <Text style={[styles.specLabel, spec === s.code && styles.specLabelActive]}>{s.label}</Text>
              {spec === s.code && <Ionicons name="checkmark-circle" size={22} color="#fff" />}
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.primaryBtn, !spec && styles.primaryBtnDisabled]}
            onPress={searchDoctors} disabled={!spec || loadingDoctors}
          >
            {loadingDoctors
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.primaryBtnText}>Find Doctors →</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    )
  }

  function renderDoctorPicker() {
    return (
      <ScrollView style={styles.container}>
        <BookingHeader title="Choose Doctor" step={2} onBack={() => setStep('spec')} />
        <View style={styles.listBody}>
          <Text style={styles.hint}>{doctors.length} verified {specLabel(spec)} doctor{doctors.length !== 1 ? 's' : ''} found</Text>
          {doctors.length === 0 && (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>👨‍⚕️</Text>
              <Text style={styles.emptyMsg}>No verified doctors available for this specialization yet.</Text>
            </View>
          )}
          {doctors.map(doc => (
            <TouchableOpacity key={doc.id} style={styles.doctorCard} onPress={() => selectDoctor(doc)}>
              <View style={styles.doctorInfo}>
                <Text style={styles.doctorName}>Dr. {doc.first_name} {doc.last_name}</Text>
                <Text style={styles.doctorMeta}>{specLabel(doc.ayush_specialization)} · {doc.years_of_experience} yrs exp</Text>
                <Text style={styles.doctorLang}>{(doc.languages_spoken ?? []).join(', ')}</Text>
              </View>
              <View style={styles.doctorRight}>
                {doc.teleconsult_enabled && (
                  <View style={styles.teleconsultBadge}>
                    <Text style={styles.teleconsultText}>💻 Teleconsult</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={18} color="#1a6b3a" />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    )
  }

  function renderSlotPicker() {
    if (!selectedDoctor) return null
    return (
      <ScrollView style={styles.container}>
        <BookingHeader title="Pick a Slot" step={3} onBack={() => { setStep('doctor'); setSelectedDate(''); setSlots([]) }} />
        <View style={styles.listBody}>
          <Text style={styles.doctorChosen}>Dr. {selectedDoctor.first_name} {selectedDoctor.last_name}</Text>
          <Text style={styles.hint}>Choose a date (next 30 days)</Text>

          {/* Date input — native date picker via text input */}
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={18} color="#1a6b3a" style={{ marginRight: 8 }} />
            <Text style={styles.dateLabel}>Date:</Text>
            <TouchableOpacity style={styles.dateBtnsRow}>
              {[0, 1, 2, 3, 4, 5, 6].map(offset => {
                const d = new Date(); d.setDate(d.getDate() + 1 + offset)
                const dStr = d.toISOString().split('T')[0]
                const dayName = d.toLocaleDateString('en-IN', { weekday: 'short' })
                const dayNum = d.getDate()
                return (
                  <TouchableOpacity
                    key={dStr}
                    style={[styles.datePill, selectedDate === dStr && styles.datePillActive]}
                    onPress={() => selectDate(dStr)}
                  >
                    <Text style={[styles.datePillDay, selectedDate === dStr && styles.datePillTextActive]}>{dayName}</Text>
                    <Text style={[styles.datePillNum, selectedDate === dStr && styles.datePillTextActive]}>{dayNum}</Text>
                  </TouchableOpacity>
                )
              })}
            </TouchableOpacity>
          </View>

          {selectedDate && loadingSlots && (
            <ActivityIndicator color="#1a6b3a" style={{ marginTop: 20 }} />
          )}

          {selectedDate && !loadingSlots && slots.length === 0 && (
            <View style={styles.noSlotsBox}>
              <Text style={styles.noSlotsText}>No availability on this day. Try another date.</Text>
            </View>
          )}

          {slots.length > 0 && (
            <>
              <Text style={styles.slotSectionLabel}>Available slots</Text>
              <View style={styles.slotsGrid}>
                {slots.map(slot => {
                  const isBooked = bookedSlotTimes.includes(slot.start_time)
                  const isSelected = selectedSlot?.start_time === slot.start_time
                  return (
                    <TouchableOpacity
                      key={slot.start_time}
                      disabled={isBooked}
                      onPress={() => setSelectedSlot(slot)}
                      style={[
                        styles.slotPill,
                        isBooked && styles.slotPillBooked,
                        isSelected && styles.slotPillSelected,
                      ]}
                    >
                      <Text style={[
                        styles.slotPillText,
                        isBooked && styles.slotPillTextBooked,
                        isSelected && styles.slotPillTextSelected,
                      ]}>{slot.start_time}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>

              {selectedDoctor.teleconsult_enabled && selectedSlot && (
                <View style={styles.typeRow}>
                  <Text style={styles.slotSectionLabel}>Appointment type</Text>
                  <View style={styles.typeButtons}>
                    {(['F2F', 'TELECONSULT'] as const).map(t => (
                      <TouchableOpacity
                        key={t}
                        style={[styles.typeBtn, aptType === t && styles.typeBtnActive]}
                        onPress={() => setAptType(t)}
                      >
                        <Text style={[styles.typeBtnText, aptType === t && styles.typeBtnTextActive]}>
                          {t === 'F2F' ? '🏥 In-person' : `💻 Teleconsult${selectedDoctor.teleconsult_fee > 0 ? ` ₹${selectedDoctor.teleconsult_fee}` : ''}`}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {selectedSlot && (
                <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep('confirm')}>
                  <Text style={styles.primaryBtnText}>Review & Confirm →</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </ScrollView>
    )
  }

  function renderConfirm() {
    if (!selectedDoctor || !selectedSlot) return null
    const dateLabel = new Date(selectedSlot.date).toLocaleDateString('en-IN', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })
    return (
      <ScrollView style={styles.container}>
        <BookingHeader title="Confirm Appointment" step={4} onBack={() => setStep('slot')} />
        <View style={styles.listBody}>
          <View style={styles.confirmCard}>
            <ConfirmRow label="Doctor" value={`Dr. ${selectedDoctor.first_name} ${selectedDoctor.last_name}`} />
            <ConfirmRow label="Specialization" value={specLabel(selectedDoctor.ayush_specialization)} />
            <ConfirmRow label="Date" value={dateLabel} />
            <ConfirmRow label="Time" value={`${selectedSlot.start_time} – ${selectedSlot.end_time}`} />
            <ConfirmRow label="Type" value={aptType === 'F2F' ? 'In-person' : 'Teleconsultation'} last />
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, booking && styles.primaryBtnDisabled]}
            onPress={confirmBooking} disabled={booking}
          >
            {booking
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.primaryBtnText}>Confirm Booking ✓</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep('slot')}>
            <Text style={styles.secondaryBtnText}>← Change slot</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    )
  }

  if (step === 'list') return renderList()
  if (step === 'spec') return renderSpecPicker()
  if (step === 'doctor') return renderDoctorPicker()
  if (step === 'slot') return renderSlotPicker()
  if (step === 'confirm') return renderConfirm()
  return null
}

// ──────────────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────────────
function AptCard({ apt }: { apt: Appointment }) {
  const color = STATUS_COLOR[apt.status] ?? '#999'
  return (
    <View style={styles.aptCard}>
      <View style={styles.aptHeader}>
        <Text style={styles.aptDoctor}>
          Dr. {apt.doctor?.first_name} {apt.doctor?.last_name}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: color }]}>
          <Text style={styles.statusText}>{apt.status}</Text>
        </View>
      </View>
      <Text style={styles.aptSpec}>{specLabel(apt.doctor?.ayush_specialization ?? '')}</Text>
      <Text style={styles.aptDate}>{apt.appointment_date} · {apt.start_time}</Text>
    </View>
  )
}

function BookingHeader({ title, step, onBack }: { title: string; step: number; onBack: () => void }) {
  return (
    <View style={styles.bookingHeader}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={20} color="#fff" />
      </TouchableOpacity>
      <View>
        <Text style={styles.bookingTitle}>{title}</Text>
        <Text style={styles.bookingStep}>Step {step} of 4</Text>
      </View>
    </View>
  )
}

function ConfirmRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.confirmRow, !last && styles.confirmRowBorder]}>
      <Text style={styles.confirmLabel}>{label}</Text>
      <Text style={styles.confirmValue}>{value}</Text>
    </View>
  )
}

// ──────────────────────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f7f4' },
  header: {
    backgroundColor: '#1a6b3a', padding: 24, paddingTop: 56,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '700' },
  bookBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  bookBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  listBody: { padding: 16 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },
  emptyBox: { alignItems: 'center', paddingVertical: 36 },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyMsg: { fontSize: 15, color: '#666', textAlign: 'center' },
  emptyBookBtn: { marginTop: 14, backgroundColor: '#1a6b3a', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
  emptyBookBtnText: { color: '#fff', fontWeight: '600' },
  aptCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: '#d0e8da',
  },
  aptHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  aptDoctor: { fontSize: 15, fontWeight: '700', color: '#1a6b3a' },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  aptSpec: { fontSize: 13, color: '#555', marginBottom: 2 },
  aptDate: { fontSize: 12, color: '#888' },
  bookingHeader: {
    backgroundColor: '#1a6b3a', paddingTop: 56, paddingBottom: 20,
    paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  backBtn: { padding: 4 },
  bookingTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  bookingStep: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  hint: { fontSize: 14, color: '#666', marginBottom: 16, lineHeight: 20 },
  specCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: '#d0e8da', marginBottom: 10,
  },
  specCardActive: { backgroundColor: '#1a6b3a', borderColor: '#1a6b3a' },
  specIcon: { fontSize: 24 },
  specLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: '#333' },
  specLabelActive: { color: '#fff' },
  doctorCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: '#d0e8da', marginBottom: 10,
    flexDirection: 'row', alignItems: 'center',
  },
  doctorInfo: { flex: 1 },
  doctorName: { fontSize: 15, fontWeight: '700', color: '#1a6b3a' },
  doctorMeta: { fontSize: 13, color: '#555', marginTop: 2 },
  doctorLang: { fontSize: 12, color: '#888', marginTop: 2 },
  doctorRight: { alignItems: 'flex-end', gap: 6 },
  teleconsultBadge: { backgroundColor: '#e8f0fe', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  teleconsultText: { fontSize: 11, color: '#1a56db' },
  doctorChosen: { fontSize: 16, fontWeight: '700', color: '#1a6b3a', marginBottom: 4 },
  dateRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' },
  dateLabel: { fontSize: 13, fontWeight: '600', color: '#555', marginRight: 8 },
  dateBtnsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  datePill: {
    alignItems: 'center', backgroundColor: '#fff', borderRadius: 10,
    borderWidth: 1, borderColor: '#d0e8da', paddingVertical: 8, paddingHorizontal: 12, minWidth: 44,
  },
  datePillActive: { backgroundColor: '#1a6b3a', borderColor: '#1a6b3a' },
  datePillDay: { fontSize: 10, color: '#888' },
  datePillNum: { fontSize: 16, fontWeight: '700', color: '#333' },
  datePillTextActive: { color: '#fff' },
  noSlotsBox: { backgroundColor: '#fff3cd', borderRadius: 8, padding: 14, marginTop: 8 },
  noSlotsText: { fontSize: 13, color: '#856404' },
  slotSectionLabel: { fontSize: 13, fontWeight: '700', color: '#555', marginTop: 16, marginBottom: 10 },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slotPill: {
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 8, borderWidth: 1, borderColor: '#d0e8da', backgroundColor: '#fff',
  },
  slotPillBooked: { backgroundColor: '#f5f5f5', borderColor: '#e0e0e0' },
  slotPillSelected: { backgroundColor: '#1a6b3a', borderColor: '#1a6b3a' },
  slotPillText: { fontSize: 13, fontWeight: '600', color: '#333' },
  slotPillTextBooked: { color: '#bbb' },
  slotPillTextSelected: { color: '#fff' },
  typeRow: { marginTop: 4 },
  typeButtons: { flexDirection: 'row', gap: 10 },
  typeBtn: {
    flex: 1, borderWidth: 1, borderColor: '#d0e8da', borderRadius: 8,
    padding: 12, alignItems: 'center',
  },
  typeBtnActive: { backgroundColor: '#1a6b3a', borderColor: '#1a6b3a' },
  typeBtnText: { fontSize: 13, fontWeight: '600', color: '#555' },
  typeBtnTextActive: { color: '#fff' },
  primaryBtn: {
    backgroundColor: '#1a6b3a', borderRadius: 10, padding: 15,
    alignItems: 'center', marginTop: 20,
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondaryBtn: { borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 10 },
  secondaryBtnText: { color: '#1a6b3a', fontWeight: '600', fontSize: 15 },
  confirmCard: {
    backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: '#d0e8da', marginBottom: 8,
  },
  confirmRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  confirmRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f0f7f4' },
  confirmLabel: { fontSize: 13, color: '#888' },
  confirmValue: { fontSize: 14, fontWeight: '600', color: '#1a6b3a', flex: 1, textAlign: 'right', flexShrink: 1 },
})
