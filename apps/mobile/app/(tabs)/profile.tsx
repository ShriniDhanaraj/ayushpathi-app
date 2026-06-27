import { useState, useCallback } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'

const WEB_API = 'https://rasbros.com'

type EditSection = 'personal' | 'address' | null

interface PatientProfile {
  id: string
  first_name: string
  last_name: string
  date_of_birth: string | null
  gender: string | null
  mobile: string | null
  email: string | null
  address: {
    door_number: string | null
    street: string | null
    area: string | null
    city: string | null
    district: string | null
    state: string | null
    pincode: string | null
  } | null
}

export default function ProfileScreen() {
  const router = useRouter()
  const [profile, setProfile] = useState<PatientProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<EditSection>(null)
  const [error, setError] = useState('')

  // Personal edit state
  const [editFirstName, setEditFirstName] = useState('')
  const [editLastName, setEditLastName] = useState('')
  const [editDob, setEditDob] = useState('')
  const [editGender, setEditGender] = useState('')
  const [editMobile, setEditMobile] = useState('')

  // Address edit state
  const [editDoor, setEditDoor] = useState('')
  const [editStreet, setEditStreet] = useState('')
  const [editArea, setEditArea] = useState('')
  const [editCity, setEditCity] = useState('')
  const [editDistrict, setEditDistrict] = useState('')
  const [editState, setEditState] = useState('')
  const [editPincode, setEditPincode] = useState('')

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error: fetchErr } = await supabase
      .from('patient')
      .select('id, first_name, last_name, date_of_birth, gender, mobile, email, address:address_id(door_number, street, area, city, district, state, pincode)')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (!fetchErr && data) setProfile(data as unknown as PatientProfile)
    setLoading(false)
  }

  useFocusEffect(useCallback(() => { load() }, []))

  function startEditPersonal() {
    if (!profile) return
    setEditFirstName(profile.first_name ?? '')
    setEditLastName(profile.last_name ?? '')
    setEditDob(profile.date_of_birth ?? '')
    setEditGender(profile.gender ?? '')
    setEditMobile(profile.mobile ?? '')
    setEditing('personal')
    setError('')
  }

  function startEditAddress() {
    if (!profile) return
    const a = profile.address
    setEditDoor(a?.door_number ?? '')
    setEditStreet(a?.street ?? '')
    setEditArea(a?.area ?? '')
    setEditCity(a?.city ?? '')
    setEditDistrict(a?.district ?? '')
    setEditState(a?.state ?? '')
    setEditPincode(a?.pincode ?? '')
    setEditing('address')
    setError('')
  }

  async function savePersonal() {
    if (!editFirstName || !editLastName) { setError('First and last name are required.'); return }
    setSaving(true); setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')
      const res = await fetch(`${WEB_API}/api/profile/patient`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auth_user_id: user.id,
          first_name: editFirstName, last_name: editLastName,
          date_of_birth: editDob || undefined, gender: editGender || undefined,
          mobile: editMobile || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Update failed')
      setEditing(null)
      await load()
      Alert.alert('Saved', 'Personal information updated.')
    } catch (e: unknown) {
      setError((e as Error).message ?? 'Something went wrong.')
    } finally { setSaving(false) }
  }

  async function saveAddress() {
    if (!editCity || !editState) { setError('City and state are required.'); return }
    setSaving(true); setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')
      const res = await fetch(`${WEB_API}/api/profile/patient`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auth_user_id: user.id,
          door_number: editDoor || undefined, street: editStreet || undefined,
          area: editArea || undefined, city: editCity,
          district: editDistrict || undefined, state: editState,
          pincode: editPincode || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Update failed')
      setEditing(null)
      await load()
      Alert.alert('Saved', 'Address updated.')
    } catch (e: unknown) {
      setError((e as Error).message ?? 'Something went wrong.')
    } finally { setSaving(false) }
  }

  async function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ])
  }

  const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say']

  const fullName = profile ? `${profile.first_name} ${profile.last_name}` : ''
  const initials = profile
    ? `${profile.first_name?.[0] ?? ''}${profile.last_name?.[0] ?? ''}`.toUpperCase()
    : '?'

  const addr = profile?.address
  const addressLine = addr
    ? [addr.door_number, addr.street, addr.area, addr.city, addr.district, addr.state, addr.pincode]
        .filter(Boolean).join(', ')
    : 'Not set'

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          {loading ? (
            <ActivityIndicator color="#fff" style={{ marginTop: 8 }} />
          ) : (
            <>
              <Text style={styles.headerName}>{fullName || 'Loading…'}</Text>
              <Text style={styles.headerEmail}>{profile?.email ?? ''}</Text>
            </>
          )}
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {loading ? (
          <ActivityIndicator color="#1a6b3a" style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* ── Quick Access ── */}
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.navRow}
                onPress={() => router.push('/(tabs)/records')}
                activeOpacity={0.7}
              >
                <View style={styles.navIcon}>
                  <Text style={styles.navEmoji}>💊</Text>
                </View>
                <View style={styles.navContent}>
                  <Text style={styles.navTitle}>Prescriptions & Consultations</Text>
                  <Text style={styles.navSub}>View your health records</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#c0c0c0" />
              </TouchableOpacity>

              <View style={styles.navDivider} />

              <TouchableOpacity
                style={styles.navRow}
                onPress={() => router.push('/(tabs)/doctors')}
                activeOpacity={0.7}
              >
                <View style={styles.navIcon}>
                  <Text style={styles.navEmoji}>👨‍⚕️</Text>
                </View>
                <View style={styles.navContent}>
                  <Text style={styles.navTitle}>My Doctors</Text>
                  <Text style={styles.navSub}>Manage doctor access & consent</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#c0c0c0" />
              </TouchableOpacity>
            </View>

            {/* ── Personal Information ── */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Personal Information</Text>
                {editing !== 'personal' && (
                  <TouchableOpacity onPress={startEditPersonal} style={styles.editBtn}>
                    <Ionicons name="pencil-outline" size={14} color="#1a6b3a" />
                    <Text style={styles.editBtnText}>Edit</Text>
                  </TouchableOpacity>
                )}
              </View>

              {editing === 'personal' ? (
                <View style={styles.editForm}>
                  <Text style={styles.fieldLabel}>First Name *</Text>
                  <TextInput style={styles.input} value={editFirstName} onChangeText={setEditFirstName}
                    placeholder="First name" placeholderTextColor="#aaa" />
                  <Text style={styles.fieldLabel}>Last Name *</Text>
                  <TextInput style={styles.input} value={editLastName} onChangeText={setEditLastName}
                    placeholder="Last name" placeholderTextColor="#aaa" />
                  <Text style={styles.fieldLabel}>Date of Birth</Text>
                  <TextInput style={styles.input} value={editDob} onChangeText={setEditDob}
                    placeholder="YYYY-MM-DD" placeholderTextColor="#aaa" />
                  <Text style={styles.fieldLabel}>Gender</Text>
                  <View style={styles.genderRow}>
                    {GENDERS.map(g => (
                      <TouchableOpacity key={g}
                        style={[styles.genderBtn, editGender === g && styles.genderBtnActive]}
                        onPress={() => setEditGender(g)}>
                        <Text style={[styles.genderBtnText, editGender === g && styles.genderBtnTextActive]}>{g}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.fieldLabel}>Mobile</Text>
                  <TextInput style={styles.input} value={editMobile} onChangeText={setEditMobile}
                    placeholder="+91..." placeholderTextColor="#aaa" keyboardType="phone-pad" />
                  <View style={styles.editActions}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => { setEditing(null); setError('') }}>
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.saveBtn} onPress={savePersonal} disabled={saving}>
                      {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Save</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.fieldList}>
                  <FieldRow label="Full Name" value={fullName} />
                  <FieldRow label="Date of Birth" value={profile?.date_of_birth ?? '—'} />
                  <FieldRow label="Gender" value={profile?.gender ?? '—'} />
                  <FieldRow label="Mobile" value={profile?.mobile ?? '—'} />
                  <FieldRow label="Email" value={profile?.email ?? '—'} last />
                </View>
              )}
            </View>

            {/* ── Address ── */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Address</Text>
                {editing !== 'address' && (
                  <TouchableOpacity onPress={startEditAddress} style={styles.editBtn}>
                    <Ionicons name="pencil-outline" size={14} color="#1a6b3a" />
                    <Text style={styles.editBtnText}>Edit</Text>
                  </TouchableOpacity>
                )}
              </View>

              {editing === 'address' ? (
                <View style={styles.editForm}>
                  <Text style={styles.fieldLabel}>Door / Flat No.</Text>
                  <TextInput style={styles.input} value={editDoor} onChangeText={setEditDoor}
                    placeholder="Door / Flat number" placeholderTextColor="#aaa" />
                  <Text style={styles.fieldLabel}>Street</Text>
                  <TextInput style={styles.input} value={editStreet} onChangeText={setEditStreet}
                    placeholder="Street" placeholderTextColor="#aaa" />
                  <Text style={styles.fieldLabel}>Area / Locality</Text>
                  <TextInput style={styles.input} value={editArea} onChangeText={setEditArea}
                    placeholder="Area / Locality" placeholderTextColor="#aaa" />
                  <Text style={styles.fieldLabel}>City *</Text>
                  <TextInput style={styles.input} value={editCity} onChangeText={setEditCity}
                    placeholder="City" placeholderTextColor="#aaa" />
                  <Text style={styles.fieldLabel}>District</Text>
                  <TextInput style={styles.input} value={editDistrict} onChangeText={setEditDistrict}
                    placeholder="District" placeholderTextColor="#aaa" />
                  <Text style={styles.fieldLabel}>State *</Text>
                  <TextInput style={styles.input} value={editState} onChangeText={setEditState}
                    placeholder="State" placeholderTextColor="#aaa" />
                  <Text style={styles.fieldLabel}>PIN Code</Text>
                  <TextInput style={styles.input} value={editPincode} onChangeText={setEditPincode}
                    placeholder="6-digit PIN" placeholderTextColor="#aaa" keyboardType="numeric" />
                  <View style={styles.editActions}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => { setEditing(null); setError('') }}>
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.saveBtn} onPress={saveAddress} disabled={saving}>
                      {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Save</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.fieldList}>
                  <Text style={styles.addressLine}>{addressLine}</Text>
                </View>
              )}
            </View>

            {/* ── Sign out ── */}
            <View style={styles.section}>
              <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
                <Ionicons name="log-out-outline" size={18} color="#c0392b" />
                <Text style={styles.signOutText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function FieldRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.fieldRow, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.fieldRowLabel}>{label}</Text>
      <Text style={styles.fieldRowValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f7f4' },
  header: {
    backgroundColor: '#1a6b3a', paddingTop: 56, paddingBottom: 28,
    alignItems: 'center',
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  avatarText: { fontSize: 26, fontWeight: '700', color: '#fff' },
  headerName: { fontSize: 20, fontWeight: '700', color: '#fff' },
  headerEmail: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  errorBox: { backgroundColor: '#fde8e8', margin: 16, padding: 12, borderRadius: 8 },
  errorText: { color: '#c0392b', fontSize: 13 },
  section: {
    backgroundColor: '#fff', marginHorizontal: 16, marginTop: 16,
    borderRadius: 14, borderWidth: 1, borderColor: '#d0e8da', overflow: 'hidden',
  },
  // ── Quick nav rows ──
  navRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  navIcon: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: '#f0f7f4',
    alignItems: 'center', justifyContent: 'center',
  },
  navEmoji: { fontSize: 20 },
  navContent: { flex: 1 },
  navTitle: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  navSub: { fontSize: 12, color: '#888', marginTop: 2 },
  navDivider: { height: 1, backgroundColor: '#f0f7f4', marginLeft: 68 },
  // ── Existing styles ──
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f0f7f4',
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1a6b3a' },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editBtnText: { fontSize: 13, color: '#1a6b3a', fontWeight: '600' },
  fieldList: { paddingHorizontal: 16, paddingBottom: 4 },
  fieldRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f7f4',
  },
  fieldRowLabel: { fontSize: 13, color: '#888', flex: 1 },
  fieldRowValue: { fontSize: 14, fontWeight: '500', color: '#222', flex: 2, textAlign: 'right' },
  addressLine: { fontSize: 14, color: '#444', padding: 16, lineHeight: 20 },
  editForm: { padding: 16 },
  fieldLabel: { fontSize: 12, color: '#888', marginBottom: 4, marginTop: 8 },
  input: {
    backgroundColor: '#f7fbf9', borderWidth: 1, borderColor: '#d0e8da',
    borderRadius: 8, padding: 12, fontSize: 15, color: '#222',
  },
  genderRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  genderBtn: {
    borderWidth: 1, borderColor: '#d0e8da', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  genderBtnActive: { backgroundColor: '#1a6b3a', borderColor: '#1a6b3a' },
  genderBtnText: { color: '#555', fontSize: 13 },
  genderBtnTextActive: { color: '#fff' },
  editActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: {
    flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 8,
    padding: 12, alignItems: 'center',
  },
  cancelBtnText: { color: '#666', fontWeight: '600' },
  saveBtn: { flex: 2, backgroundColor: '#1a6b3a', borderRadius: 8, padding: 12, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: 16,
  },
  signOutText: { color: '#c0392b', fontWeight: '600', fontSize: 15 },
})
