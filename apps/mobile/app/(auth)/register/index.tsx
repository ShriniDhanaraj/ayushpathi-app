import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Link } from 'expo-router'

export default function RegisterIndex() {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>🌿</Text>
      <Text style={styles.title}>Join Ayushpathi</Text>
      <Text style={styles.sub}>Choose your role to get started</Text>

      <Link href="/(auth)/register/patient" asChild>
        <TouchableOpacity style={styles.card}>
          <Text style={styles.cardIcon}>🏥</Text>
          <View>
            <Text style={styles.cardTitle}>Patient</Text>
            <Text style={styles.cardSub}>Find AYUSH doctors &amp; book consultations</Text>
          </View>
        </TouchableOpacity>
      </Link>

      <View style={[styles.card, styles.cardDisabled]}>
        <Text style={styles.cardIcon}>👨‍⚕️</Text>
        <View>
          <Text style={styles.cardTitle}>Doctor</Text>
          <Text style={styles.cardSub}>Coming soon — register via web</Text>
        </View>
      </View>

      <Link href="/(auth)/login" asChild>
        <TouchableOpacity style={styles.link}>
          <Text style={styles.linkText}>Already have an account? Sign in</Text>
        </TouchableOpacity>
      </Link>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f7f4', padding: 28, justifyContent: 'center' },
  logo: { fontSize: 44, textAlign: 'center', marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '700', color: '#1a6b3a', textAlign: 'center' },
  sub: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 32 },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 12, padding: 18, marginBottom: 16,
    borderWidth: 1, borderColor: '#d0e8da', gap: 16,
  },
  cardDisabled: { opacity: 0.5 },
  cardIcon: { fontSize: 32 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#1a6b3a' },
  cardSub: { fontSize: 12, color: '#888', marginTop: 2 },
  link: { marginTop: 24, alignItems: 'center' },
  linkText: { color: '#1a6b3a', fontSize: 14 },
})
