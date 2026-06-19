import { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, Switch,
  TouchableOpacity, ActivityIndicator, Alert, TextInput,
} from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'

const DAYS = [
  { code: 'MON', label: 'Monday' },
  { code: 'TUE', label: 'Tuesday' },
  { code: 'WED', label: 'Wednesday' },
  { code: 'THU', label: 'Thursday' },
  { code: 'FRI', label: 'Friday' },
  { code: 'SAT', label: 'Saturday' },
  { code: 'SUN', label: 'Sunday' },
]

const SLOT_DURATIONS = [10, 15, 20, 30, 45, 60]

interface DaySchedule {
  day_of_week: string
  active: boolean
  start_time: string
  end_time: string
  slot_duration: number
}

function defaultSchedule(): DaySchedule[] {
  return DAYS.map(d => ({
    day_of_week: d.code,
    active: false,
    start_time: '09:00',
    end_time: '17:00',
    slot_duration: 20,
  }))
}

export default function DoctorAvailabilityScreen() {
  const router = useRouter()
  const [doctorId, setDoctorId] = useState<string | null>(null)
  const [schedule, setSchedule] = useState<DaySchedule[]>(defaultSchedule())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: doctor } = await supabase
      .from('doctor').select('id').eq('auth_user_id', user.id).single()
    if (!doctor) { setLoading(false); return }
    setDoctorId(doctor.id)

    const { data: existing } = await supabase
      .from('doctor_availability').select('*').eq('doctor_id', doctor.id)

    if (existing && existing.length > 0) {
      setSchedule(DAYS.map(d => {
        const found = existing.find(e => e.day_of_week === d.code)
        return found
          ? { day_of_week: d.code, active: found.active, start_time: found.start_time, end_time: found.end_time, slot_duration: found.slot_duration }
          : { day_of_week: d.code, active: false, start_time: '09:00', end_time: '17:00', slot_duration: 20 }
      }))
    }
    setLoading(false)
  }

  useFocusEffect(useCallback(() => { load() }, []))

  function toggleDay(code: string) {
    setSchedule(s => s.map(d => d.day_of_week === code ? { ...d, active: !d.active } : d))
  }

  function updateDay(code: string, field: keyof DaySchedule, value: string | number | boolean) {
    setSchedule(s => s.map(d => d.day_of_week === code ? { ...d, [field]: value } : d))
  }

  function cycleDuration(code: string) {
    const current = schedule.find(d => d.day_of_week === code)?.slot_duration ?? 20
    const idx = SLOT_DURATIONS.indexOf(current)
    const next = SLOT_DURATIONS[(idx + 1) % SLOT_DURATIONS.length]
    updateDay(code, 'slot_duration', next)
  }

  async function save() {
    if (!doctorId) return
    setSaving(true)
    const rows = schedule.map(d => ({ doctor_id: doctorId, ...d }))
    const { error } = await supabase
      .from('doctor_availability')
      .upsert(rows, { onConflict: 'doctor_id,day_of_week' })
    setSaving(false)
    if (error) {
      Alert.alert('Error', error.message)
    } else {
      Alert.alert('Saved ✓', 'Your availability has been updated. Patients can now book within these hours.', [
        { text: 'OK', onPress: () => router.back() },
      ])
    }
  }

  const activeDays = schedule.filter(d => d.active).length

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Set Availability</Text>
          <Text style={styles.headerSub}>{activeDays} day{activeDays !== 1 ? 's' : ''} active</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#1a6b3a" size="large" /></View>
      ) : (
        <>
          <ScrollView style={styles.body}>
            <Text style={styles.hint}>
              Toggle the days you're available. Patients can only book slots within these hours.
            </Text>

            {DAYS.map(day => {
              const d = schedule.find(s => s.day_of_week === day.code)!
              return (
                <View key={day.code} style={[styles.dayCard, !d.active && styles.dayCardOff]}>
                  {/* Day row */}
                  <View style={styles.dayRow}>
                    <Switch
                      value={d.active}
                      onValueChange={() => toggleDay(day.code)}
                      trackColor={{ false: '#ddd', true: '#a8d5b5' }}
                      thumbColor={d.active ? '#1a6b3a' : '#f4f3f4'}
                    />
                    <Text style={[styles.dayLabel, !d.active && styles.dayLabelOff]}>{day.label}</Text>
                    {!d.active && <Text style={styles.unavailableText}>Unavailable</Text>}
                  </View>

                  {/* Time + duration controls */}
                  {d.active && (
                    <View style={styles.timeRow}>
                      <View style={styles.timeBlock}>
                        <Text style={styles.timeLabel}>Start</Text>
                        <TextInput
                          style={styles.timeInput}
                          value={d.start_time}
                          onChangeText={v => updateDay(day.code, 'start_time', v)}
                          placeholder="09:00"
                          placeholderTextColor="#bbb"
                          keyboardType="numbers-and-punctuation"
                          maxLength={5}
                        />
                      </View>
                      <Text style={styles.timeSep}>→</Text>
                      <View style={styles.timeBlock}>
                        <Text style={styles.timeLabel}>End</Text>
                        <TextInput
                          style={styles.timeInput}
                          value={d.end_time}
                          onChangeText={v => updateDay(day.code, 'end_time', v)}
                          placeholder="17:00"
                          placeholderTextColor="#bbb"
                          keyboardType="numbers-and-punctuation"
                          maxLength={5}
                        />
                      </View>
                      <View style={styles.timeBlock}>
                        <Text style={styles.timeLabel}>Slot</Text>
                        <TouchableOpacity style={styles.durationPill} onPress={() => cycleDuration(day.code)}>
                          <Text style={styles.durationText}>{d.slot_duration} min</Text>
                          <Ionicons name="swap-vertical-outline" size={12} color="#1a6b3a" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              )
            })}

            <View style={{ height: 120 }} />
          </ScrollView>

          {/* Sticky save button */}
          <View style={styles.saveContainer}>
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={save} disabled={saving}
            >
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.saveBtnText}>Save Availability ✓</Text>}
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f7f4' },
  header: {
    backgroundColor: '#1a6b3a', paddingTop: 56, paddingBottom: 20,
    paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  headerSub: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, padding: 16 },
  hint: { fontSize: 13, color: '#666', marginBottom: 16, lineHeight: 18 },
  dayCard: {
    backgroundColor: '#fff', borderRadius: 14, borderWidth: 1,
    borderColor: '#d0e8da', marginBottom: 10, padding: 14,
  },
  dayCardOff: { opacity: 0.65 },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dayLabel: { fontSize: 15, fontWeight: '700', color: '#222', flex: 1 },
  dayLabelOff: { color: '#888' },
  unavailableText: { fontSize: 12, color: '#aaa' },
  timeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f0f7f4',
  },
  timeBlock: { alignItems: 'center', flex: 1 },
  timeLabel: { fontSize: 10, color: '#888', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 },
  timeInput: {
    backgroundColor: '#f7fbf9', borderWidth: 1, borderColor: '#d0e8da',
    borderRadius: 8, padding: 8, fontSize: 14, fontWeight: '600',
    color: '#1a6b3a', textAlign: 'center', width: '100%',
  },
  timeSep: { color: '#aaa', fontSize: 16, marginTop: 16 },
  durationPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#e8f5ee', borderRadius: 8, borderWidth: 1,
    borderColor: '#b5ddc7', paddingHorizontal: 10, paddingVertical: 8,
  },
  durationText: { fontSize: 13, fontWeight: '700', color: '#1a6b3a' },
  saveContainer: {
    padding: 16, backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#e0ede6',
  },
  saveBtn: { backgroundColor: '#1a6b3a', borderRadius: 12, padding: 16, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
})
