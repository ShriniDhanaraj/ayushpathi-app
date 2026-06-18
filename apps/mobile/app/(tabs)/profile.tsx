import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { supabase } from '../../lib/supabase'

export default function ProfileScreen() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setEmail(user?.email ?? '')
      setLoading(false)
    })
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}><Text style={styles.title}>Profile</Text></View>
      <View style={styles.body}>
        {loading ? (
          <ActivityIndicator color="#1a6b3a" />
        ) : (
          <>
            <Text style={styles.avatar}>👤</Text>
            <Text style={styles.email}>{email}</Text>
            <Text style={styles.sub}>Full profile editing coming soon.</Text>
            <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f7f4' },
  header: { backgroundColor: '#1a6b3a', padding: 24, paddingTop: 56 },
  title: { color: '#fff', fontSize: 20, fontWeight: '700' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  avatar: { fontSize: 64, marginBottom: 16 },
  email: { fontSize: 16, fontWeight: '600', color: '#333' },
  sub: { fontSize: 13, color: '#888', marginTop: 8, marginBottom: 32, textAlign: 'center' },
  signOutBtn: { backgroundColor: '#c0392b', borderRadius: 10, paddingHorizontal: 32, paddingVertical: 14 },
  signOutText: { color: '#fff', fontWeight: '700', fontSize: 15 },
})
