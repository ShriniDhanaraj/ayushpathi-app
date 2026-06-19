import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator, Image,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '../../lib/supabase'

interface Medicine { name: string; dosage: string; frequency: string; duration: string; notes: string }

const EMPTY_MED: Medicine = { name: '', dosage: '', frequency: '', duration: '', notes: '' }
const BASE_URL = 'https://rasbros.com'

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? ''
}

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
  const [entryMethod, setEntryMethod] = useState<'RECEPTIONIST' | 'SCANNED'>('RECEPTIONIST')

  // OCR state
  const [scanning, setScanning] = useState(false)
  const [scannedImageUri, setScannedImageUri] = useState<string | null>(null)
  const [rawOcrText, setRawOcrText] = useState<string | null>(null)

  // ── Medicine helpers ───────────────────────────────────────
  function addMed() { setMedicines(m => [...m, { ...EMPTY_MED }]) }
  function removeMed(i: number) { setMedicines(m => m.filter((_, idx) => idx !== i)) }
  function updateMed(i: number, field: keyof Medicine, value: string) {
    setMedicines(m => m.map((med, idx) => idx === i ? { ...med, [field]: value } : med))
  }

  // ── OCR / Scan ─────────────────────────────────────────────
  async function scanPrescription() {
    // Request camera permission
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Camera Permission', 'Camera access is needed to scan prescriptions. Enable it in Settings.')
      return
    }

    Alert.alert('Scan Prescription', 'Choose image source', [
      {
        text: '📷 Camera',
        onPress: () => captureImage('camera'),
      },
      {
        text: '🖼️ Photo Library',
        onPress: () => captureImage('library'),
      },
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  async function captureImage(source: 'camera' | 'library') {
    let result
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      quality: 0.85,
      base64: true,
      allowsEditing: true,
      aspect: [3, 4],
    }

    if (source === 'camera') {
      result = await ImagePicker.launchCameraAsync(options)
    } else {
      result = await ImagePicker.launchImageLibraryAsync(options)
    }

    if (result.canceled || !result.assets?.[0]) return

    const asset = result.assets[0]
    setScannedImageUri(asset.uri)
    setScanning(true)

    try {
      const token = await getToken()
      const res = await fetch(`${BASE_URL}/api/receptionist/prescription/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          image_base64: asset.base64,
          mime_type: asset.mimeType ?? 'image/jpeg',
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        Alert.alert('Scan Failed', json.error ?? 'Could not process prescription image.')
        setScanning(false)
        return
      }

      if (json.warning) {
        Alert.alert('Poor Image Quality', json.warning)
        setScanning(false)
        return
      }

      setRawOcrText(json.raw_text ?? null)
      setEntryMethod('SCANNED')

      if (json.medicines?.length > 0) {
        // Replace current (empty) medicines with scanned ones, keep manual additions
        const hasRealMeds = medicines.some(m => m.name.trim())
        if (hasRealMeds) {
          Alert.alert(
            'Medicines Detected',
            `${json.medicines.length} medicine(s) found. Replace current list?`,
            [
              { text: 'Replace', onPress: () => setMedicines(json.medicines) },
              { text: 'Append', onPress: () => setMedicines(prev => [...prev.filter(m => m.name.trim()), ...json.medicines]) },
              { text: 'Cancel', style: 'cancel' },
            ]
          )
        } else {
          setMedicines(json.medicines)
        }
      } else {
        Alert.alert('No Medicines Detected', 'The scan couldn\'t extract medicines automatically. Please fill in the fields manually.')
      }
    } catch {
      Alert.alert('Error', 'Network error. Please try again.')
    } finally {
      setScanning(false)
    }
  }

  // ── Save ───────────────────────────────────────────────────
  async function handleSave() {
    const validMeds = medicines.filter(m => m.name.trim())
    if (!validMeds.length) { Alert.alert('Error', 'Add at least one medicine'); return }

    setSubmitting(true)
    try {
      const token = await getToken()
      const res = await fetch(`${BASE_URL}/api/receptionist/prescription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          appointment_id: appointmentId || null,
          chief_complaint: chiefComplaint,
          diagnosis,
          notes,
          next_visit_date: nextVisit || null,
          medicines: validMeds,
          instructions: instructions || null,
          entry_method: entryMethod,
        }),
      })

      if (!res.ok) {
        const json = await res.json()
        Alert.alert('Error', json.error ?? 'Failed to save')
        return
      }

      Alert.alert('Saved ✓', 'Prescription saved successfully', [
        { text: 'OK', onPress: () => router.push('/(receptionist)/') },
      ])
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ScrollView style={s.container} keyboardShouldPersistTaps="handled">
      {/* Header */}
      <View style={s.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Enter Prescription</Text>
          {patientName && <Text style={s.subtitle}>Patient: {patientName}</Text>}
        </View>
        {entryMethod === 'SCANNED' && (
          <View style={s.scannedBadge}>
            <Text style={s.scannedBadgeText}>📷 Scanned</Text>
          </View>
        )}
      </View>

      {/* Scan button */}
      <TouchableOpacity
        style={[s.scanBtn, scanning && s.scanBtnDisabled]}
        onPress={scanPrescription}
        disabled={scanning}
      >
        {scanning ? (
          <><ActivityIndicator color="#fff" size="small" /><Text style={s.scanBtnText}> Reading prescription…</Text></>
        ) : (
          <Text style={s.scanBtnText}>📷 Scan Prescription (OCR)</Text>
        )}
      </TouchableOpacity>

      {/* Scanned image preview */}
      {scannedImageUri && (
        <View style={s.imagePreviewBox}>
          <Image source={{ uri: scannedImageUri }} style={s.imagePreview} resizeMode="contain" />
          {rawOcrText && (
            <TouchableOpacity onPress={() => Alert.alert('Extracted Text', rawOcrText)} style={s.viewOcrBtn}>
              <Text style={s.viewOcrText}>View raw OCR text</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={s.divider}>
        <View style={s.dividerLine} />
        <Text style={s.dividerText}>or enter manually</Text>
        <View style={s.dividerLine} />
      </View>

      {/* Consultation Details */}
      <Text style={s.sectionHead}>Consultation Details</Text>
      <Text style={s.label}>Chief Complaint</Text>
      <TextInput value={chiefComplaint} onChangeText={setChiefComplaint}
        placeholder="e.g. Fever for 3 days" style={s.input} placeholderTextColor="#bbb" />

      <Text style={s.label}>Diagnosis</Text>
      <TextInput value={diagnosis} onChangeText={setDiagnosis}
        placeholder="e.g. Viral fever" style={s.input} placeholderTextColor="#bbb" />

      <Text style={s.label}>Doctor's Notes</Text>
      <TextInput value={notes} onChangeText={setNotes} placeholderTextColor="#bbb"
        multiline style={[s.input, { height: 70 }]} placeholder="Clinical observations…" />

      <Text style={s.label}>Next Visit Date (YYYY-MM-DD)</Text>
      <TextInput value={nextVisit} onChangeText={setNextVisit}
        placeholder="YYYY-MM-DD" style={s.input} placeholderTextColor="#bbb" />

      {/* Medicines */}
      <View style={s.sectionRow}>
        <Text style={s.sectionHead}>Medicines</Text>
        <TouchableOpacity onPress={addMed} style={s.addMedBtn}>
          <Text style={s.addMedText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {medicines.map((med, i) => (
        <View key={i} style={s.medCard}>
          <View style={s.medCardHeader}>
            <Text style={s.medCardNum}>Medicine {i + 1}</Text>
            {medicines.length > 1 && (
              <TouchableOpacity onPress={() => removeMed(i)}>
                <Text style={{ color: '#EF4444', fontSize: 12 }}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>
          <TextInput value={med.name} onChangeText={v => updateMed(i, 'name', v)}
            placeholder="Medicine name *" style={s.input} placeholderTextColor="#bbb" />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput value={med.dosage} onChangeText={v => updateMed(i, 'dosage', v)}
              placeholder="Dosage (e.g. 500mg)" style={[s.input, { flex: 1 }]} placeholderTextColor="#bbb" />
            <TextInput value={med.frequency} onChangeText={v => updateMed(i, 'frequency', v)}
              placeholder="Frequency" style={[s.input, { flex: 1 }]} placeholderTextColor="#bbb" />
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput value={med.duration} onChangeText={v => updateMed(i, 'duration', v)}
              placeholder="Duration (e.g. 5 days)" style={[s.input, { flex: 1 }]} placeholderTextColor="#bbb" />
            <TextInput value={med.notes} onChangeText={v => updateMed(i, 'notes', v)}
              placeholder="Special notes" style={[s.input, { flex: 1 }]} placeholderTextColor="#bbb" />
          </View>
        </View>
      ))}

      <Text style={[s.label, { marginTop: 8 }]}>General Instructions</Text>
      <TextInput value={instructions} onChangeText={setInstructions} placeholderTextColor="#bbb"
        placeholder="e.g. Rest, avoid spicy food…" multiline style={[s.input, { height: 60 }]} />

      <TouchableOpacity onPress={handleSave} disabled={submitting}
        style={[s.btn, submitting && s.btnDisabled]}>
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Save Prescription ✓</Text>}
      </TouchableOpacity>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', padding: 16, paddingTop: 56 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700', color: '#166534' },
  subtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  scannedBadge: { backgroundColor: '#ECFDF5', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#A7F3D0' },
  scannedBadgeText: { fontSize: 11, color: '#065F46', fontWeight: '700' },
  scanBtn: { backgroundColor: '#4F46E5', borderRadius: 10, paddingVertical: 13, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  scanBtnDisabled: { opacity: 0.6 },
  scanBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  imagePreviewBox: { marginBottom: 12, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#D1D5DB' },
  imagePreview: { width: '100%', height: 180 },
  viewOcrBtn: { backgroundColor: '#F3F4F6', padding: 8, alignItems: 'center' },
  viewOcrText: { fontSize: 12, color: '#4F46E5', fontWeight: '600' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },
  sectionHead: { fontSize: 15, fontWeight: '700', color: '#111827', marginTop: 8, marginBottom: 8 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 8 },
  label: { fontSize: 13, color: '#374151', marginBottom: 4, fontWeight: '500' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 8, color: '#111827' },
  medCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 12, marginBottom: 10 },
  medCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  medCardNum: { fontSize: 12, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase' },
  addMedBtn: { borderWidth: 1, borderColor: '#16A34A', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  addMedText: { color: '#16A34A', fontSize: 13, fontWeight: '600' },
  btn: { backgroundColor: '#16A34A', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 24, marginBottom: 40 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})
