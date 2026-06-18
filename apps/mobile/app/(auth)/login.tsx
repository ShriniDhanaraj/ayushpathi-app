import { useState } from 'react'
import {
  KeyboardAvoidingView, Platform, Pressable, ScrollView,
  StyleSheet, Text, View,
} from 'react-native'
import { Link } from 'expo-router'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { colors } from '@/lib/colors'

const FRIENDLY: Record<string, string> = {
  'Invalid login credentials': 'Incorrect email or password.',
  'Email not confirmed': 'Please verify your email first.',
}

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    setLoading(true); setError('')
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (err) setError(FRIENDLY[err.message] ?? err.message)
    setLoading(false)
    // Navigation handled by root layout auth listener
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Logo / Brand */}
        <View style={styles.brand}>
          <Text style={styles.logo}>🌿</Text>
          <Text style={styles.appName}>Ayushpathi</Text>
          <Text style={styles.tagline}>India's AYUSH Healthcare Platform</Text>
        </View>

        {/* Form card */}
        <View style={styles.card}>
          <Text style={styles.title}>Sign in</Text>

          <View style={styles.fields}>
            <Input
              label="Email address"
              placeholder="you@example.com"
              value={email}
              onChangeText={t => { setEmail(t); setError('') }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <Input
              label="Password"
              placeholder="Your password"
              value={password}
              onChangeText={t => { setPassword(t); setError('') }}
              secureToggle
              autoComplete="current-password"
            />
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠ {error}</Text>
            </View>
          ) : null}

          <Button
            label="Sign in"
            onPress={handleLogin}
            loading={loading}
            disabled={!email || password.length < 8}
          />

          <Pressable style={styles.forgotRow}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </Pressable>
        </View>

        {/* Register link */}
        <View style={styles.registerRow}>
          <Text style={styles.registerText}>New to Ayushpathi? </Text>
          <Link href="/(auth)/register" asChild>
            <Pressable>
              <Text style={styles.registerLink}>Create account</Text>
            </Pressable>
          </Link>
        </View>

        <Text style={styles.footer}>
          Data stored in India · DPDP Act 2023
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.brand[50],
    padding: 24,
    justifyContent: 'center',
    gap: 24,
  },
  brand: { alignItems: 'center', gap: 4 },
  logo: { fontSize: 48 },
  appName: { fontSize: 28, fontWeight: '700', color: colors.brand[700] },
  tagline: { fontSize: 13, color: colors.gray[500] },
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 24,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  title: { fontSize: 22, fontWeight: '700', color: colors.gray[900] },
  fields: { gap: 14 },
  errorBox: {
    backgroundColor: colors.red[50],
    borderWidth: 1,
    borderColor: colors.red[200],
    borderRadius: 10,
    padding: 12,
  },
  errorText: { fontSize: 13, color: colors.red[700] },
  forgotRow: { alignItems: 'center' },
  forgotText: { fontSize: 13, color: colors.brand[600] },
  registerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  registerText: { fontSize: 14, color: colors.gray[500] },
  registerLink: { fontSize: 14, fontWeight: '600', color: colors.brand[600] },
  footer: { textAlign: 'center', fontSize: 11, color: colors.gray[400] },
})
