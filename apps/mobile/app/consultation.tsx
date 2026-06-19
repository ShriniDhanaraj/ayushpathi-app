import { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native'
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'

const FREQUENCIES = ['Once daily', 'Twice daily', 'Three times daily', 'Before food', 'After food', 'At bedtime', 'As needed']

interface Medicine { name: string; dosage: string; frequency: string; duration: string; notes: string }
const EMPTY_MED: Medicine = { name: '', dosage: '', frequency: '', duration: '', notes: '' }

interface PatientProfile {
  first_name: string; last_name: string; date_of_birth: string | null; gender: string | null
  known_conditions: string[]; allergies: string[]; current_medications: { name: string; dosage: string }[]
}

export default function ConsultationScreen() {
  const { appointmentId } = useLocalSearchParams<{ appointmentId: string }>()
  const router = useRouter()

  const [patient, setPatient] = useState<PatientProfile | null>(null)
  const [patientId, setPatientId] = useState('')
  const [doctorId, setDoctorId] = useState('')
  const [hasConsent, setHasConsent] = useState(false)
  const [loading, setLoading] = useState(true)

  // Consultation fields
  const [chiefComplaint, setChiefComplaint] = useState('')
  const [symptoms, setSymptoms] = useState('')
  const [diagnosis, setDiagnosis] = useState('')
  const [notes, setNotes] = useState('')
  const [nextVisit, setNextVisit] = useState('')
  const [medicines, setMedicines] = useState<Medicine[]>([{ ...EMPTY_MED }])
  const [instructions, setInstructions] = useState('')
  const [isRepeat, setIsRepeat] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showPrescription, setShowPrescription] = useState(false)
  const [showPatientInfo, setShowPatientInfo] = useState(true)

  async function load() {
    if (!appointmentId) return
    const { data: appt } = await supabase
      .from('appointment')
      .select('patient_id, doctor_id')
      .eq('id', appointmentId).single()
    if (!appt) { setLoading(false); return }
    setPatientId(appt.patient_id)
    setDoctorId(appt.doctor_id)

    // Check consent
    const { data: consent } = await supabase
      .from('patient_doctor_consent')
      .select('status, share_full_history')
      .eq('patient_id', appt.patient_id)
      .eq('doctor_id', appt.doctor_id)
      .eq('status', 'ACTIVE')
      .maybeSingle()

    setHasConsent(!!consent)

    // Load patient info (basic always, health profile only if consent grants it)
    const fields = consent?.share_full_history
      ? 'first_name, last_name, date_of_birth, gender, known_conditions, allergies, current_medications'
      : 'first_name, last_name, date_of_birth, gender'

    const { data: pat } = await supabase
      .from('patient').select(fields).eq('id', appt.patient_id).single()
    if (pat) setPatient(pat as unknown as PatientProfile)

    setLoading(false)
  }

  useFocusEffect(useCallback(() => { load() }, [appointmentId]))

  function addMed() { setMedicines(ms => [...ms, { ...EMPTY_MED }]) }
  function removeMed(i: number) { setMedicines(ms => ms.filter((_, idx) => idx !== i)) }
  function updateMed(i: number, field: keyof Medicine, value: string) {
    setMedicines(ms => ms.map((m, idx) => idx === i ? { ...m, [field]: value } : m))
  }

  async function handleSave() {
    if (!chiefComplaint.trim()) { Alert.alert('Required', 'Please enter the chief complaint.'); return }
    setSaving(true)
    try {
      // 1. Insert consultation
      const { data: consult, error: consultErr } = await supabase.from('consultation').insert({
        appointment_id: appointmentId,
        patient_id: patientId,
        doctor_id: doctorId,
        chief_complaint: chiefComplaint.trim(),
        symptoms: symptoms.split(',').map(s => s.trim()).filter(Boolean),
        diagnosis: diagnosis.trim() || null,
        notes: notes.trim() || null,
        next_visit_date: nextVisit || null,
      }).select().single()
      if (consultErr) throw consultErr

      // 2. Insert prescription if medicines filled
      const validMeds = medicines.filter(m => m.name.trim())
      if (validMeds.length > 0) {
        const { error: presErr } = await supabase.from('prescription').insert({
          consultation_id: consult.id,
          patient_id: patientId,
          doctor_id: doctorId,
          medicines: validMeds,
          instructions: instructions.trim() || null,
          is_repeat: isRepeat,
        })
        if (presErr) throw presErr
      }

      // 3. Mark appointment COMPLETED
      await supabase.from('appointment').update({ status: 'COMPLETED' }).eq('id', appointmentId)

      Alert.alert('Consultation saved ✓', 'The consultation and prescription have been recorded.', [
        { text: 'Done', onPress: () => router.replace('/doctor-dashboard') },
      ])
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not save consultation.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#1a6b3a" size="large" /></View>
  }

  const age = patient?.date_of_birth
    ? Math.floor((Date.now() - new Date(patient.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Consultation</Text>
          {patient && <Text style={styles.headerSub}>{patient.first_name} {patient.last_name}{age ? `, ${age} yrs` : ''}</Text>}
        </View>
      </View>

      <ScrollView style={styles.body}>
        {/* No consent warning */}
        {!hasConsent && (
          <View style={styles.warningBanner}>
            <Ionicons name="warning-outline" size={16} color="#856404" />
            <Text style={styles.warningText}>No active consent from this patient. You can record consultation notes, but cannot view their health history.</Text>
          </View>
        )}

        {/* Patient info (collapsible) */}
        {patient && (
          <TouchableOpacity style={styles.sectionCard} onPress={() => setShowPatientInfo(p => !p)} activeOpacity={0.8}>
            <View style={styles.sectionCardHeader}>
              <Text style={styles.sectionCardTitle}>👤 Patient Information</Text>
              <Ionicons name={showPatientInfo ? 'chevron-up' : 'chevron-down'} size={16} color="#888" />
            </View>
            {showPatientInfo && (
              <View style={styles.patientGrid}>
                <InfoChip label="Name" value={`${patient.first_name} ${patient.last_name}`} />
                {age && <InfoChip label="Age" value={`${age} yrs`} />}
                {patient.gender && <InfoChip label="Gender" value={patient.gender} />}
                {hasConsent && (patient.known_conditions?.length ?? 0) > 0 && (
                  <View style={styles.fullWidth}>
                    <Text style={styles.chipLabel}>Known Conditions</Text>
                    <View style={styles.tagRow}>
                      {patient.known_conditions.map((c, i) => (
                        <View key={i} style={styles.redTag}><Text style={styles.redTagText}>{c}</Text></View>
                      ))}
                    </View>
                  </View>
                )}
                {hasConsent && (patient.allergies?.length ?? 0) > 0 && (
                  <View style={styles.fullWidth}>
                    <Text style={styles.chipLabel}>Allergies</Text>
                    <View style={styles.tagRow}>
                      {patient.allergies.map((a, i) => (
                        <View key={i} style={styles.amberTag}><Text style={styles.amberTagText}>{a}</Text></View>
                      ))}
                    </View>
                  </View>
                )}
                {hasConsent && (patient.current_medications?.length ?? 0) > 0 && (
                  <View style={styles.fullWidth}>
                    <Text style={styles.chipLabel}>Current Medications</Text>
                    {patient.current_medications.map((m, i) => (
                      <Text key={i} style={styles.medText}>• {m.name} — {m.dosage}</Text>
                    ))}
                  </View>
                )}
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* Consultation notes */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>📋 Consultation Notes</Text>

          <Field label="Chief Complaint *" required>
            <TextInput style={styles.input} placeholder="What brings the patient in today?"
              placeholderTextColor="#bbb" value={chiefComplaint} onChangeText={setChiefComplaint} />
          </Field>

          <Field label="Symptoms (comma-separated)">
            <TextInput style={styles.input} placeholder="e.g. headache, fatigue, joint pain"
              placeholderTextColor="#bbb" value={symptoms} onChangeText={setSymptoms} />
          </Field>

          <Field label="Diagnosis">
            <TextInput style={[styles.input, styles.multiline]} placeholder="Clinical assessment and diagnosis"
              placeholderTextColor="#bbb" value={diagnosis} onChangeText={setDiagnosis}
              multiline numberOfLines={3} textAlignVertical="top" />
          </Field>

          <Field label="Notes">
            <TextInput style={[styles.input, styles.multiline]} placeholder="Observations, lifestyle advice..."
              placeholderTextColor="#bbb" value={notes} onChangeText={setNotes}
              multiline numberOfLines={3} textAlignVertical="top" />
          </Field>

          <Field label="Next Visit Date (optional)">
            <TextInput style={styles.input} placeholder="YYYY-MM-DD"
              placeholderTextColor="#bbb" value={nextVisit} onChangeText={setNextVisit} />
          </Field>
        </View>

        {/* Prescription */}
        <TouchableOpacity style={styles.sectionCard} onPress={() => setShowPrescription(p => !p)} activeOpacity={0.8}>
          <View style={styles.sectionCardHeader}>
            <Text style={styles.sectionCardTitle}>💊 Prescription</Text>
            <View style={styles.row}>
              {medicines.filter(m => m.name.trim()).length > 0 && (
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{medicines.filter(m => m.name.trim()).length}</Text>
                </View>
              )}
              <Ionicons name={showPrescription ? 'chevron-up' : 'chevron-down'} size={16} color="#888" />
            </View>
          </View>
        </TouchableOpacity>

        {showPrescription && (
          <View style={styles.prescriptionBody}>
            <View style={styles.repeatRow}>
              <TouchableOpacity
                style={[styles.repeatBtn, isRepeat && styles.repeatBtnActive]}
                onPress={() => setIsRepeat(p => !p)}
              >
                <Ionicons name={isRepeat ? 'checkbox' : 'square-outline'} size={16} color={isRepeat ? '#fff' : '#888'} />
                <Text style={[styles.repeatText, isRepeat && styles.repeatTextActive]}>Repeat prescription</Text>
              </TouchableOpacity>
            </View>

            {medicines.map((med, i) => (
              <View key={i} style={styles.medCard}>
                <View style={styles.medCardHeader}>
                  <Text style={styles.medCardTitle}>Medicine {i + 1}</Text>
                  {medicines.length > 1 && (
                    <TouchableOpacity onPress={() => removeMed(i)}>
                      <Ionicons name="trash-outline" size={16} color="#e74c3c" />
                    </TouchableOpacity>
                  )}
                </View>
                <TextInput style={styles.input} placeholder="Medicine name (e.g. Triphala Churnam)"
                  placeholderTextColor="#bbb" value={med.name} onChangeText={v => updateMed(i, 'name', v)} />
                <View style={styles.medRow}>
                  <TextInput style={[styles.input, styles.halfInput]} placeholder="Dosage (e.g. 5g)"
                    placeholderTextColor="#bbb" value={med.dosage} onChangeText={v => updateMed(i, 'dosage', v)} />
                  <TextInput style={[styles.input, styles.halfInput]} placeholder="Duration (e.g. 30 days)"
                    placeholderTextColor="#bbb" value={med.duration} onChangeText={v => updateMed(i, 'duration', v)} />
                </View>
                <Text style={styles.fieldLabel}>Frequency</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                  <View style={styles.freqRow}>
                    {FREQUENCIES.map(f => (
                      <TouchableOpacity key={f}
                        style={[styles.freqPill, med.frequency === f && styles.freqPillActive]}
                        onPress={() => updateMed(i, 'frequency', f)}>
                        <Text style={[styles.freqText, med.frequency === f && styles.freqTextActive]}>{f}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
                <TextInput style={styles.input} placeholder="Notes (e.g. Mix with warm water)"
                  placeholderTextColor="#bbb" value={med.notes} onChangeText={v => updateMed(i, 'notes', v)} />
              </View>
            ))}

            <TouchableOpacity style={styles.addMedBtn} onPress={addMed}>
              <Ionicons name="add-circle-outline" size={18} color="#1a6b3a" />
              <Text style={styles.addMedText}>Add another medicine</Text>
            </TouchableOpacity>

            <Field label="Patient Instructions">
              <TextInput style={[styles.input, styles.multiline]} placeholder="Diet, lifestyle, follow-up..."
                placeholderTextColor="#bbb" value={instructions} onChangeText={setInstructions}
                multiline numberOfLines={3} textAlignVertical="top" />
            </Field>
          </View>
        )}

        {/* Save button */}
        <View style={styles.saveSection}>
          <TouchableOpacity
            style={[styles.saveBtn, (!chiefComplaint || saving) && styles.saveBtnDisabled]}
            onPress={handleSave} disabled={!chiefComplaint || saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.saveBtnText}>Complete Consultation & Save ✓</Text>}
          </TouchableOpacity>
          <Text style={styles.dpdpNote}>Timestamped & audit-logged · DPDP Act 2023</Text>
        </View>

        <View style={{ height: 48 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.fieldLabel}>{label}{required ? '' : ''}</Text>
      {children}
    </View>
  )
}
function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoChip}>
      <Text style={styles.chipLabel}>{label}</Text>
      <Text style={styles.chipValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f7f4' },
  header: {
    backgroundColor: '#1a6b3a', paddingTop: 56, paddingBottom: 20,
    paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  headerSub: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 2 },
  body: { flex: 1, backgroundColor: '#f0f7f4' },
  warningBanner: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: '#fef9e7', margin: 16, borderRadius: 10,
    padding: 12, borderWidth: 1, borderColor: '#f0c040',
  },
  warningText: { fontSize: 13, color: '#856404', flex: 1, lineHeight: 18 },
  sectionCard: {
    backgroundColor: '#fff', marginHorizontal: 16, marginTop: 10,
    borderRadius: 14, borderWidth: 1, borderColor: '#d0e8da', overflow: 'hidden',
  },
  sectionCardHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14,
  },
  sectionCardTitle: { fontSize: 15, fontWeight: '700', color: '#222' },
  patientGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 14, paddingBottom: 14 },
  infoChip: { backgroundColor: '#f0f7f4', borderRadius: 8, padding: 10, minWidth: 80 },
  chipLabel: { fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 },
  chipValue: { fontSize: 14, fontWeight: '600', color: '#222' },
  fullWidth: { width: '100%' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  redTag: { backgroundColor: '#fde8e8', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  redTagText: { fontSize: 12, color: '#c0392b', fontWeight: '500' },
  amberTag: { backgroundColor: '#fef9e7', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  amberTagText: { fontSize: 12, color: '#856404', fontWeight: '500' },
  medText: { fontSize: 13, color: '#555', marginTop: 3 },
  formCard: {
    backgroundColor: '#fff', marginHorizontal: 16, marginTop: 10,
    borderRadius: 14, borderWidth: 1, borderColor: '#d0e8da', padding: 14,
  },
  formTitle: { fontSize: 15, fontWeight: '700', color: '#222', marginBottom: 14 },
  fieldLabel: { fontSize: 12, color: '#888', marginBottom: 4 },
  input: {
    backgroundColor: '#f7fbf9', borderWidth: 1, borderColor: '#d0e8da',
    borderRadius: 8, padding: 11, fontSize: 14, color: '#222',
  },
  multiline: { minHeight: 72, paddingTop: 10 },
  prescriptionBody: {
    backgroundColor: '#fff', marginHorizontal: 16, marginTop: 0,
    borderRadius: 14, borderWidth: 1, borderTopWidth: 0, borderColor: '#d0e8da',
    padding: 14, borderTopLeftRadius: 0, borderTopRightRadius: 0,
  },
  repeatRow: { marginBottom: 12 },
  repeatBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: '#d0e8da', borderRadius: 8, padding: 10, alignSelf: 'flex-start',
  },
  repeatBtnActive: { backgroundColor: '#1a6b3a', borderColor: '#1a6b3a' },
  repeatText: { fontSize: 13, color: '#555', fontWeight: '500' },
  repeatTextActive: { color: '#fff' },
  medCard: {
    backgroundColor: '#f7fbf9', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#d0e8da', marginBottom: 12,
  },
  medCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  medCardTitle: { fontSize: 13, fontWeight: '700', color: '#555' },
  medRow: { flexDirection: 'row', gap: 8 },
  halfInput: { flex: 1, marginBottom: 8 },
  freqRow: { flexDirection: 'row', gap: 6, paddingVertical: 4 },
  freqPill: {
    borderWidth: 1, borderColor: '#d0e8da', borderRadius: 16,
    paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#fff',
  },
  freqPillActive: { backgroundColor: '#1a6b3a', borderColor: '#1a6b3a' },
  freqText: { fontSize: 12, color: '#555', fontWeight: '500' },
  freqTextActive: { color: '#fff' },
  addMedBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#b5ddc7',
    borderRadius: 10, padding: 12, justifyContent: 'center', marginBottom: 12,
  },
  addMedText: { fontSize: 14, color: '#1a6b3a', fontWeight: '600' },
  saveSection: { margin: 16 },
  saveBtn: { backgroundColor: '#1a6b3a', borderRadius: 12, padding: 16, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  dpdpNote: { textAlign: 'center', fontSize: 11, color: '#aaa', marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  countBadge: { backgroundColor: '#1a6b3a', borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  countBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
})
