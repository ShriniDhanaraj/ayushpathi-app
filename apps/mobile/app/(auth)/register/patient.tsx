import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Picker } from '@react-native-picker/picker'
import { supabase } from '../../../lib/supabase'

const WEB_API = 'https://rasbros.com'

// ── Supported languages (mirrors lookup_language table) ──────────────────────
const LANGUAGES = [
  { code: 'EN', label: 'English',   native: 'English'   },
  { code: 'HI', label: 'Hindi',     native: 'हिन्दी'     },
  { code: 'TA', label: 'Tamil',     native: 'தமிழ்'      },
  { code: 'TE', label: 'Telugu',    native: 'తెలుగు'     },
  { code: 'KN', label: 'Kannada',   native: 'ಕನ್ನಡ'      },
  { code: 'ML', label: 'Malayalam', native: 'മലയാളം'     },
  { code: 'BN', label: 'Bengali',   native: 'বাংলা'      },
  { code: 'GU', label: 'Gujarati',  native: 'ગુજરાતી'    },
  { code: 'MR', label: 'Marathi',   native: 'मराठी'      },
  { code: 'PA', label: 'Punjabi',   native: 'ਪੰਜਾਬੀ'     },
  { code: 'OR', label: 'Odia',      native: 'ଓଡ଼ିଆ'       },
  { code: 'AS', label: 'Assamese',  native: 'অসমীয়া'    },
  { code: 'UR', label: 'Urdu',      native: 'اردو'       },
  { code: 'SA', label: 'Sanskrit',  native: 'संस्कृतम्'   },
]

// Simple translation lookup — English fallback
const TRANSLATIONS: Record<string, Record<string, string>> = {
  stepLanguages: { EN: 'Language Preferences', HI: 'भाषा प्राथमिकताएं', TA: 'மொழி விருப்பங்கள்', TE: 'భాషా ప్రాధాన్యతలు', KN: 'ಭಾಷಾ ಆದ್ಯತೆಗಳು', ML: 'ഭാഷാ മുൻഗണനകൾ', BN: 'ভাষা পছন্দ', GU: 'ભાષા પ્રાથમિકતાઓ', MR: 'भाषा प्राधान्ये' },
  knownLanguages: { EN: 'Languages you know', HI: 'आपकी जानकारी की भाषाएं', TA: 'நீங்கள் தெரிந்த மொழிகள்', TE: 'మీకు తెలిసిన భాషలు', KN: 'ನಿಮಗೆ ತಿಳಿದ ಭಾಷೆಗಳು', ML: 'നിങ്ങൾക്ക് അറിയാവുന്ന ഭാഷകൾ', BN: 'আপনি যে ভাষাগুলো জানেন', GU: 'તમે જાણો છો તે ભાષાઓ', MR: 'तुम्हाला माहित असलेल्या भाषा' },
  uiLanguage: { EN: 'App display language', HI: 'ऐप प्रदर्शन भाषा', TA: 'செயலி காட்சி மொழி', TE: 'యాప్ డిస్‌ప్లే భాష', KN: 'ಅಪ್ಲಿಕೇಶನ್ ಪ್ರದರ್ಶನ ಭಾಷೆ', ML: 'ആപ്പ് ഡിസ്‌പ്ലേ ഭാഷ', BN: 'অ্যাপ প্রদর্শনী ভাষা', GU: 'એપ ડિસ્પ્લે ભાષા', MR: 'अॅप प्रदर्शन भाषा' },
  interactionLanguage: { EN: 'Preferred consultation language', HI: 'पसंदीदा परामर्श भाषा', TA: 'விரும்பிய ஆலோசனை மொழி', TE: 'ప్రాధాన్య సంప్రదింపు భాష', KN: 'ಆದ್ಯತೆಯ ಸಂಪರ್ಕ ಭಾಷೆ', ML: 'ഇഷ്ടപ്പെട്ട കൺസൾട്ടേഷൻ ഭാഷ', BN: 'পছন্দের পরামর্শ ভাষা', GU: 'પ્રિય પરામર્શ ભાષા', MR: 'पसंतीची सल्लामसलत भाषा' },
}

function tr(key: string, lang: string): string {
  return TRANSLATIONS[key]?.[lang] ?? TRANSLATIONS[key]?.['EN'] ?? key
}

// ── Types ─────────────────────────────────────────────────────────────────────
type Step = 1 | 2 | 3 | 4

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
  const [stateName, setStateName] = useState('')
  const [pincode, setPincode] = useState('')

  // Step 4 — language preferences
  const [uiLang, setUiLang] = useState('EN')
  const [knownLangs, setKnownLangs] = useState<string[]>(['EN'])
  const [interactionLang, setInteractionLang] = useState('EN')

  function toggleKnownLang(code: string) {
    setKnownLangs(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    )
  }

  function handleUILangChange(code: string) {
    setUiLang(code)
    setInteractionLang(code)
    if (!knownLangs.includes(code)) {
      setKnownLangs(prev => [...prev, code])
    }
  }

  // ── Validation ──────────────────────────────────────────────────────────────
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
    if (step === 3) {
      if (!street || !city || !stateName || !pincode) { setError('All address fields required.'); return }
    }
    if (step < 4) setStep((step + 1) as Step)
  }

  // ── Submit ───────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    setError('')
    if (knownLangs.length === 0) { setError('Please select at least one language you know.'); return }
    if (!uiLang) { setError('Please select your app display language.'); return }
    if (!interactionLang) { setError('Please select your preferred consultation language.'); return }

    setLoading(true)
    try {
      // 1. Create auth user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({ email, password })
      if (signUpError) throw signUpError
      const authUserId = authData.user?.id
      if (!authUserId) throw new Error('Failed to create account.')

      // 2. Create profile via API
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
          state: stateName,
          pincode,
          country: 'India',
          known_languages: knownLangs,
          ui_language: uiLang,
          preferred_interaction_language: interactionLang,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Registration failed.')

      // 3. Update user metadata
      await supabase.auth.updateUser({
        data: { profile_id: json.patient_id, role: 'patient', ui_language: uiLang },
      })

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

        {/* ── Language bar (always visible) ────────────────────────────────── */}
        <View style={styles.langBar}>
          <Text style={styles.langBarLabel}>
            {tr('uiLanguage', uiLang)}:
          </Text>
          <View style={styles.langPickerWrap}>
            <Picker
              selectedValue={uiLang}
              onValueChange={handleUILangChange}
              style={styles.langPicker}
              itemStyle={styles.langPickerItem}
            >
              {LANGUAGES.map(l => (
                <Picker.Item key={l.code} label={`${l.native} (${l.label})`} value={l.code} />
              ))}
            </Picker>
          </View>
        </View>

        <Text style={styles.title}>Ayushpathi</Text>
        <Text style={styles.subtitle}>Patient Registration</Text>
        <Text style={styles.stepLabel}>Step {step} of 4</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* ── Step 1 — Account ─────────────────────────────────────────────── */}
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

        {/* ── Step 2 — Personal ────────────────────────────────────────────── */}
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
            <View style={styles.chipRow}>
              {GENDERS.map(g => (
                <TouchableOpacity
                  key={g}
                  style={[styles.chip, gender === g && styles.chipActive]}
                  onPress={() => setGender(g)}
                >
                  <Text style={[styles.chipText, gender === g && styles.chipTextActive]}>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={styles.input} placeholder="Mobile Number (+91...)" placeholderTextColor="#aaa"
              keyboardType="phone-pad" value={mobile} onChangeText={setMobile} />
          </View>
        )}

        {/* ── Step 3 — Address ─────────────────────────────────────────────── */}
        {step === 3 && (
          <View>
            <Text style={styles.sectionTitle}>Address</Text>
            <TextInput style={styles.input} placeholder="Street Address" placeholderTextColor="#aaa"
              value={street} onChangeText={setStreet} />
            <TextInput style={styles.input} placeholder="City" placeholderTextColor="#aaa"
              value={city} onChangeText={setCity} />
            <TextInput style={styles.input} placeholder="State" placeholderTextColor="#aaa"
              value={stateName} onChangeText={setStateName} />
            <TextInput style={styles.input} placeholder="PIN Code" placeholderTextColor="#aaa"
              keyboardType="numeric" value={pincode} onChangeText={setPincode} />
          </View>
        )}

        {/* ── Step 4 — Language Preferences ────────────────────────────────── */}
        {step === 4 && (
          <View>
            <Text style={styles.sectionTitle}>{tr('stepLanguages', uiLang)}</Text>
            <Text style={styles.langHint}>
              These help us and your doctor communicate in the right language.
            </Text>

            {/* App UI language (already set via top bar but repeatable here) */}
            <Text style={styles.label}>{tr('uiLanguage', uiLang)} *</Text>
            <View style={styles.pickerCard}>
              <Picker
                selectedValue={uiLang}
                onValueChange={handleUILangChange}
              >
                {LANGUAGES.map(l => (
                  <Picker.Item key={l.code} label={`${l.native} — ${l.label}`} value={l.code} />
                ))}
              </Picker>
            </View>

            {/* Known languages — chip multi-select */}
            <Text style={[styles.label, { marginTop: 12 }]}>{tr('knownLanguages', uiLang)} * (select all)</Text>
            <View style={styles.chipRow}>
              {LANGUAGES.map(l => (
                <TouchableOpacity
                  key={l.code}
                  style={[styles.chip, knownLangs.includes(l.code) && styles.chipActive]}
                  onPress={() => toggleKnownLang(l.code)}
                >
                  <Text style={[styles.chipText, knownLangs.includes(l.code) && styles.chipTextActive]}>
                    {l.native}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {knownLangs.length === 0 && (
              <Text style={styles.validationMsg}>Select at least one</Text>
            )}

            {/* Preferred interaction/consultation language */}
            <Text style={[styles.label, { marginTop: 12 }]}>{tr('interactionLanguage', uiLang)} *</Text>
            <View style={styles.pickerCard}>
              <Picker
                selectedValue={interactionLang}
                onValueChange={setInteractionLang}
              >
                {LANGUAGES.map(l => (
                  <Picker.Item key={l.code} label={`${l.native} — ${l.label}`} value={l.code} />
                ))}
              </Picker>
            </View>

            {interactionLang && (
              <View style={styles.tipBox}>
                <Text style={styles.tipText}>
                  💡 Doctors who speak {LANGUAGES.find(l => l.code === interactionLang)?.native} will appear first in your search.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ── Navigation buttons ────────────────────────────────────────────── */}
        {step < 4 ? (
          <TouchableOpacity style={styles.btn} onPress={nextStep}>
            <Text style={styles.btnText}>Next →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.btn} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Create Account ✓</Text>}
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

  // Language bar
  langBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 8, borderWidth: 1, borderColor: '#d0e8da',
    marginBottom: 16, paddingHorizontal: 10, paddingVertical: 2,
  },
  langBarLabel: { fontSize: 11, color: '#888', marginRight: 4 },
  langPickerWrap: { flex: 1 },
  langPicker: { height: 36 },
  langPickerItem: { fontSize: 12 },

  title: { fontSize: 22, fontWeight: '700', color: '#1a6b3a', marginBottom: 2, textAlign: 'center' },
  subtitle: { fontSize: 16, fontWeight: '600', color: '#333', textAlign: 'center', marginBottom: 2 },
  stepLabel: { fontSize: 13, color: '#888', marginBottom: 20, textAlign: 'center' },
  sectionTitle: { fontSize: 17, fontWeight: '600', color: '#333', marginBottom: 12 },
  error: { backgroundColor: '#fde8e8', color: '#c0392b', padding: 10, borderRadius: 8, marginBottom: 12, fontSize: 13 },
  validationMsg: { fontSize: 12, color: '#c0392b', marginTop: 4 },

  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#d0e8da',
    borderRadius: 10, padding: 14, fontSize: 15, color: '#222', marginBottom: 12,
  },
  label: { fontSize: 13, color: '#555', marginBottom: 6 },
  langHint: { fontSize: 12, color: '#777', marginBottom: 12 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { borderWidth: 1, borderColor: '#d0e8da', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  chipActive: { backgroundColor: '#1a6b3a', borderColor: '#1a6b3a' },
  chipText: { color: '#555', fontSize: 13 },
  chipTextActive: { color: '#fff' },

  pickerCard: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#d0e8da',
    borderRadius: 10, marginBottom: 12, overflow: 'hidden',
  },

  tipBox: { backgroundColor: '#e8f5ee', borderRadius: 8, padding: 10, marginTop: 8 },
  tipText: { fontSize: 12, color: '#1a6b3a' },

  btn: { backgroundColor: '#1a6b3a', borderRadius: 10, padding: 15, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  backBtn: { marginTop: 16, alignItems: 'center' },
  backText: { color: '#1a6b3a', fontSize: 14 },
})
