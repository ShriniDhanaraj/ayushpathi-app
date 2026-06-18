import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Link, useRouter } from 'expo-router'
import { colors } from '@/lib/colors'

const ROLES = [
  {
    href: '/(auth)/register/patient' as const,
    icon: '🧑‍⚕️',
    title: 'I am a Patient',
    desc: 'Find AYUSH doctors, book appointments, manage your health records',
  },
  {
    href: null,
    icon: '👨‍⚕️',
    title: 'I am a Doctor',
    desc: 'AYUSH practitioners — register to receive patients',
    comingSoon: true,
  },
]

export default function RegisterIndex() {
  const router = useRouter()
  return (
    <View style={styles.container}>
      <Pressable onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← Back</Text>
      </Pressable>

      <View style={styles.header}>
        <Text style={styles.logo}>🌿</Text>
        <Text style={styles.title}>Join Ayushpathi</Text>
        <Text style={styles.subtitle}>How would you like to register?</Text>
      </View>

      <View style={styles.cards}>
        {ROLES.map(r => (
          r.href ? (
            <Link key={r.title} href={r.href} asChild>
              <Pressable style={styles.roleCard}>
                <Text style={styles.roleIcon}>{r.icon}</Text>
                <View style={styles.roleText}>
                  <Text style={styles.roleTitle}>{r.title}</Text>
                  <Text style={styles.roleDesc}>{r.desc}</Text>
                </View>
                <Text style={styles.arrow}>›</Text>
              </Pressable>
            </Link>
          ) : (
            <View key={r.title} style={[styles.roleCard, styles.roleCardDisabled]}>
              <Text style={styles.roleIcon}>{r.icon}</Text>
              <View style={styles.roleText}>
                <View style={styles.roleTitleRow}>
                  <Text style={[styles.roleTitle, { color: colors.gray[400] }]}>{r.title}</Text>
                  <View style={styles.soon}><Text style={styles.soonText}>Soon</Text></View>
                </View>
                <Text style={[styles.roleDesc, { color: colors.gray[400] }]}>{r.desc}</Text>
              </View>
            </View>
          )
        ))}
      </View>

      <Text style={styles.footer}>Data stored in India · DPDP Act 2023</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.brand[50], padding: 24, gap: 32 },
  back: { paddingTop: 16 },
  backText: { fontSize: 14, color: colors.gray[500] },
  header: { alignItems: 'center', gap: 6 },
  logo: { fontSize: 40 },
  title: { fontSize: 26, fontWeight: '700', color: colors.gray[900] },
  subtitle: { fontSize: 14, color: colors.gray[500] },
  cards: { gap: 12 },
  roleCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  roleCardDisabled: { opacity: 0.6 },
  roleIcon: { fontSize: 32 },
  roleText: { flex: 1, gap: 4 },
  roleTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  roleTitle: { fontSize: 16, fontWeight: '600', color: colors.gray[900] },
  roleDesc: { fontSize: 13, color: colors.gray[500], lineHeight: 18 },
  arrow: { fontSize: 22, color: colors.gray[300] },
  soon: { backgroundColor: colors.brand[100], borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  soonText: { fontSize: 10, fontWeight: '600', color: colors.brand[700] },
  footer: { textAlign: 'center', fontSize: 11, color: colors.gray[400] },
})
