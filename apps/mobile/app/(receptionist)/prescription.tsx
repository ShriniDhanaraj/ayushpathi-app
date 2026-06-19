import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'

interface Medicine { name: string; dosage: string; frequency: string; duration: string; notes: string }

const EMPTY_MED: Medicine = { name: '', dosage: '', frequency: '', duration: '', notes: '' }

export default function PrescriptionScreen() {
  const router = useRouter()
  const { appointmentId, patientName } = useLocalSearchParams<{ appointmentId: string; patientName: string }>()

  const [medicines, setMedicines] = useState<Medicine[]>([{ ...EMPTY_MED }])
  const [chiefComplaint, setChiefComplaint] = useState('')
  const [diagnosis, setDiagnosis] = useState('')
  const [notes, setNotes] = useState('')
  const [instructions, setInstructions] = useState('')
  const [nextVisit, setNextVisit] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function addMed() { setMedicines(m => [...m, { ...EMPTY_MED }]) }
  function removeMed(i: number) { setMedicines(m => m.filter((_, idx) => idx !== i)) }
  function updateMed(i: number, field: keyof Medicine, value: string) {
    setMedicines(m => m.map((med, idx) => idx === i ? { ...med, [field]: value } : med))
  }

  async function handleSave() {
    const validMeds = medicines.filter(m => m.name.trim())
    if (!validMeds.length) { Alert.alert('Error', 'Add at least one medicine'); return }

    setSubmitting(true)
    const res = await fetch('https://rasbros.com/api/receptionist/prescription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appointment_id: appointmentId || null,
        chief_complaint: chiefComplaint,
        diagnosis, notes,
        next_visit_date: nextVisit || null,
        medicines: validMeds,
        instructions: instructions || null,
      }),
    })

    setSubmitting(false)
    if (!res.ok) {
      const json = await res.json()
      Alert.alert('Error', json.error ?? 'Failed to save')
      return
    }

    Alert.alert('Saved', 'Prescription saved successfully', [
      { text: 'OK', onPress: () => router.push('/(receptionist)/') }
    ])
  }

  return (
    <ScrollView style={s.container} keyboardShouldPersistTaps="handled">
      <Text style={s.title}>Enter Prescription</Text>
      {patientName && <Text style={s.subtitle}>Patient: {patientName}</Text>}

      <Text style={s.sectionHead}>Consultation Details</Text>
      <Text style={s.label}>Chief Complaint</Text>
      <TextInput value={chiefComplaint} onChangeText={setChiefComplaint}
        placeholder="e.g. Fever for 3 days" style={s.input} />

      <Text style={s.label}>Diagnosis</Text>
      <TextInput value={diagnosis} onChangeText={setDiagnosis}
        placeholder="e.g. Viral fever" style={s.input} />

      <Text style={s.label}>Doctor's Notes</Text>
      <TextInput value={notes} onChangeText={setNotes}
        multiline style={[s.input, { height: 70 }]} />

      <Text style={s.label}>Next Visit Date (YYYY-MM-DD)</Text>
      <TextInput value={nextVisit} onChangeText={setNextVisit}
        placeholder="YYYY-MM-DD" style={s.input} />

      <View style={s.sectionRow}>
        <Text style={s.sectionHead}>Medicines</Text>
        <TouchableOpacity onPress={addMed} style={s.addMedBtn}>
          <Text style={s.addMedText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {medicines.map((med, i) => (
        <View key={i} style={s.medCard}>
          <TextInput value={med.name} onChangeText={v => updateMed(i, 'name', v)}
            placeholder="Medicine name *" style={s.input} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput value={med.dosage} onChangeText={v => updateMed(i, 'dosage', v)}
              placeholder="Dosage" style={[s.input, { flex: 1 }]} />
            <TextInput value={med.frequency} onChangeText={v => updateMed(i, 'frequency', v)}
              placeholder="Frequency" style={[s.input, { flex: 1 }]} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput value={med.duration} onChangeText={v => updateMed(i, 'duration', v)}
              placeholder="Duration" style={[s.input, { flex: 1 }]} />
            <TextInput value={med.notes} onChangeText={v => updateMed(i, 'notes', v)}
              placeholder="Special notes" style={[s.input, { flex: 1 }]} />
          </View>
          {medicines.length > 1 && (
            <TouchableOpacity onPress={() => removeMed(i)}>
              <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 2 }}>Remove</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}

      <Text style={[s.label, { marginTop: 8 }]}>General Instructions</Text>
      <TextInput value={instructions} onChangeText={setInstructions}
        placeholder="e.g. Rest, avoid spicy food…" multiline style={[s.input, { height: 60 }]} />

      <TouchableOpacity onPress={handleSave} disabled={submitting}
        style={[s.btn, submitting && { opacity: 0.6 }]}>
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Save Prescription</Text>}
      </TouchableOpacity>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', padding: 16, paddingTop: 56 },
  title: { fontSize: 20, fontWeight: '700', color: '#166534', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#6B7280', marginBottom: 16 },
  sectionHead: { fontSize: 15, fontWeight: '700', color: '#111827', marginTop: 16, marginBottom: 8 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 8 },
  label: { fontSize: 13, color: '#374151', marginBottom: 4, fontWeight: '500' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 8 },
  medCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 12, marginBottom: 10 },
  addMedBtn: { borderWidth: 1, borderColor: '#16A34A', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  addMedText: { color: '#16A34A', fontSize: 13, fontWeight: '600' },
  btn: { backgroundColor: '#16A34A', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 24, marginBottom: 40 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})
