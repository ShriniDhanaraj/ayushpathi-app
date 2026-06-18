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
  known_conditions:    string[]
  allergies:           string[]
  current_medications: Medication[]
  past_surgeries:      Surgery[]
  family_history:      FamilyItem[]
}

type SectionKey = keyof HealthProfile

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────
const EMPTY_HEALTH: HealthProfile = {
  known_conditions:    [],
  allergies:           [],
  current_medications: [],
  past_surgeries:      [],
  family_history:      [],
}

async function saveField(authUserId: string, field: SectionKey, value: unknown) {
  const res = await fetch(`${WEB_API}/api/profile/patient/health`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ auth_user_id: authUserId, [field]: value }),
  })
  if (!res.ok) {
    const json = await res.json()
    throw new Error(json.error ?? 'Save failed')
  }
}

// ──────────────────────────────────────────────────────────────
// Screen
// ──────────────────────────────────────────────────────────────
export default function RecordsScreen() {
  const [health, setHealth] = useState<HealthProfile>(EMPTY_HEALTH)
  const [loading, setLoading] = useState(true)
  const [authUserId, setAuthUserId] = useState('')
  const [expanded, setExpanded] = useState<SectionKey | null>('known_conditions')

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setAuthUserId(user.id)

    const { data } = await supabase
      .from('patient')
      .select('known_conditions, allergies, current_medications, past_surgeries, family_history')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (data) {
      setHealth({
        known_conditions:    data.known_conditions    ?? [],
        allergies:           data.allergies           ?? [],
        current_medications: data.current_medications ?? [],
        past_surgeries:      data.past_surgeries      ?? [],
        family_history:      data.family_history      ?? [],
      })
    }
    setLoading(false)
  }

  useFocusEffect(useCallback(() => { load() }, []))

  function toggle(key: SectionKey) {
    setExpanded(prev => prev === key ? null : key)
  }

  // ── Tag sections (conditions + allergies) ──
  async function removeTag(field: 'known_conditions' | 'allergies', idx: number) {
    const updated = health[field].filter((_, i) => i !== idx)
    try {
      await saveField(authUserId, field, updated)
      setHealth(prev => ({ ...prev, [field]: updated }))
    } catch (e: any) { Alert.alert('Error', e.message) }
  }

  async function addTag(field: 'known_conditions' | 'allergies', value: string) {
    const trimmed = value.trim()
    if (!trimmed) return
    const updated = [...health[field], trimmed]
    try {
      await saveField(authUserId, field, updated)
      setHealth(prev => ({ ...prev, [field]: updated }))
    } catch (e: any) { Alert.alert('Error', e.message) }
  }

  // ── Structured sections ──
  async function removeItem<T>(field: 'current_medications' | 'past_surgeries' | 'family_history', idx: number) {
    const list = health[field] as T[]
    const updated = list.filter((_, i) => i !== idx)
    try {
      await saveField(authUserId, field, updated)
      setHealth(prev => ({ ...prev, [field]: updated }))
    } catch (e: any) { Alert.alert('Error', e.message) }
  }

  async function addItem<T>(field: 'current_medications' | 'past_surgeries' | 'family_history', item: T) {
    const updated = [...(health[field] as T[]), item]
    try {
      await saveField(authUserId, field, updated)
      setHealth(prev => ({ ...prev, [field]: updated }))
    } catch (e: any) { Alert.alert('Error', e.message) }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#1a6b3a" size="large" />
      </View>
    )
  }

  const totalItems =
    health.known_conditions.length +
    health.allergies.length +
    health.current_medications.length +
    health.past_surgeries.length +
    health.family_history.length

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Health Profile</Text>
          <Text style={styles.headerSub}>{totalItems} item{totalItems !== 1 ? 's' : ''} recorded</Text>
        </View>

        <View style={styles.notice}>
          <Ionicons name="lock-closed-outline" size={13} color="#1a6b3a" />
          <Text style={styles.noticeText}>Your data is private. Doctors can only see it with your explicit consent.</Text>
        </View>

        {/* Known Conditions */}
        <Section
          icon="🩺" title="Known Conditions" count={health.known_conditions.length}
          expanded={expanded === 'known_conditions'} onToggle={() => toggle('known_conditions')}
        >
          <TagSection
            tags={health.known_conditions}
            placeholder="e.g. Diabetes, Hypertension"
            onAdd={v => addTag('known_conditions', v)}
            onRemove={i => removeTag('known_conditions', i)}
          />
        </Section>

        {/* Allergies */}
        <Section
          icon="⚠️" title="Allergies" count={health.allergies.length}
          expanded={expanded === 'allergies'} onToggle={() => toggle('allergies')}
        >
          <TagSection
            tags={health.allergies}
            placeholder="e.g. Penicillin, Peanuts, Dust"
            onAdd={v => addTag('allergies', v)}
            onRemove={i => removeTag('allergies', i)}
          />
        </Section>

        {/* Current Medications */}
        <Section
          icon="💊" title="Current Medications" count={health.current_medications.length}
          expanded={expanded === 'current_medications'} onToggle={() => toggle('current_medications')}
        >
          <MedicationSection
            items={health.current_medications}
            onAdd={item => addItem<Medication>('current_medications', item)}
            onRemove={i => removeItem<Medication>('current_medications', i)}
          />
        </Section>

        {/* Past Surgeries */}
        <Section
          icon="🔪" title="Past Surgeries / Procedures" count={health.past_surgeries.length}
          expanded={expanded === 'past_surgeries'} onToggle={() => toggle('past_surgeries')}
        >
          <SurgerySection
            items={health.past_surgeries}
            onAdd={item => addItem<Surgery>('past_surgeries', item)}
            onRemove={i => removeItem<Surgery>('past_surgeries', i)}
          />
        </Section>

        {/* Family History */}
        <Section
          icon="👨‍👩‍👧" title="Family History" count={health.family_history.length}
          expanded={expanded === 'family_history'} onToggle={() => toggle('family_history')}
        >
          <FamilySection
            items={health.family_history}
            onAdd={item => addItem<FamilyItem>('family_history', item)}
            onRemove={i => removeItem<FamilyItem>('family_history', i)}
          />
        </Section>

        <View style={{ height: 48 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

// ──────────────────────────────────────────────────────────────
// Section wrapper
// ──────────────────────────────────────────────────────────────
function Section({
  icon, title, count, expanded, onToggle, children,
}: {
  icon: string; title: string; count: number
  expanded: boolean; onToggle: () => void; children: React.ReactNode
}) {
  return (
    <View style={styles.section}>
      <TouchableOpacity style={styles.sectionHeader} onPress={onToggle} activeOpacity={0.7}>
        <Text style={styles.sectionIcon}>{icon}</Text>
        <View style={styles.sectionHeaderText}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionCount}>{count} {count === 1 ? 'item' : 'items'}</Text>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color="#888" />
      </TouchableOpacity>
      {expanded && <View style={styles.sectionBody}>{children}</View>}
    </View>
  )
}

// ──────────────────────────────────────────────────────────────
// Tag section (conditions + allergies)
// ──────────────────────────────────────────────────────────────
function TagSection({
  tags, placeholder, onAdd, onRemove,
}: {
  tags: string[]; placeholder: string
  onAdd: (v: string) => void; onRemove: (i: number) => void
}) {
  const [input, setInput] = useState('')

  function handleAdd() {
    if (!input.trim()) return
    onAdd(input.trim())
    setInput('')
  }

  return (
    <View>
      {tags.length === 0 && (
        <Text style={styles.emptyHint}>None recorded yet. Add below.</Text>
      )}
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
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={input}
          onChangeText={setInput}
          placeholder={placeholder}
          placeholderTextColor="#bbb"
          returnKeyType="done"
          onSubmitEditing={handleAdd}
        />
        <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ──────────────────────────────────────────────────────────────
// Medication section
// ──────────────────────────────────────────────────────────────
function MedicationSection({
  items, onAdd, onRemove,
}: {
  items: Medication[]
  onAdd: (item: Medication) => void
  onRemove: (i: number) => void
}) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [dosage, setDosage] = useState('')
  const [frequency, setFrequency] = useState('')
  const [since, setSince] = useState('')

  function handleAdd() {
    if (!name.trim()) return
    onAdd({ name: name.trim(), dosage: dosage.trim(), frequency: frequency.trim(), since: since.trim() })
    setName(''); setDosage(''); setFrequency(''); setSince('')
    setAdding(false)
  }

  return (
    <View>
      {items.length === 0 && !adding && (
        <Text style={styles.emptyHint}>No medications recorded.</Text>
      )}
      {items.map((med, i) => (
        <View key={i} style={styles.itemCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemTitle}>{med.name}</Text>
            <Text style={styles.itemSub}>
              {[med.dosage, med.frequency, med.since ? `since ${med.since}` : ''].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <TouchableOpacity onPress={() => onRemove(i)}>
            <Ionicons name="trash-outline" size={18} color="#e74c3c" />
          </TouchableOpacity>
        </View>
      ))}
      {adding ? (
        <View style={styles.addForm}>
          <TextInput style={styles.input} placeholder="Medicine name *" placeholderTextColor="#bbb" value={name} onChangeText={setName} />
          <TextInput style={styles.input} placeholder="Dosage (e.g. 500mg)" placeholderTextColor="#bbb" value={dosage} onChangeText={setDosage} />
          <TextInput style={styles.input} placeholder="Frequency (e.g. Twice daily)" placeholderTextColor="#bbb" value={frequency} onChangeText={setFrequency} />
          <TextInput style={styles.input} placeholder="Since (e.g. 2022)" placeholderTextColor="#bbb" value={since} onChangeText={setSince} />
          <View style={styles.formActions}>
            <TouchableOpacity style={styles.cancelFormBtn} onPress={() => setAdding(false)}>
              <Text style={styles.cancelFormText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveFormBtn} onPress={handleAdd}>
              <Text style={styles.saveFormText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={styles.addMoreBtn} onPress={() => setAdding(true)}>
          <Ionicons name="add-circle-outline" size={16} color="#1a6b3a" />
          <Text style={styles.addMoreText}>Add medication</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

// ──────────────────────────────────────────────────────────────
// Surgery section
// ──────────────────────────────────────────────────────────────
function SurgerySection({
  items, onAdd, onRemove,
}: {
  items: Surgery[]
  onAdd: (item: Surgery) => void
  onRemove: (i: number) => void
}) {
  const [adding, setAdding] = useState(false)
  const [procedure, setProcedure] = useState('')
  const [year, setYear] = useState('')
  const [hospital, setHospital] = useState('')

  function handleAdd() {
    if (!procedure.trim()) return
    onAdd({ procedure: procedure.trim(), year: year.trim(), hospital: hospital.trim() })
    setProcedure(''); setYear(''); setHospital('')
    setAdding(false)
  }

  return (
    <View>
      {items.length === 0 && !adding && (
        <Text style={styles.emptyHint}>No surgeries or procedures recorded.</Text>
      )}
      {items.map((s, i) => (
        <View key={i} style={styles.itemCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemTitle}>{s.procedure}</Text>
            <Text style={styles.itemSub}>{[s.year, s.hospital].filter(Boolean).join(' · ')}</Text>
          </View>
          <TouchableOpacity onPress={() => onRemove(i)}>
            <Ionicons name="trash-outline" size={18} color="#e74c3c" />
          </TouchableOpacity>
        </View>
      ))}
      {adding ? (
        <View style={styles.addForm}>
          <TextInput style={styles.input} placeholder="Procedure name *" placeholderTextColor="#bbb" value={procedure} onChangeText={setProcedure} />
          <TextInput style={styles.input} placeholder="Year (e.g. 2019)" placeholderTextColor="#bbb" keyboardType="numeric" value={year} onChangeText={setYear} />
          <TextInput style={styles.input} placeholder="Hospital / Clinic" placeholderTextColor="#bbb" value={hospital} onChangeText={setHospital} />
          <View style={styles.formActions}>
            <TouchableOpacity style={styles.cancelFormBtn} onPress={() => setAdding(false)}>
              <Text style={styles.cancelFormText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveFormBtn} onPress={handleAdd}>
              <Text style={styles.saveFormText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={styles.addMoreBtn} onPress={() => setAdding(true)}>
          <Ionicons name="add-circle-outline" size={16} color="#1a6b3a" />
          <Text style={styles.addMoreText}>Add surgery / procedure</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

// ──────────────────────────────────────────────────────────────
// Family history section
// ──────────────────────────────────────────────────────────────
function FamilySection({
  items, onAdd, onRemove,
}: {
  items: FamilyItem[]
  onAdd: (item: FamilyItem) => void
  onRemove: (i: number) => void
}) {
  const [adding, setAdding] = useState(false)
  const [relation, setRelation] = useState('')
  const [condition, setCondition] = useState('')

  function handleAdd() {
    if (!relation.trim() || !condition.trim()) return
    onAdd({ relation: relation.trim(), condition: condition.trim() })
    setRelation(''); setCondition('')
    setAdding(false)
  }

  return (
    <View>
      {items.length === 0 && !adding && (
        <Text style={styles.emptyHint}>No family history recorded.</Text>
      )}
      {items.map((f, i) => (
        <View key={i} style={styles.itemCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemTitle}>{f.condition}</Text>
            <Text style={styles.itemSub}>{f.relation}</Text>
          </View>
          <TouchableOpacity onPress={() => onRemove(i)}>
            <Ionicons name="trash-outline" size={18} color="#e74c3c" />
          </TouchableOpacity>
        </View>
      ))}
      {adding ? (
        <View style={styles.addForm}>
          <TextInput style={styles.input} placeholder="Relation (e.g. Father, Mother) *" placeholderTextColor="#bbb" value={relation} onChangeText={setRelation} />
          <TextInput style={styles.input} placeholder="Condition (e.g. Diabetes) *" placeholderTextColor="#bbb" value={condition} onChangeText={setCondition} />
          <View style={styles.formActions}>
            <TouchableOpacity style={styles.cancelFormBtn} onPress={() => setAdding(false)}>
              <Text style={styles.cancelFormText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveFormBtn} onPress={handleAdd}>
              <Text style={styles.saveFormText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={styles.addMoreBtn} onPress={() => setAdding(true)}>
          <Ionicons name="add-circle-outline" size={16} color="#1a6b3a" />
          <Text style={styles.addMoreText}>Add family condition</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

// ──────────────────────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  loadingContainer: { flex: 1, backgroundColor: '#f0f7f4', alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, backgroundColor: '#f0f7f4' },
  header: {
    backgroundColor: '#1a6b3a', paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20,
  },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '700' },
  headerSub: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 3 },
  notice: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#e8f5ee', marginHorizontal: 16, marginTop: 12,
    borderRadius: 8, padding: 10,
  },
  noticeText: { fontSize: 12, color: '#1a6b3a', flex: 1, lineHeight: 16 },
  section: {
    backgroundColor: '#fff', marginHorizontal: 16, marginTop: 12,
    borderRadius: 14, borderWidth: 1, borderColor: '#d0e8da', overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12,
  },
  sectionIcon: { fontSize: 22 },
  sectionHeaderText: { flex: 1 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#222' },
  sectionCount: { fontSize: 12, color: '#888', marginTop: 1 },
  sectionBody: {
    paddingHorizontal: 16, paddingBottom: 16,
    borderTopWidth: 1, borderTopColor: '#f0f7f4',
    paddingTop: 12,
  },
  emptyHint: { fontSize: 13, color: '#aaa', fontStyle: 'italic', marginBottom: 10 },
  tagList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#e8f5ee', borderRadius: 20,
    paddingVertical: 6, paddingHorizontal: 12,
    borderWidth: 1, borderColor: '#b5ddc7',
  },
  tagText: { fontSize: 13, color: '#1a6b3a', fontWeight: '500' },
  addRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: {
    backgroundColor: '#f7fbf9', borderWidth: 1, borderColor: '#d0e8da',
    borderRadius: 8, padding: 10, fontSize: 14, color: '#222', marginBottom: 8,
  },
  addBtn: {
    backgroundColor: '#1a6b3a', borderRadius: 8,
    width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
  },
  itemCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f7fbf9', borderRadius: 8, padding: 12,
    borderWidth: 1, borderColor: '#d0e8da', marginBottom: 8,
  },
  itemTitle: { fontSize: 14, fontWeight: '600', color: '#222' },
  itemSub: { fontSize: 12, color: '#777', marginTop: 2 },
  addMoreBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 10,
  },
  addMoreText: { fontSize: 14, color: '#1a6b3a', fontWeight: '600' },
  addForm: { backgroundColor: '#f7fbf9', borderRadius: 8, padding: 12, marginTop: 4, borderWidth: 1, borderColor: '#d0e8da' },
  formActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  cancelFormBtn: {
    flex: 1, borderWidth: 1, borderColor: '#ccc',
    borderRadius: 8, padding: 10, alignItems: 'center',
  },
  cancelFormText: { color: '#666', fontWeight: '600', fontSize: 14 },
  saveFormBtn: { flex: 2, backgroundColor: '#1a6b3a', borderRadius: 8, padding: 10, alignItems: 'center' },
  saveFormText: { color: '#fff', fontWeight: '700', fontSize: 14 },
})
