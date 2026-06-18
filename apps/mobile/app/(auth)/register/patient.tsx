import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../../lib/supabase'

const WEB_API = 'https://rasbros.com'

type Step = 1 | 2 | 3

export default function PatientRegisterScreen() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Step 1 — account
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Step 2 — personal
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [dob, setDob] = useState('')
  const [gender, setGender] = useState('')
  const [mobile, setMobile] = useState('')

  // Step 3 — address
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [pincode, setPincode] = useState('')

  function nextStep() {
    setError('')
    if (step === 1) {
      if (!email || !password || !confirmPassword) { setError('All fields required.'); return }
      if (password !== confirmPassword) { setError('Passwords do not match.'); return }
      if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    }
    if (step === 2) {
      if (!firstName || !lastName || !dob || !gender || !mobile) { setError('All fields required.'); return }
    }
    if (step < 3) setStep((step + 1) as Step)
  }

  async function handleSubmit() {
    setError('')
    if (!street || !city || !state || !pincode) { setError('All address fields required.'); return }
    setLoading(true)
    try {
      // 1. Create auth user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({ email, password })
      if (signUpError) throw signUpError
      const authUserId = authData.user?.id
      if (!authUserId) throw new Error('Failed to create account.')

      // 2. Create profile via API — field names match server route exactly
      const res = await fetch(`${WEB_API}/api/register/patient`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auth_user_id: authUserId,
          first_name: firstName,
          last_name: lastName,
          date_of_birth: dob,
          gender,
          mobile,
          email,
          street,
          city,
          state,
          pincode,
          country: 'India',
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Registration failed.')

      // 3. Update user metadata with profile id
      await supabase.auth.updateUser({ data: { profile_id: json.patient_id, role: 'patient' } })

      router.replace('/(tabs)/')
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say']

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Patient Registration</Text>
        <Text style={styles.stepLabel}>Step {step} of 3</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {step === 1 && (
          <View>
            <Text style={styles.sectionTitle}>Account Details</Text>
            <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#aaa"
              autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
            <TextInput style={styles.input} placeholder="Password (min 8 chars)" placeholderTextColor="#aaa"
              secureTextEntry value={password} onChangeText={setPassword} />
            <TextInput style={styles.input} placeholder="Confirm Password" placeholderTextColor="#aaa"
              secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />
          </View>
        )}

        {step === 2 && (
          <View>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            <TextInput style={styles.input} placeholder="First Name" placeholderTextColor="#aaa"
              value={firstName} onChangeText={setFirstName} />
            <TextInput style={styles.input} placeholder="Last Name" placeholderTextColor="#aaa"
              value={lastName} onChangeText={setLastName} />
            <TextInput style={styles.input} placeholder="Date of Birth (YYYY-MM-DD)" placeholderTextColor="#aaa"
              value={dob} onChangeText={setDob} />
            <Text style={styles.label}>Gender</Text>
            <View style={styles.genderRow}>
              {GENDERS.map(g => (
                <TouchableOpacity
                  key={g}
                  style={[styles.genderBtn, gender === g && styles.genderBtnActive]}
                  onPress={() => setGender(g)}
                >
                  <Text style={[styles.genderBtnText, gender === g && styles.genderBtnTextActive]}>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={styles.input} placeholder="Mobile Number (+91...)" placeholderTextColor="#aaa"
              keyboardType="phone-pad" value={mobile} onChangeText={setMobile} />
          </View>
        )}

        {step === 3 && (
          <View>
            <Text style={styles.sectionTitle}>Address</Text>
            <TextInput style={styles.input} placeholder="Street Address" placeholderTextColor="#aaa"
              value={street} onChangeText={setStreet} />
            <TextInput style={styles.input} placeholder="City" placeholderTextColor="#aaa"
              value={city} onChangeText={setCity} />
            <TextInput style={styles.input} placeholder="State" placeholderTextColor="#aaa"
              value={state} onChangeText={setState} />
            <TextInput style={styles.input} placeholder="PIN Code" placeholderTextColor="#aaa"
              keyboardType="numeric" value={pincode} onChangeText={setPincode} />
          </View>
        )}

        {step < 3 ? (
          <TouchableOpacity style={styles.btn} onPress={nextStep}>
            <Text style={styles.btnText}>Next →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.btn} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Create Account</Text>}
          </TouchableOpacity>
        )}

        {step > 1 && (
          <TouchableOpacity onPress={() => setStep((step - 1) as Step)} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f7f4' },
  content: { padding: 24, paddingBottom: 48 },
  title: { fontSize: 24, fontWeight: '700', color: '#1a6b3a', marginBottom: 4 },
  stepLabel: { fontSize: 13, color: '#888', marginBottom: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '600', color: '#333', marginBottom: 12 },
  error: { backgroundColor: '#fde8e8', color: '#c0392b', padding: 10, borderRadius: 8, marginBottom: 12, fontSize: 13 },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#d0e8da',
    borderRadius: 10, padding: 14, fontSize: 15, color: '#222', marginBottom: 12,
  },
  label: { fontSize: 13, color: '#555', marginBottom: 6 },
  genderRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  genderBtn: { borderWidth: 1, borderColor: '#d0e8da', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  genderBtnActive: { backgroundColor: '#1a6b3a', borderColor: '#1a6b3a' },
  genderBtnText: { color: '#555', fontSize: 13 },
  genderBtnTextActive: { color: '#fff' },
  btn: { backgroundColor: '#1a6b3a', borderRadius: 10, padding: 15, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  backBtn: { marginTop: 16, alignItems: 'center' },
  backText: { color: '#1a6b3a', fontSize: 14 },
})
