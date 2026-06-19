import React, { useState, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, Switch, ActivityIndicator
} from 'react-native'
import { useRouter } from 'expo-router'

interface Patient { id: string; first_name: string; last_name: string; mobile: string }
interface Doctor { id: string; first_name: string; last_name: string; ayush_specialization: string }

export default function BookAppointmentScreen() {
  const router = useRouter()
  const [patientSearch, setPatientSearch] = useState('')
  const [doctorSearch, setDoctorSearch] = useState('')
  const [patients, setPatients] = useState<Patient[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [isWalkIn, setIsWalkIn] = useState(false)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!patientSearch || patientSearch.length < 2) { setPatients([]); return }
    const t = setTimeout(async () => {
      const res = await fetch(`https://rasbros.com/api/profile/patient?search=${encodeURIComponent(patientSearch)}`)
      const json = await res.json()
      setPatients(json.patients ?? [])
    }, 300)
    return () => clearTimeout(t)
  }, [patientSearch])

  useEffect(() => {
    if (!doctorSearch || doctorSearch.length < 2) { setDoctors([]); return }
    const t = setTimeout(async () => {
      const res = await fetch(`https://rasbros.com/api/doctors?search=${encodeURIComponent(doctorSearch)}`)
      const json = await res.json()
      setDoctors(json.doctors ?? [])
    }, 300)
    return () => clearTimeout(t)
  }, [doctorSearch])

  async function handleBook() {
    if (!selectedPatient || !selectedDoctor || !date || !startTime || !endTime) {
      Alert.alert('Missing fields', 'Please fill all required fields')
      return
    }
    setSubmitting(true)

    const res = await fetch('https://rasbros.com/api/receptionist/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patient_id: selectedPatient.id,
        doctor_id: selectedDoctor.id,
        appointment_date: date,
        start_time: startTime,
        end_time: endTime,
        is_walk_in: isWalkIn,
        notes: notes || null,
        booked_by_role: 'RECEPTIONIST',
      }),
    })

    setSubmitting(false)
    if (!res.ok) {
      const json = await res.json()
      Alert.alert('Error', json.error ?? 'Failed to book')
      return
    }

    Alert.alert('Booked', 'Appointment booked successfully', [
      { text: 'OK', onPress: () => router.push('/(receptionist)/') }
    ])
  }

  return (
    <ScrollView style={s.container} keyboardShouldPersistTaps="handled">
      <Text style={s.title}>Book Appointment</Text>

      {/* Walk-in toggle */}
      <View style={s.row}>
        <Text style={s.label}>Walk-in patient</Text>
        <Switch value={isWalkIn} onValueChange={setIsWalkIn} trackColor={{ true: '#16A34A' }} />
      </View>

      {/* Patient search */}
      <Text style={s.label}>Patient *</Text>
      {selectedPatient ? (
        <View style={s.selectedBox}>
          <Text style={s.selectedText}>{selectedPatient.first_name} {selectedPatient.last_name} · {selectedPatient.mobile}</Text>
          <TouchableOpacity onPress={() => setSelectedPatient(null)}><Text style={s.changeText}>Change</Text></TouchableOpacity>
        </View>
      ) : (
        <>
          <TextInput value={patientSearch} onChangeText={setPatientSearch}
            placeholder="Search patient name or mobile…" style={s.input} />
          {patients.map(p => (
            <TouchableOpacity key={p.id} onPress={() => { setSelectedPatient(p); setPatientSearch(''); setPatients([]) }} style={s.suggestion}>
              <Text style={s.suggestionText}>{p.first_name} {p.last_name} · {p.mobile}</Text>
            </TouchableOpacity>
          ))}
        </>
      )}

      {/* Doctor search */}
      <Text style={[s.label, { marginTop: 12 }]}>Doctor *</Text>
      {selectedDoctor ? (
        <View style={s.selectedBox}>
          <Text style={s.selectedText}>Dr. {selectedDoctor.first_name} {selectedDoctor.last_name} · {selectedDoctor.ayush_specialization}</Text>
          <TouchableOpacity onPress={() => setSelectedDoctor(null)}><Text style={s.changeText}>Change</Text></TouchableOpacity>
        </View>
      ) : (
        <>
          <TextInput value={doctorSearch} onChangeText={setDoctorSearch}
            placeholder="Search doctor…" style={s.input} />
          {doctors.map(d => (
            <TouchableOpacity key={d.id} onPress={() => { setSelectedDoctor(d); setDoctorSearch(''); setDoctors([]) }} style={s.suggestion}>
              <Text style={s.suggestionText}>Dr. {d.first_name} {d.last_name} · {d.ayush_specialization}</Text>
            </TouchableOpacity>
          ))}
        </>
      )}

      <Text style={[s.label, { marginTop: 12 }]}>Date *</Text>
      <TextInput value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" style={s.input} />

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={s.label}>Start Time *</Text>
          <TextInput value={startTime} onChangeText={setStartTime} placeholder="HH:MM" style={s.input} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.label}>End Time *</Text>
          <TextInput value={endTime} onChangeText={setEndTime} placeholder="HH:MM" style={s.input} />
        </View>
      </View>

      <Text style={[s.label, { marginTop: 12 }]}>Notes</Text>
      <TextInput value={notes} onChangeText={setNotes} placeholder="Optional notes…"
        style={[s.input, { height: 70 }]} multiline />

      <TouchableOpacity onPress={handleBook} disabled={submitting} style={[s.btn, submitting && { opacity: 0.6 }]}>
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Book Appointment</Text>}
      </TouchableOpacity>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', padding: 16, paddingTop: 56 },
  title: { fontSize: 20, fontWeight: '700', color: '#166534', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 4 },
  selectedBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0', borderRadius: 8, padding: 10, marginBottom: 4 },
  selectedText: { fontSize: 13, color: '#166534', flex: 1 },
  changeText: { fontSize: 12, color: '#EF4444', marginLeft: 8 },
  suggestion: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 6, padding: 10, marginBottom: 4 },
  suggestionText: { fontSize: 13, color: '#374151' },
  btn: { backgroundColor: '#16A34A', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 24, marginBottom: 40 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})
