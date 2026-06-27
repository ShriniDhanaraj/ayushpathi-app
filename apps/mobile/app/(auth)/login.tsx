import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native'
import { Link } from 'expo-router'
import { Picker } from '@react-native-picker/picker'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../../lib/supabase'
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'

// ── Languages ─────────────────────────────────────────────────────────────────
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

// ── Per-language UI strings (OTP flow) ────────────────────────────────────────
const UI: Record<string, {
  signIn: string; mobilePrompt: string; getOtp: string; sending: string;
  enterOtp: string; verify: string; verifying: string; resend: string;
  staffLogin: string; patientLogin: string
}> = {
  EN: { signIn:'Sign in', mobilePrompt:'Mobile number (WhatsApp)', getOtp:'Get OTP on WhatsApp',
        sending:'Sending…', enterOtp:'Enter 6-digit OTP', verify:'Verify & Login',
        verifying:'Verifying…', resend:'Resend OTP', staffLogin:'Staff login (email & password)',
        patientLogin:'Patient login (WhatsApp OTP)' },
  HI: { signIn:'साइन इन', mobilePrompt:'मोबाइल नंबर (WhatsApp)', getOtp:'WhatsApp पर OTP पाएं',
        sending:'भेज रहे हैं…', enterOtp:'6-अंकीय OTP दर्ज करें', verify:'सत्यापित करें',
        verifying:'सत्यापित हो रहा है…', resend:'OTP दोबारा भेजें', staffLogin:'स्टाफ लॉगिन (ईमेल)',
        patientLogin:'मरीज़ लॉगिन (WhatsApp OTP)' },
  TA: { signIn:'உள்நுழைக', mobilePrompt:'மொபைல் எண் (WhatsApp)', getOtp:'WhatsApp-ல் OTP பெறுக',
        sending:'அனுப்புகிறோம்…', enterOtp:'6-இலக்க OTP உள்ளிடுக', verify:'சரிபார்க்க',
        verifying:'சரிபார்க்கிறோம்…', resend:'OTP மீண்டும் அனுப்பு', staffLogin:'ஊழியர் உள்நுழைவு',
        patientLogin:'நோயாளி உள்நுழைவு (WhatsApp OTP)' },
  TE: { signIn:'సైన్ ఇన్', mobilePrompt:'మొబైల్ నంబర్ (WhatsApp)', getOtp:'WhatsApp లో OTP పొందండి',
        sending:'పంపుతున్నాం…', enterOtp:'6-అంకెల OTP నమోదు చేయండి', verify:'ధృవీకరించండి',
        verifying:'ధృవీకరిస్తున్నాం…', resend:'OTP మళ్లీ పంపండి', staffLogin:'సిబ్బంది లాగిన్',
        patientLogin:'రోగి లాగిన్ (WhatsApp OTP)' },
  KN: { signIn:'ಸೈನ್ ಇನ್', mobilePrompt:'ಮೊಬೈಲ್ ಸಂಖ್ಯೆ (WhatsApp)', getOtp:'WhatsApp ನಲ್ಲಿ OTP ಪಡೆಯಿರಿ',
        sending:'ಕಳುಹಿಸಲಾಗುತ್ತಿದೆ…', enterOtp:'6-ಅಂಕಿಯ OTP ನಮೂದಿಸಿ', verify:'ಪರಿಶೀಲಿಸಿ',
        verifying:'ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ…', resend:'OTP ಮರಳಿ ಕಳುಹಿಸಿ', staffLogin:'ಸಿಬ್ಬಂದಿ ಲಾಗಿನ್',
        patientLogin:'ರೋಗಿ ಲಾಗಿನ್ (WhatsApp OTP)' },
  ML: { signIn:'സൈൻ ഇൻ', mobilePrompt:'മൊബൈൽ നമ്പർ (WhatsApp)', getOtp:'WhatsApp-ൽ OTP നേടുക',
        sending:'അയക്കുന്നു…', enterOtp:'6-അക്ക OTP നൽകുക', verify:'സ്ഥിരീകരിക്കുക',
        verifying:'സ്ഥിരീകരിക്കുന്നു…', resend:'OTP വീണ്ടും അയക്കുക', staffLogin:'ജീവനക്കാർ ലോഗിൻ',
        patientLogin:'രോഗി ലോഗിൻ (WhatsApp OTP)' },
  BN: { signIn:'সাইন ইন', mobilePrompt:'মোবাইল নম্বর (WhatsApp)', getOtp:'WhatsApp-এ OTP পান',
        sending:'পাঠানো হচ্ছে…', enterOtp:'6-সংখ্যার OTP দিন', verify:'যাচাই করুন',
        verifying:'যাচাই হচ্ছে…', resend:'OTP আবার পাঠান', staffLogin:'স্টাফ লগইন',
        patientLogin:'রোগী লগইন (WhatsApp OTP)' },
  GU: { signIn:'સાઇન ઇન', mobilePrompt:'મોબાઇલ નંબર (WhatsApp)', getOtp:'WhatsApp પર OTP મેળવો',
        sending:'મોકલી રહ્યા છીએ…', enterOtp:'6-અંકનો OTP દાખલ કરો', verify:'ચકાસો',
        verifying:'ચકાસી રહ્યા છીએ…', resend:'OTP ફરીથી મોકલો', staffLogin:'સ્ટાફ લૉગિન',
        patientLogin:'દર્દી લૉગિન (WhatsApp OTP)' },
  MR: { signIn:'साइन इन', mobilePrompt:'मोबाइल नंबर (WhatsApp)', getOtp:'WhatsApp वर OTP मिळवा',
        sending:'पाठवत आहोत…', enterOtp:'6-अंकी OTP टाका', verify:'पडताळा',
        verifying:'पडताळत आहोत…', resend:'OTP पुन्हा पाठवा', staffLogin:'कर्मचारी लॉगिन',
        patientLogin:'रुग्ण लॉगिन (WhatsApp OTP)' },
}

function ui(lang: string) {
  return UI[lang] ?? UI['EN']
}

const FRIENDLY: Record<string, string> = {
  'Invalid login credentials': 'Incorrect email or password.',
  'Email not confirmed': 'Please verify your email first.',
  'Phone not confirmed': 'OTP verification failed. Try again.',
  'Token has expired or is invalid': 'OTP expired or incorrect. Request a new one.',
}

async function registerPushToken(userId: string) {
  try {
    if (!Device.isDevice) return
    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }
    if (finalStatus !== 'granted') return
    const tokenData = await Notifications.getExpoPushTokenAsync()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await fetch(`${process.env.EXPO_PUBLIC_API_URL ?? 'https://www.rasbros.com'}/api/push/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, token: tokenData.data, platform: 'expo' }),
    })
  } catch {}
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function LoginScreen() {
  const [uiLang, setUiLang] = useState('EN')

  // Mode: 'patient' (phone+OTP) | 'staff' (email+password)
  const [mode, setMode] = useState<'patient' | 'staff'>('patient')

  // Patient OTP flow
  const [phone, setPhone]       = useState('')         // 10-digit, no +91
  const [otpSent, setOtpSent]   = useState(false)
  const [otp, setOtp]           = useState('')
  const [resendTimer, setResendTimer] = useState(0)   // countdown seconds

  // Staff email+password flow
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)

  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const s = ui(uiLang)

  // ── Send OTP ────────────────────────────────────────────────────────────────
  async function handleSendOtp() {
    setError('')
    const digits = phone.replace(/\D/g, '')
    if (digits.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.')
      return
    }
    setLoading(true)
    const { error: authErr } = await supabase.auth.signInWithOtp({
      phone: `+91${digits}`,
    })
    setLoading(false)
    if (authErr) {
      setError(authErr.message)
      return
    }
    setOtpSent(true)
    startResendTimer()
  }

  // ── Verify OTP ──────────────────────────────────────────────────────────────
  async function handleVerifyOtp() {
    setError('')
    if (otp.length !== 6) { setError('Enter the 6-digit OTP from WhatsApp.'); return }
    setLoading(true)
    const digits = phone.replace(/\D/g, '')
    const { data, error: authErr } = await supabase.auth.verifyOtp({
      phone: `+91${digits}`,
      token: otp,
      type: 'sms',
    })
    if (authErr) {
      setError(FRIENDLY[authErr.message] ?? authErr.message)
      setLoading(false)
      return
    }
    // Persist lang preference
    await AsyncStorage.setItem('ayushpathi_ui_lang', uiLang)
    if (data.user) registerPushToken(data.user.id)
    // Navigation handled by _layout.tsx onAuthStateChange
    setLoading(false)
  }

  // ── Resend timer ─────────────────────────────────────────────────────────────
  function startResendTimer() {
    setResendTimer(60)
    const interval = setInterval(() => {
      setResendTimer(t => {
        if (t <= 1) { clearInterval(interval); return 0 }
        return t - 1
      })
    }, 1000)
  }

  async function handleResend() {
    setOtp('')
    setError('')
    setOtpSent(false)
    await handleSendOtp()
  }

  // ── Staff email+password login ───────────────────────────────────────────────
  async function handleStaffLogin() {
    setError('')
    if (!email || !password) { setError('Please enter email and password.'); return }
    setLoading(true)
    const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password })
    if (authErr) {
      setError(FRIENDLY[authErr.message] ?? authErr.message)
      setLoading(false)
      return
    }
    // Persist derived UI language
    const meta = data.user?.user_metadata ?? {}
    let derivedLang = meta.ui_language ?? 'EN'
    if (!meta.ui_language) {
      const role = meta.role ?? 'unknown'
      if (role === 'patient') {
        const { data: p } = await supabase.from('patient').select('ui_language').eq('auth_user_id', data.user!.id).single()
        derivedLang = p?.ui_language ?? 'EN'
      } else if (role?.startsWith('doctor')) {
        const { data: d } = await supabase.from('doctor').select('ui_language').eq('auth_user_id', data.user!.id).single()
        derivedLang = d?.ui_language ?? 'EN'
      }
    }
    await AsyncStorage.setItem('ayushpathi_ui_lang', derivedLang)
    if (data.user) registerPushToken(data.user.id)
    setLoading(false)
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.inner}>

        {/* Language picker */}
        <View style={styles.langRow}>
          <Text style={styles.langLabel}>🌐</Text>
          <View style={styles.langPickerWrap}>
            <Picker selectedValue={uiLang} onValueChange={v => setUiLang(v)} style={styles.langPicker}>
              {LANGUAGES.map(l => (
                <Picker.Item key={l.code} label={`${l.native} (${l.label})`} value={l.code} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Branding */}
        <Text style={styles.logo}>🌿</Text>
        <Text style={styles.title}>Ayushpathi</Text>
        <Text style={styles.subtitle}>India's AYUSH Healthcare Platform</Text>
        <Text style={styles.heading}>{s.signIn}</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* ── PATIENT: phone + OTP ─────────────────────────────────────── */}
        {mode === 'patient' && (
          <>
            {!otpSent ? (
              <>
                <View style={styles.phoneRow}>
                  <View style={styles.countryCode}>
                    <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
                  </View>
                  <TextInput
                    style={[styles.input, styles.phoneInput]}
                    placeholder={s.mobilePrompt}
                    placeholderTextColor="#aaa"
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={phone}
                    onChangeText={v => { setPhone(v.replace(/\D/g, '')); setError('') }}
                  />
                </View>

                <TouchableOpacity style={styles.btn} onPress={handleSendOtp} disabled={loading}>
                  {loading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.btnText}>💬 {s.getOtp}</Text>}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.otpSentBanner}>
                  <Text style={styles.otpSentText}>
                    ✅ OTP sent to +91 {phone} via WhatsApp
                  </Text>
                </View>

                <TextInput
                  style={[styles.input, styles.otpInput]}
                  placeholder={s.enterOtp}
                  placeholderTextColor="#aaa"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otp}
                  onChangeText={v => { setOtp(v.replace(/\D/g, '')); setError('') }}
                />

                <TouchableOpacity style={styles.btn} onPress={handleVerifyOtp} disabled={loading}>
                  {loading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.btnText}>{s.verify}</Text>}
                </TouchableOpacity>

                {/* Resend timer */}
                <TouchableOpacity
                  style={[styles.resendBtn, resendTimer > 0 && styles.resendDisabled]}
                  onPress={handleResend}
                  disabled={resendTimer > 0 || loading}
                >
                  <Text style={[styles.resendText, resendTimer > 0 && styles.resendDisabledText]}>
                    {resendTimer > 0 ? `${s.resend} (${resendTimer}s)` : s.resend}
                  </Text>
                </TouchableOpacity>

                {/* Change number */}
                <TouchableOpacity onPress={() => { setOtpSent(false); setOtp(''); setError('') }}>
                  <Text style={styles.changeNumber}>Change number</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        )}

        {/* ── STAFF: email + password ──────────────────────────────────── */}
        {mode === 'staff' && (
          <>
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
                secureTextEntry={!showPass}
                value={password}
                onChangeText={v => { setPassword(v); setError('') }}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPass(p => !p)}>
                <Text style={styles.eyeText}>{showPass ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.btn} onPress={handleStaffLogin} disabled={loading}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>{s.signIn}</Text>}
            </TouchableOpacity>
          </>
        )}

        {/* Mode toggle */}
        <TouchableOpacity
          style={styles.modeToggle}
          onPress={() => { setMode(m => m === 'patient' ? 'staff' : 'patient'); setError('') }}
        >
          <Text style={styles.modeToggleText}>
            {mode === 'patient' ? s.staffLogin : s.patientLogin}
          </Text>
        </TouchableOpacity>

        {/* Register link */}
        <Link href="/(auth)/register" asChild>
          <TouchableOpacity style={styles.link}>
            <Text style={styles.linkText}>Don't have an account? Register</Text>
          </TouchableOpacity>
        </Link>

      </View>
    </KeyboardAvoidingView>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#f0f7f4' },
  inner:      { flex: 1, justifyContent: 'center', padding: 28 },

  langRow:        { flexDirection:'row', alignItems:'center', backgroundColor:'#fff', borderRadius:8, borderWidth:1, borderColor:'#d0e8da', marginBottom:24, paddingHorizontal:8 },
  langLabel:      { fontSize:16, marginRight:4 },
  langPickerWrap: { flex:1 },
  langPicker:     { height:40 },

  logo:     { fontSize:48, textAlign:'center', marginBottom:4 },
  title:    { fontSize:28, fontWeight:'700', color:'#1a6b3a', textAlign:'center' },
  subtitle: { fontSize:13, color:'#666', textAlign:'center', marginBottom:24 },
  heading:  { fontSize:22, fontWeight:'600', color:'#333', marginBottom:16 },
  error:    { backgroundColor:'#fde8e8', color:'#c0392b', padding:10, borderRadius:8, marginBottom:12, fontSize:13 },

  // Phone input
  phoneRow:        { flexDirection:'row', alignItems:'center', marginBottom:12 },
  countryCode:     { backgroundColor:'#fff', borderWidth:1, borderColor:'#d0e8da', borderRadius:10, paddingHorizontal:12, paddingVertical:14, marginRight:8 },
  countryCodeText: { fontSize:15, color:'#222', fontWeight:'600' },
  phoneInput:      { flex:1, marginBottom:0 },

  // OTP
  otpSentBanner: { backgroundColor:'#e8f5e9', borderRadius:8, padding:10, marginBottom:12 },
  otpSentText:   { fontSize:12, color:'#2e7d32', textAlign:'center' },
  otpInput:      { textAlign:'center', fontSize:24, fontWeight:'700', letterSpacing:8 },

  resendBtn:         { marginTop:12, alignItems:'center', padding:8 },
  resendDisabled:    { opacity:0.5 },
  resendText:        { color:'#1a6b3a', fontSize:14, fontWeight:'600' },
  resendDisabledText:{ color:'#999' },
  changeNumber:      { textAlign:'center', color:'#888', fontSize:13, marginTop:8 },

  // Shared inputs
  input:         { backgroundColor:'#fff', borderWidth:1, borderColor:'#d0e8da', borderRadius:10, padding:14, fontSize:15, color:'#222', marginBottom:12 },
  passwordRow:   { position:'relative', marginBottom:12 },
  passwordInput: { marginBottom:0, paddingRight:48 },
  eyeBtn:        { position:'absolute', right:14, top:14 },
  eyeText:       { fontSize:18 },

  btn:     { backgroundColor:'#1a6b3a', borderRadius:10, padding:15, alignItems:'center', marginTop:8 },
  btnText: { color:'#fff', fontWeight:'700', fontSize:16 },

  modeToggle:     { marginTop:20, alignItems:'center', padding:8 },
  modeToggleText: { color:'#1a6b3a', fontSize:13, textDecorationLine:'underline' },

  link:     { marginTop:12, alignItems:'center' },
  linkText: { color:'#1a6b3a', fontSize:14 },
})
