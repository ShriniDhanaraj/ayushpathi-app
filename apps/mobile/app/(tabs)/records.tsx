import { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native'
import { useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'

const WEB_API = 'https://rasbros.com'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────
interface Medication  { name: string; dosage: string; frequency: string; since: string }
interface Surgery     { procedure: string; year: string; hospital: string }
interface FamilyItem  { relation: string; condition: string }
interface HealthProfile {
  known_conditions: string[]; allergies: string[]
  current_medications: Medication[]; past_surgeries: Surgery[]; family_history: FamilyItem[]
}
interface Medicine    { name: string; dosage: string; frequency: string; duration: string; notes: string }
interface Prescription { medicines: Medicine[]; instructions: string }
interface Consultation {
  id: string; created_at: string; chief_complaint: string
  diagnosis: string | null; notes: string | null; next_visit_date: string | null
  doctor: { first_name: string; last_name: string; ayush_specialization: string } | null
  prescription: Prescription[] | null
}

const SPEC: Record<string, string> = {
  AYU: 'Ayurveda', YOG: 'Yoga & Naturopathy', UNA: 'Unani', SID: 'Siddha', HOM: 'Homeopathy',
}
const EMPTY_HEALTH: HealthProfile = {
  known_conditions: [], allergies: [], current_medications: [], past_surgeries: [], family_history: [],
}

async function saveField(authUserId: string, field: keyof HealthProfile, value: unknown) {
  const res = await fetch(`${WEB_API}/api/profile/patient/health`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ auth_user_id: authUserId, [field]: value }),
  })
  if (!res.ok) throw new Error((await res.json()).error ?? 'Save failed')
}

// ──────────────────────────────────────────────────────────────
// Screen
// ──────────────────────────────────────────────────────────────
export default function RecordsScreen() {
  const [tab, setTab] = useState<'health' | 'consultations'>('health')
  const [health, setHealth] = useState<HealthProfile>(EMPTY_HEALTH)
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [patientId, setPatientId] = useState('')
  const [authUserId, setAuthUserId] = useState('')
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<keyof HealthProfile | null>('known_conditions')
  const [expandedConsult, setExpandedConsult] = useState<string | null>(null)

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setAuthUserId(user.id)

    const { data: patient } = await supabase
      .from('patient')
      .select('id, known_conditions, allergies, current_medications, past_surgeries, family_history')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (patient) {
      setPatientId(patient.id)
      setHealth({
        known_conditions:    patient.known_conditions    ?? [],
        allergies:           patient.allergies           ?? [],
        current_medications: patient.current_medications ?? [],
        past_surgeries:      patient.past_surgeries      ?? [],
        family_history:      patient.family_history      ?? [],
      })

      const { data: consultData } = await supabase
        .from('consultation')
        .select('id, created_at, chief_complaint, diagnosis, notes, next_visit_date, doctor:doctor_id(first_name, last_name, ayush_specialization), prescription(medicines, instructions)')
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: false })
      setConsultations((consultData ?? []) as unknown as Consultation[])
    }
    setLoading(false)
  }

  useFocusEffect(useCallback(() => { load() }, []))

  // ── Health profile helpers ──
  async function removeTag(field: 'known_conditions' | 'allergies', idx: number) {
    const updated = health[field].filter((_, i) => i !== idx)
    try { await saveField(authUserId, field, updated); setHealth(p => ({ ...p, [field]: updated })) }
    catch (e: any) { Alert.alert('Error', e.message) }
  }
  async function addTag(field: 'known_conditions' | 'allergies', value: string) {
    const trimmed = value.trim(); if (!trimmed) return
    const updated = [...health[field], trimmed]
    try { await saveField(authUserId, field, updated); setHealth(p => ({ ...p, [field]: updated })) }
    catch (e: any) { Alert.alert('Error', e.message) }
  }
  async function removeItem<T>(field: 'current_medications' | 'past_surgeries' | 'family_history', idx: number) {
    const updated = (health[field] as T[]).filter((_, i) => i !== idx)
    try { await saveField(authUserId, field, updated); setHealth(p => ({ ...p, [field]: updated })) }
    catch (e: any) { Alert.alert('Error', e.message) }
  }
  async function addItem<T>(field: 'current_medications' | 'past_surgeries' | 'family_history', item: T) {
    const updated = [...(health[field] as T[]), item]
    try { await saveField(authUserId, field, updated); setHealth(p => ({ ...p, [field]: updated })) }
    catch (e: any) { Alert.alert('Error', e.message) }
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color="#1a6b3a" size="large" /></View>

  const totalHealth = Object.values(health).reduce((s, a) => s + a.length, 0)

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Health Records</Text>
        <Text style={styles.headerSub}>{consultations.length} consultations · {totalHealth} health items</Text>
      </View>

      {/* Tab switcher */}
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tabBtn, tab === 'health' && styles.tabBtnActive]} onPress={() => setTab('health')}>
          <Text style={[styles.tabText, tab === 'health' && styles.tabTextActive]}>Health Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, tab === 'consultations' && styles.tabBtnActive]} onPress={() => setTab('consultations')}>
          <Text style={[styles.tabText, tab === 'consultations' && styles.tabTextActive]}>
            Consultations {consultations.length > 0 ? `(${consultations.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {tab === 'health' ? (
        <ScrollView style={styles.body}>
          <View style={styles.notice}>
            <Ionicons name="lock-closed-outline" size={13} color="#1a6b3a" />
            <Text style={styles.noticeText}>Private — visible to doctors only with your consent.</Text>
          </View>
          <Section icon="🩺" title="Known Conditions" count={health.known_conditions.length}
            expanded={expanded === 'known_conditions'} onToggle={() => setExpanded(p => p === 'known_conditions' ? null : 'known_conditions')}>
            <TagSection tags={health.known_conditions} placeholder="e.g. Diabetes, Hypertension"
              onAdd={v => addTag('known_conditions', v)} onRemove={i => removeTag('known_conditions', i)} />
          </Section>
          <Section icon="⚠️" title="Allergies" count={health.allergies.length}
            expanded={expanded === 'allergies'} onToggle={() => setExpanded(p => p === 'allergies' ? null : 'allergies')}>
            <TagSection tags={health.allergies} placeholder="e.g. Penicillin, Peanuts"
              onAdd={v => addTag('allergies', v)} onRemove={i => removeTag('allergies', i)} />
          </Section>
          <Section icon="💊" title="Current Medications" count={health.current_medications.length}
            expanded={expanded === 'current_medications'} onToggle={() => setExpanded(p => p === 'current_medications' ? null : 'current_medications')}>
            <MedicationSection items={health.current_medications}
              onAdd={item => addItem<Medication>('current_medications', item)}
              onRemove={i => removeItem<Medication>('current_medications', i)} />
          </Section>
          <Section icon="🔪" title="Past Surgeries" count={health.past_surgeries.length}
            expanded={expanded === 'past_surgeries'} onToggle={() => setExpanded(p => p === 'past_surgeries' ? null : 'past_surgeries')}>
            <SurgerySection items={health.past_surgeries}
              onAdd={item => addItem<Surgery>('past_surgeries', item)}
              onRemove={i => removeItem<Surgery>('past_surgeries', i)} />
          </Section>
          <Section icon="👨‍👩‍👧" title="Family History" count={health.family_history.length}
            expanded={expanded === 'family_history'} onToggle={() => setExpanded(p => p === 'family_history' ? null : 'family_history')}>
            <FamilySection items={health.family_history}
              onAdd={item => addItem<FamilyItem>('family_history', item)}
              onRemove={i => removeItem<FamilyItem>('family_history', i)} />
          </Section>
          <View style={{ height: 48 }} />
        </ScrollView>
      ) : (
        <ScrollView style={styles.body}>
          {consultations.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>🩺</Text>
              <Text style={styles.emptyTitle}>No consultations yet</Text>
              <Text style={styles.emptySub}>Your consultation history will appear here after your first doctor visit.</Text>
            </View>
          ) : (
            consultations.map(c => {
              const isOpen = expandedConsult === c.id
              const dateStr = new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
              const pres = c.prescription?.[0]
              return (
                <TouchableOpacity key={c.id} style={styles.consultCard} onPress={() => setExpandedConsult(isOpen ? null : c.id)} activeOpacity={0.8}>
                  <View style={styles.consultHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.consultDate}>{dateStr}</Text>
                      <Text style={styles.consultDoctor}>Dr. {c.doctor?.first_name} {c.doctor?.last_name}</Text>
                      <Text style={styles.consultSpec}>{SPEC[c.doctor?.ayush_specialization ?? ''] ?? ''}</Text>
                    </View>
                    <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#888" />
                  </View>
                  {isOpen && (
                    <View style={styles.consultBody}>
                      {c.chief_complaint ? <InfoRow label="Chief complaint" value={c.chief_complaint} /> : null}
                      {c.diagnosis       ? <InfoRow label="Diagnosis"       value={c.diagnosis}       /> : null}
                      {c.notes           ? <InfoRow label="Notes"           value={c.notes}           /> : null}
                      {c.next_visit_date ? <InfoRow label="Next visit"      value={c.next_visit_date} /> : null}
                      {pres && pres.medicines?.length > 0 && (
                        <View style={styles.prescBox}>
                          <Text style={styles.prescTitle}>💊 Prescription</Text>
                          {pres.medicines.map((m, i) => (
                            <View key={i} style={styles.medRow}>
                              <Text style={styles.medName}>{m.name}</Text>
                              <Text style={styles.medDetail}>{[m.dosage, m.frequency, m.duration].filter(Boolean).join(' · ')}</Text>
                              {m.notes ? <Text style={styles.medNotes}>{m.notes}</Text> : null}
                            </View>
                          ))}
                          {pres.instructions ? <Text style={styles.prescInstr}>{pres.instructions}</Text> : null}
                        </View>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              )
            })
          )}
          <View style={{ height: 48 }} />
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  )
}

// ──────────────────────────────────────────────────────────────
// Sub-components (health profile — same as before)
// ──────────────────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  )
}
function Section({ icon, title, count, expanded, onToggle, children }: {
  icon: string; title: string; count: number; expanded: boolean; onToggle: () => void; children: React.ReactNode
}) {
  return (
    <View style={styles.section}>
      <TouchableOpacity style={styles.sectionHeader} onPress={onToggle} activeOpacity={0.7}>
        <Text style={styles.sectionIcon}>{icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionCount}>{count} {count === 1 ? 'item' : 'items'}</Text>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color="#888" />
      </TouchableOpacity>
      {expanded && <View style={styles.sectionBody}>{children}</View>}
    </View>
  )
}
function TagSection({ tags, placeholder, onAdd, onRemove }: { tags: string[]; placeholder: string; onAdd: (v: string) => void; onRemove: (i: number) => void }) {
  const [input, setInput] = useState('')
  return (
    <View>
      {tags.length === 0 && <Text style={styles.emptyHint}>None recorded. Add below.</Text>}
      <View style={styles.tagList}>
        {tags.map((tag, i) => (
          <View key={i} style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
            <TouchableOpacity onPress={() => onRemove(i)} hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}>
              <Ionicons name="close-circle" size={16} color="#1a6b3a" />
            </TouchableOpacity>
          </View>
        ))}
      </View>
      <View style={styles.addRow}>
        <TextInput style={[styles.input, { flex: 1 }]} value={input} onChangeText={setInput}
          placeholder={placeholder} placeholderTextColor="#bbb" returnKeyType="done"
          onSubmitEditing={() => { onAdd(input); setInput('') }} />
        <TouchableOpacity style={styles.addBtn} onPress={() => { onAdd(input); setInput('') }}>
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  )
}
function MedicationSection({ items, onAdd, onRemove }: { items: Medication[]; onAdd: (i: Medication) => void; onRemove: (i: number) => void }) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState(''); const [dosage, setDosage] = useState(''); const [frequency, setFrequency] = useState(''); const [since, setSince] = useState('')
  function handleAdd() {
    if (!name.trim()) return; onAdd({ name: name.trim(), dosage: dosage.trim(), frequency: frequency.trim(), since: since.trim() })
    setName(''); setDosage(''); setFrequency(''); setSince(''); setAdding(false)
  }
  return (
    <View>
      {items.length === 0 && !adding && <Text style={styles.emptyHint}>No medications recorded.</Text>}
      {items.map((med, i) => (
        <View key={i} style={styles.itemCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemTitle}>{med.name}</Text>
            <Text style={styles.itemSub}>{[med.dosage, med.frequency, med.since ? `since ${med.since}` : ''].filter(Boolean).join(' · ')}</Text>
          </View>
          <TouchableOpacity onPress={() => onRemove(i)}><Ionicons name="trash-outline" size={18} color="#e74c3c" /></TouchableOpacity>
        </View>
      ))}
      {adding ? (
        <View style={styles.addForm}>
          <TextInput style={styles.input} placeholder="Medicine name *" placeholderTextColor="#bbb" value={name} onChangeText={setName} />
          <TextInput style={styles.input} placeholder="Dosage (e.g. 500mg)" placeholderTextColor="#bbb" value={dosage} onChangeText={setDosage} />
          <TextInput style={styles.input} placeholder="Frequency" placeholderTextColor="#bbb" value={frequency} onChangeText={setFrequency} />
          <TextInput style={styles.input} placeholder="Since (e.g. 2022)" placeholderTextColor="#bbb" value={since} onChangeText={setSince} />
          <View style={styles.formActions}>
            <TouchableOpacity style={styles.cancelFormBtn} onPress={() => setAdding(false)}><Text style={styles.cancelFormText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={styles.saveFormBtn} onPress={handleAdd}><Text style={styles.saveFormText}>Add</Text></TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={styles.addMoreBtn} onPress={() => setAdding(true)}>
          <Ionicons name="add-circle-outline" size={16} color="#1a6b3a" /><Text style={styles.addMoreText}>Add medication</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}
function SurgerySection({ items, onAdd, onRemove }: { items: Surgery[]; onAdd: (i: Surgery) => void; onRemove: (i: number) => void }) {
  const [adding, setAdding] = useState(false)
  const [procedure, setProcedure] = useState(''); const [year, setYear] = useState(''); const [hospital, setHospital] = useState('')
  function handleAdd() {
    if (!procedure.trim()) return; onAdd({ procedure: procedure.trim(), year: year.trim(), hospital: hospital.trim() })
    setProcedure(''); setYear(''); setHospital(''); setAdding(false)
  }
  return (
    <View>
      {items.length === 0 && !adding && <Text style={styles.emptyHint}>No surgeries recorded.</Text>}
      {items.map((s, i) => (
        <View key={i} style={styles.itemCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemTitle}>{s.procedure}</Text>
            <Text style={styles.itemSub}>{[s.year, s.hospital].filter(Boolean).join(' · ')}</Text>
          </View>
          <TouchableOpacity onPress={() => onRemove(i)}><Ionicons name="trash-outline" size={18} color="#e74c3c" /></TouchableOpacity>
        </View>
      ))}
      {adding ? (
        <View style={styles.addForm}>
          <TextInput style={styles.input} placeholder="Procedure *" placeholderTextColor="#bbb" value={procedure} onChangeText={setProcedure} />
          <TextInput style={styles.input} placeholder="Year" placeholderTextColor="#bbb" keyboardType="numeric" value={year} onChangeText={setYear} />
          <TextInput style={styles.input} placeholder="Hospital" placeholderTextColor="#bbb" value={hospital} onChangeText={setHospital} />
          <View style={styles.formActions}>
            <TouchableOpacity style={styles.cancelFormBtn} onPress={() => setAdding(false)}><Text style={styles.cancelFormText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={styles.saveFormBtn} onPress={handleAdd}><Text style={styles.saveFormText}>Add</Text></TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={styles.addMoreBtn} onPress={() => setAdding(true)}>
          <Ionicons name="add-circle-outline" size={16} color="#1a6b3a" /><Text style={styles.addMoreText}>Add surgery</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}
function FamilySection({ items, onAdd, onRemove }: { items: FamilyItem[]; onAdd: (i: FamilyItem) => void; onRemove: (i: number) => void }) {
  const [adding, setAdding] = useState(false)
  const [relation, setRelation] = useState(''); const [condition, setCondition] = useState('')
  function handleAdd() {
    if (!relation.trim() || !condition.trim()) return; onAdd({ relation: relation.trim(), condition: condition.trim() })
    setRelation(''); setCondition(''); setAdding(false)
  }
  return (
    <View>
      {items.length === 0 && !adding && <Text style={styles.emptyHint}>No family history recorded.</Text>}
      {items.map((f, i) => (
        <View key={i} style={styles.itemCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemTitle}>{f.condition}</Text>
            <Text style={styles.itemSub}>{f.relation}</Text>
          </View>
          <TouchableOpacity onPress={() => onRemove(i)}><Ionicons name="trash-outline" size={18} color="#e74c3c" /></TouchableOpacity>
        </View>
      ))}
      {adding ? (
        <View style={styles.addForm}>
          <TextInput style={styles.input} placeholder="Relation (e.g. Father) *" placeholderTextColor="#bbb" value={relation} onChangeText={setRelation} />
          <TextInput style={styles.input} placeholder="Condition (e.g. Diabetes) *" placeholderTextColor="#bbb" value={condition} onChangeText={setCondition} />
          <View style={styles.formActions}>
            <TouchableOpacity style={styles.cancelFormBtn} onPress={() => setAdding(false)}><Text style={styles.cancelFormText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={styles.saveFormBtn} onPress={handleAdd}><Text style={styles.saveFormText}>Add</Text></TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={styles.addMoreBtn} onPress={() => setAdding(true)}>
          <Ionicons name="add-circle-outline" size={16} color="#1a6b3a" /><Text style={styles.addMoreText}>Add family condition</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f7f4' },
  header: { backgroundColor: '#1a6b3a', paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '700' },
  headerSub: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 3 },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e0ede6' },
  tabBtn: { flex: 1, paddingVertical: 13, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: '#1a6b3a' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#999' },
  tabTextActive: { color: '#1a6b3a' },
  body: { flex: 1, backgroundColor: '#f0f7f4' },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#e8f5ee', margin: 16, borderRadius: 8, padding: 10 },
  noticeText: { fontSize: 12, color: '#1a6b3a', flex: 1 },
  section: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 10, borderRadius: 14, borderWidth: 1, borderColor: '#d0e8da', overflow: 'hidden' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  sectionIcon: { fontSize: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#222' },
  sectionCount: { fontSize: 11, color: '#888', marginTop: 1 },
  sectionBody: { paddingHorizontal: 14, paddingBottom: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f0f7f4' },
  emptyHint: { fontSize: 12, color: '#aaa', fontStyle: 'italic', marginBottom: 8 },
  tagList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#e8f5ee', borderRadius: 20, paddingVertical: 5, paddingHorizontal: 10, borderWidth: 1, borderColor: '#b5ddc7' },
  tagText: { fontSize: 13, color: '#1a6b3a', fontWeight: '500' },
  addRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: { backgroundColor: '#f7fbf9', borderWidth: 1, borderColor: '#d0e8da', borderRadius: 8, padding: 10, fontSize: 14, color: '#222', marginBottom: 8 },
  addBtn: { backgroundColor: '#1a6b3a', borderRadius: 8, width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f7fbf9', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#d0e8da', marginBottom: 6 },
  itemTitle: { fontSize: 13, fontWeight: '600', color: '#222' },
  itemSub: { fontSize: 11, color: '#777', marginTop: 1 },
  addMoreBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8 },
  addMoreText: { fontSize: 13, color: '#1a6b3a', fontWeight: '600' },
  addForm: { backgroundColor: '#f7fbf9', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#d0e8da' },
  formActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  cancelFormBtn: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8, alignItems: 'center' },
  cancelFormText: { color: '#666', fontWeight: '600', fontSize: 13 },
  saveFormBtn: { flex: 2, backgroundColor: '#1a6b3a', borderRadius: 8, padding: 8, alignItems: 'center' },
  saveFormText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  // Consultations tab
  consultCard: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 10, borderRadius: 14, borderWidth: 1, borderColor: '#d0e8da', overflow: 'hidden' },
  consultHeader: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  consultDate: { fontSize: 12, color: '#888', marginBottom: 2 },
  consultDoctor: { fontSize: 15, fontWeight: '700', color: '#1a6b3a' },
  consultSpec: { fontSize: 12, color: '#777', marginTop: 1 },
  consultBody: { paddingHorizontal: 14, paddingBottom: 14, borderTopWidth: 1, borderTopColor: '#f0f7f4', paddingTop: 10 },
  infoRow: { marginBottom: 8 },
  infoLabel: { fontSize: 11, color: '#888', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.4 },
  infoValue: { fontSize: 14, color: '#222', lineHeight: 20 },
  prescBox: { backgroundColor: '#f0f7f4', borderRadius: 8, padding: 10, marginTop: 8 },
  prescTitle: { fontSize: 13, fontWeight: '700', color: '#1a6b3a', marginBottom: 8 },
  medRow: { marginBottom: 8 },
  medName: { fontSize: 13, fontWeight: '600', color: '#222' },
  medDetail: { fontSize: 12, color: '#555', marginTop: 1 },
  medNotes: { fontSize: 11, color: '#888', marginTop: 1, fontStyle: 'italic' },
  prescInstr: { fontSize: 12, color: '#555', marginTop: 6, borderTopWidth: 1, borderTopColor: '#d0e8da', paddingTop: 6 },
  emptyBox: { alignItems: 'center', padding: 48 },
  emptyIcon: { fontSize: 44, marginBottom: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#555' },
  emptySub: { fontSize: 13, color: '#aaa', textAlign: 'center', marginTop: 6, lineHeight: 20 },
})
