import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native'

export default function HospitalAdminMobileScreen() {
  return (
    <View style={s.container}>
      <Text style={s.icon}>🏥</Text>
      <Text style={s.title}>Hospital Admin</Text>
      <Text style={s.sub}>
        The full admin dashboard is available on the web at rasbros.com/hospital-admin
      </Text>
      <TouchableOpacity
        style={s.btn}
        onPress={() => Linking.openURL('https://rasbros.com/hospital-admin')}
      >
        <Text style={s.btnText}>Open Web Dashboard</Text>
      </TouchableOpacity>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#F9FAFB' },
  icon: { fontSize: 56, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#166534', marginBottom: 8 },
  sub: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  btn: { backgroundColor: '#16A34A', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
})
