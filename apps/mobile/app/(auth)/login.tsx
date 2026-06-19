import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native'
import { Link } from 'expo-router'
import { Picker } from '@react-native-picker/picker'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../../lib/supabase'

// Supported languages (mirrors lookup_language table)
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

// Localised sign-in label for each language
const SIGN_IN_LABEL: Record<string, string> = {
  EN: 'Sign in', HI: 'साइन इन करें', TA: 'உள்நுழைக',
  TE: 'సైన్ ఇన్ చేయండి', KN: 'ಸೈನ್ ಇನ್ ಮಾಡಿ', ML: 'സൈൻ ഇൻ ചെയ്യുക',
  BN: 'সাইন ইন করুন', GU: 'સાઇન ઇન કરો', MR: 'साइन इन करा',
  PA: 'ਸਾਈਨ ਇਨ ਕਰੋ', OR: 'ସାଇନ ଇନ', AS: 'চাইন ইন কৰক',
  UR: 'سائن ان کریں', SA: 'प्रवेश करें',
}

const FRIENDLY: Record<string, string> = {
  'Invalid login credentials': 'Incorrect email or password.',
  'Email not confirmed': 'Please verify your email first.',
}

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // Pre-login language selector — changes visible label only
  const [uiLang, setUiLang] = useState('EN')

  async function handleLogin() {
    setError('')
    if (!email || !password) { setError('Please enter email and password.'); return }
    setLoading(true)

    const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password })
    if (authErr) {
      setError(FRIENDLY[authErr.message] ?? authErr.message)
      setLoading(false)
      return
    }

    const meta = data.user?.user_metadata ?? {}
    const role = meta.role ?? 'patient'

    // Derive ui_language from metadata (stored at registration) or fetch from profile
    let derivedLang: string = meta.ui_language ?? 'EN'

    if (!meta.ui_language && role === 'patient') {
      const { data: profile } = await supabase
        .from('patient')
        .select('ui_language')
        .eq('auth_user_id', data.user!.id)
        .single()
      derivedLang = profile?.ui_language ?? 'EN'
    } else if (!meta.ui_language && role?.startsWith('doctor')) {
      const { data: profile } = await supabase
        .from('doctor')
        .select('ui_language')
        .eq('auth_user_id', data.user!.id)
        .single()
      derivedLang = profile?.ui_language ?? 'EN'
    }

    // Persist derived language so the rest of the app can use it
    await AsyncStorage.setItem('ayushpathi_ui_lang', derivedLang)

    // Navigation is handled by the _layout.tsx onAuthStateChange listener
    setLoading(false)
  }

  const signInLabel = SIGN_IN_LABEL[uiLang] ?? SIGN_IN_LABEL['EN']

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>

        {/* Language selector — shown before login, no auth needed */}
        <View style={styles.langRow}>
          <Text style={styles.langLabel}>🌐</Text>
          <View style={styles.langPickerWrap}>
            <Picker
              selectedValue={uiLang}
              onValueChange={v => setUiLang(v)}
              style={styles.langPicker}
            >
              {LANGUAGES.map(l => (
                <Picker.Item key={l.code} label={`${l.native} (${l.label})`} value={l.code} />
              ))}
            </Picker>
          </View>
        </View>

        {/* App branding */}
        <Text style={styles.logo}>🌿</Text>
        <Text style={styles.title}>Ayushpathi</Text>
        <Text style={styles.subtitle}>India's AYUSH Healthcare Platform</Text>
        <Text style={styles.heading}>{signInLabel}</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#aaa"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={v => { setEmail(v); setError('') }}
        />

        <View style={styles.passwordRow}>
          <TextInput
            style={[styles.input, styles.passwordInput]}
            placeholder="Password"
            placeholderTextColor="#aaa"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={v => { setPassword(v); setError('') }}
          />
          <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(p => !p)}>
            <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>{signInLabel}</Text>}
        </TouchableOpacity>

        <Link href="/(auth)/register" asChild>
          <TouchableOpacity style={styles.link}>
            <Text style={styles.linkText}>Don't have an account? Register</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f7f4' },
  inner: { flex: 1, justifyContent: 'center', padding: 28 },

  langRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 8, borderWidth: 1, borderColor: '#d0e8da',
    marginBottom: 24, paddingHorizontal: 8,
  },
  langLabel: { fontSize: 16, marginRight: 4 },
  langPickerWrap: { flex: 1 },
  langPicker: { height: 40 },

  logo: { fontSize: 48, textAlign: 'center', marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '700', color: '#1a6b3a', textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#666', textAlign: 'center', marginBottom: 24 },
  heading: { fontSize: 22, fontWeight: '600', color: '#333', marginBottom: 16 },
  error: { backgroundColor: '#fde8e8', color: '#c0392b', padding: 10, borderRadius: 8, marginBottom: 12, fontSize: 13 },

  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#d0e8da',
    borderRadius: 10, padding: 14, fontSize: 15, color: '#222', marginBottom: 12,
  },
  passwordRow: { position: 'relative', marginBottom: 12 },
  passwordInput: { marginBottom: 0, paddingRight: 48 },
  eyeBtn: { position: 'absolute', right: 14, top: 14 },
  eyeText: { fontSize: 18 },

  btn: { backgroundColor: '#1a6b3a', borderRadius: 10, padding: 15, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  link: { marginTop: 20, alignItems: 'center' },
  linkText: { color: '#1a6b3a', fontSize: 14 },
})
