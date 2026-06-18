import { useState } from 'react'
import {
  KeyboardAvoidingView, Platform, Pressable, ScrollView,
  StyleSheet, Text, View,
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { colors } from '@/lib/colors'

const INDIA_STATES = [
  'Andhra Pradesh','Assam','Bihar','Chhattisgarh','Delhi','Goa','Gujarat',
  'Haryana','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Odisha',
  'Punjab','Rajasthan','Tamil Nadu','Telangana','Uttar Pradesh','West Bengal',
  'Jammu & Kashmir','Puducherry',
]

const GENDER_OPTIONS = [['M','Male'],['F','Female'],['U','Other']] as const

interface FormData {
  first_name: string; last_name: string
  date_of_birth: string; gender: string
  email: string; password: string; mobile: string
  city: string; state: string; pincode: string
}

const INITIAL: FormData = {
  first_name: '', last_name: '', date_of_birth: '', gender: '',
  email: '', password: '', mobile: '',
  city: '', state: '', pincode: '',
}

const FRIENDLY: Record<string, string> = {
  'User already registered': 'An account with this email already exists.',
}

type Step = 1 | 2 | 3

function ProgressBar({ step }: { step: Step }) {
  return (
    <View style={pb.wrapper}>
      <Text style={pb.label}>Step {step} of 3</Text>
      <View style={pb.track}>
        <View style={[pb.fill, { width: `${(step / 3) * 100}%` as `${number}%` }]} />
      </View>
    </View>
  )
}
const pb = StyleSheet.create({
  wrapper: { gap: 4 },
  label: { fontSize: 12, color: colors.gray[500] },
  track: { height: 4, backgroundColor: colors.gray[200], borderRadius: 4 },
  fill: { height: 4, backgroundColor: colors.brand[600], borderRadius: 4 },
})

export default function PatientRegister() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [form, setForm] = useState<FormData>(INITIAL)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState('')

  function set(field: keyof FormData, value: string) {
    setForm(f => ({ ...f, [field]: value }))
    setError('')
  }

  async function handleSubmit() {
    setLoading(true); setError('')

    // 1. Create auth user
    setLoadingStep('Creating account…')
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: { data: { role: 'patient' } },
    })
    if (authErr || !authData.user) {
      setError(FRIENDLY[authErr?.message ?? ''] ?? (authErr?.message ?? 'Registration failed.'))
      setLoading(false); return
    }

    // 2. Save profile via server API
    setLoadingStep('Saving your profile…')
    const res = await fetch(`${process.env.EXPO_PUBLIC_APP_URL}/api/register/patient`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_user_id: authData.user.id,
        first_name: form.first_name,
        last_name: form.last_name,
        date_of_birth: form.date_of_birth,
        gender: form.gender,
        email: form.email.trim(),
        mobile: form.mobile,
        whatsapp_enabled: false,
        communication_consent: ['WHATSAPP'],
        city: form.city,
        state: form.state,
        pincode: form.pincode,
        country: 'India',
      }),
    })

    const result = await res.json()
    if (!res.ok) {
      setError(result.error ?? 'Failed to save profile.')
      setLoading(false); return
    }

    await supabase.auth.updateUser({ data: { profile_id: result.patient_id } })
    // Root layout auth listener will redirect to (tabs)
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => step === 1 ? router.back() : setStep(s => (s - 1) as Step)}>
            <Text style={styles.back}>← Back</Text>
          </Pressable>
          <ProgressBar step={step} />
        </View>

        <View style={styles.card}>

          {/* ── STEP 1: Identity ── */}
          {step === 1 && (
            <View style={styles.fields}>
              <Text style={styles.title}>Tell us about yourself</Text>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Input label="First name" placeholder="Ramesh" value={form.first_name}
                    onChangeText={t => set('first_name', t)} autoCapitalize="words" />
                </View>
                <View style={{ flex: 1 }}>
                  <Input label="Last name" placeholder="Kumar" value={form.last_name}
                    onChangeText={t => set('last_name', t)} autoCapitalize="words" />
                </View>
              </View>

              <Input label="Date of birth (YYYY-MM-DD)" placeholder="1990-01-15"
                value={form.date_of_birth} onChangeText={t => set('date_of_birth', t)}
                keyboardType="numbers-and-punctuation" />

              <View style={styles.genderWrapper}>
                <Text style={styles.fieldLabel}>Gender</Text>
                <View style={styles.genderRow}>
                  {GENDER_OPTIONS.map(([val, lbl]) => (
                    <Pressable key={val} onPress={() => set('gender', val)}
                      style={[styles.genderBtn, form.gender === val && styles.genderBtnActive]}>
                      <Text style={[styles.genderLabel, form.gender === val && styles.genderLabelActive]}>
                        {lbl}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <Button label="Continue →" onPress={() => setStep(2)}
                disabled={!form.first_name || !form.last_name || !form.date_of_birth || !form.gender} />
            </View>
          )}

          {/* ── STEP 2: Contact ── */}
          {step === 2 && (
            <View style={styles.fields}>
              <Text style={styles.title}>Contact & login</Text>

              <Input label="Email address" placeholder="you@example.com"
                value={form.email} onChangeText={t => set('email', t)}
                keyboardType="email-address" autoCapitalize="none" autoComplete="email" />

              <Input label="Password (min 8 characters)" placeholder="••••••••"
                value={form.password} onChangeText={t => set('password', t)}
                secureToggle autoComplete="new-password" />

              <Input label="Mobile number" placeholder="+91 98765 43210"
                value={form.mobile} onChangeText={t => set('mobile', t)}
                keyboardType="phone-pad" />

              <Button label="Continue →" onPress={() => setStep(3)}
                disabled={!form.email || form.password.length < 8 || !form.mobile} />
            </View>
          )}

          {/* ── STEP 3: Address ── */}
          {step === 3 && (
            <View style={styles.fields}>
              <Text style={styles.title}>Your location</Text>
              <Text style={styles.subtitle}>Used to find doctors near you</Text>

              <Input label="City" placeholder="Chennai"
                value={form.city} onChangeText={t => set('city', t)} autoCapitalize="words" />

              <View style={styles.fieldWrapper}>
                <Text style={styles.fieldLabel}>State</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  style={styles.stateScroll} contentContainerStyle={styles.stateScrollContent}>
                  {INDIA_STATES.map(s => (
                    <Pressable key={s} onPress={() => set('state', s)}
                      style={[styles.stateChip, form.state === s && styles.stateChipActive]}>
                      <Text style={[styles.stateChipText, form.state === s && styles.stateChipTextActive]}>
                        {s}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
                {form.state ? <Text style={styles.stateSelected}>✓ {form.state}</Text> : null}
              </View>

              <Input label="PIN code" placeholder="600017"
                value={form.pincode} onChangeText={t => set('pincode', t)}
                keyboardType="number-pad" maxLength={6} />

              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>⚠ {error}</Text>
                </View>
              ) : null}

              <Button
                label={loading ? loadingStep || 'Creating account…' : 'Create account ✓'}
                onPress={handleSubmit}
                loading={loading}
                disabled={!form.city || !form.state || loading}
              />

              <Text style={styles.dpdp}>Protected under DPDP Act 2023 · Data stored in India</Text>
            </View>
          )}

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: colors.brand[50], padding: 20, gap: 20 },
  header: { gap: 12, paddingTop: 12 },
  back: { fontSize: 14, color: colors.gray[500] },
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  fields: { gap: 16 },
  title: { fontSize: 22, fontWeight: '700', color: colors.gray[900] },
  subtitle: { fontSize: 13, color: colors.gray[500], marginTop: -8 },
  row: { flexDirection: 'row', gap: 12 },
  fieldLabel: { fontSize: 13, fontWeight: '500', color: colors.gray[700], marginBottom: 6 },
  fieldWrapper: { gap: 6 },
  genderWrapper: { gap: 8 },
  genderRow: { flexDirection: 'row', gap: 8 },
  genderBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5,
    borderColor: colors.gray[200], alignItems: 'center', backgroundColor: colors.white,
  },
  genderBtnActive: { backgroundColor: colors.brand[600], borderColor: colors.brand[600] },
  genderLabel: { fontSize: 14, fontWeight: '500', color: colors.gray[700] },
  genderLabelActive: { color: colors.white },
  stateScroll: { maxHeight: 44 },
  stateScrollContent: { gap: 8, paddingRight: 8 },
  stateChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: colors.gray[200], backgroundColor: colors.white,
  },
  stateChipActive: { backgroundColor: colors.brand[600], borderColor: colors.brand[600] },
  stateChipText: { fontSize: 13, color: colors.gray[600] },
  stateChipTextActive: { color: colors.white, fontWeight: '600' },
  stateSelected: { fontSize: 12, color: colors.brand[600], fontWeight: '500' },
  errorBox: {
    backgroundColor: colors.red[50], borderWidth: 1,
    borderColor: colors.red[200], borderRadius: 10, padding: 12,
  },
  errorText: { fontSize: 13, color: colors.red[700] },
  dpdp: { textAlign: 'center', fontSize: 11, color: colors.gray[400] },
})
