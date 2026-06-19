/**
 * WhatsApp Support Button — mobile
 * Resolves the correct WA number for the current user and opens WhatsApp.
 * Used as a header button or floating action on any screen.
 */
import React, { useState } from 'react'
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native'
import { supabase } from '../lib/supabase'
import { resolveAndOpenSupportWA } from '../lib/whatsapp'

interface Props {
  /** Optional custom message pre-filled in WhatsApp */
  message?: string
  /** 'icon' = just the 💬, 'pill' = green pill with label */
  variant?: 'icon' | 'pill'
}

export default function WhatsAppSupportButton({
  message = 'Hi! I need help with my Ayushpathi account.',
  variant = 'icon',
}: Props) {
  const [loading, setLoading] = useState(false)

  async function handlePress() {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        Alert.alert('Not signed in', 'Please log in first.')
        return
      }
      await resolveAndOpenSupportWA(session.access_token, message)
    } catch (e) {
      Alert.alert('Error', 'Could not open WhatsApp.')
    } finally {
      setLoading(false)
    }
  }

  if (variant === 'pill') {
    return (
      <TouchableOpacity onPress={handlePress} disabled={loading} style={s.pill}>
        {loading
          ? <ActivityIndicator color="#fff" size="small" />
          : <Text style={s.pillText}>💬 WhatsApp Support</Text>
        }
      </TouchableOpacity>
    )
  }

  return (
    <TouchableOpacity onPress={handlePress} disabled={loading} style={s.icon}>
      {loading
        ? <ActivityIndicator color="#25D366" size="small" />
        : <Text style={s.iconText}>💬</Text>
      }
    </TouchableOpacity>
  )
}

const s = StyleSheet.create({
  icon: { padding: 8 },
  iconText: { fontSize: 24 },
  pill: {
    backgroundColor: '#25D366', borderRadius: 24,
    paddingHorizontal: 16, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  pillText: { color: '#fff', fontWeight: '700', fontSize: 14 },
})
