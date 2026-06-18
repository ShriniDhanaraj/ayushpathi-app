import { View, Text, StyleSheet } from 'react-native'

export default function RecordsScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}><Text style={styles.title}>Health Records</Text></View>
      <View style={styles.body}>
        <Text style={styles.icon}>📋</Text>
        <Text style={styles.msg}>Your health records</Text>
        <Text style={styles.sub}>Records and health profile coming in the next update.</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f7f4' },
  header: { backgroundColor: '#1a6b3a', padding: 24, paddingTop: 56 },
  title: { color: '#fff', fontSize: 20, fontWeight: '700' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  icon: { fontSize: 48, marginBottom: 16 },
  msg: { fontSize: 18, fontWeight: '600', color: '#333', textAlign: 'center' },
  sub: { fontSize: 13, color: '#888', textAlign: 'center', marginTop: 8 },
})
