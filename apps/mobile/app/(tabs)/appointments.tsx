import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors } from '@/lib/colors'

export default function AppointmentsScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.gray[50] }}>
      <View style={s.center}>
        <Text style={s.emoji}>🚧</Text>
        <Text style={s.title}>Appointments</Text>
        <Text style={s.sub}>Coming soon in Phase 2</Text>
      </View>
    </SafeAreaView>
  )
}
const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emoji: { fontSize: 48 },
  title: { fontSize: 20, fontWeight: '700', color: colors.gray[900] },
  sub: { fontSize: 14, color: colors.gray[400] },
})
