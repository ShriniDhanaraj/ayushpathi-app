import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native'
import { Link } from 'expo-router'
import { supabase } from '../../lib/supabase'

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

  async function handleLogin() {
    setError('')
    if (!email || !password) { setError('Please enter email and password.'); return }
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) setError(FRIENDLY[error.message] ?? error.message)
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <Text style={styles.logo}>🌿</Text>
        <Text style={styles.title}>Ayushpathi</Text>
        <Text style={styles.subtitle}>India's AYUSH Healthcare Platform</Text>
        <Text style={styles.heading}>Sign in</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#aaa"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <View style={styles.passwordRow}>
          <TextInput
            style={[styles.input, styles.passwordInput]}
            placeholder="Password"
            placeholderTextColor="#aaa"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(p => !p)}>
            <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Sign in</Text>}
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
  logo: { fontSize: 48, textAlign: 'center', marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '700', color: '#1a6b3a', textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#666', textAlign: 'center', marginBottom: 32 },
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
  btn: {
    backgroundColor: '#1a6b3a', borderRadius: 10, padding: 15,
    alignItems: 'center', marginTop: 8,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  link: { marginTop: 20, alignItems: 'center' },
  linkText: { color: '#1a6b3a', fontSize: 14 },
})
