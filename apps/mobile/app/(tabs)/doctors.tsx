import { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native'
import { useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as Location from 'expo-location'
import { supabase } from '../../lib/supabase'

const WEB_API = 'https://rasbros.com'

const SPEC: Record<string, string> = {
  AYU: 'Ayurveda', YOG: 'Yoga & Naturopathy', UNA: 'Unani', SID: 'Siddha', HOM: 'Homeopathy',
}

interface ConsentedDoctor {
  id: string
  status: 'ACTIVE' | 'REVOKED'
  share_full_history: boolean
  consented_at: string
  revoked_at: string | null
  doctor: { id: string; first_name: string; last_name: string; ayush_specialization: string; mobile: string | null } | null
}

interface NearbyDoctor {
  id: string; first_name: string; last_name: string
  ayush_specialization: string; distance_km: number
  city: string | null; state: string | null
}

export default function DoctorsScreen() {
  const [tab, setTab] = useState<'my' | 'nearby'>('my')
  const [patientId, setPatientId] = useState('')
  const [consents, setConsents] = useState<ConsentedDoctor[]>([])
  const [nearbyDoctors, setNearbyDoctors] = useState<NearbyDoctor[]>([])
  const [loading, setLoading] = useState(true)
  const [locationLoading, setLocationLoading] = useState(false)
  const [locationError, setLocationError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [revoking, setRevoking] = useState<string | null>(null)

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: patient } = await supabase
      .from('patient').select('id').eq('auth_user_id', user.id).single()
    if (!patient) { setLoading(false); return }
    setPatientId(patient.id)

    const { data } = await supabase
      .from('patient_doctor_consent')
      .select('id, status, share_full_history, consented_at, revoked_at, doctor:doctor_id(id, first_name, last_name, ayush_specialization, mobile)')
      .eq('patient_id', patient.id)
      .order('consented_at', { ascending: false })

    setConsents((data ?? []).map(c => ({
      ...c,
      doctor: Array.isArray(c.doctor) ? c.doctor[0] ?? null : c.doctor,
    })) as unknown as ConsentedDoctor[])

    setLoading(false)
  }

  useFocusEffect(useCallback(() => { load() }, []))

  async function onRefresh() {
    setRefreshing(true); await load(); setRefreshing(false)
  }

  async function revokeConsent(consentId: string, doctorName: string) {
    Alert.alert(
      'Revoke access',
      `Dr. ${doctorName} will immediately lose access to your health records. You can re-consent at any time.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke', style: 'destructive',
          onPress: async () => {
            setRevoking(consentId)
            const { error } = await supabase
              .from('patient_doctor_consent')
              .update({ status: 'REVOKED', revoked_at: new Date().toISOString() })
              .eq('id', consentId)
            if (error) Alert.alert('Error', error.message)
            else await load()
            setRevoking(null)
          },
        },
      ]
    )
  }

  async function reGrantConsent(consentId: string) {
    const { error } = await supabase
      .from('patient_doctor_consent')
      .update({ status: 'ACTIVE', revoked_at: null, consented_at: new Date().toISOString() })
      .eq('id', consentId)
    if (error) Alert.alert('Error', error.message)
    else await load()
  }

  async function findNearby() {
    setLocationLoading(true); setLocationError(''); setNearbyDoctors([])
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        setLocationError('Location permission denied. Enable it in Settings to find nearby doctors.')
        setLocationLoading(false); return
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      const { latitude: lat, longitude: lng } = loc.coords
      const res = await fetch(`${WEB_API}/api/doctors/near-me?lat=${lat}&lng=${lng}&radius=20`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Search failed')
      setNearbyDoctors(json.doctors ?? [])
      if ((json.doctors ?? []).length === 0) setLocationError('No verified AYUSH doctors found within 20 km.')
    } catch (e: any) {
      setLocationError(e.message ?? 'Could not find nearby doctors.')
    } finally {
      setLocationLoading(false)
    }
  }

  const activeConsents  = consents.filter(c => c.status === 'ACTIVE')
  const revokedConsents = consents.filter(c => c.status === 'REVOKED')

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Doctors</Text>
        <Text style={styles.headerSub}>You control who sees your health data</Text>
      </View>

      {/* Tab switcher */}
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tabBtn, tab === 'my' && styles.tabBtnActive]} onPress={() => setTab('my')}>
          <Text style={[styles.tabText, tab === 'my' && styles.tabTextActive]}>
            My Doctors {activeConsents.length > 0 ? `(${activeConsents.length})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, tab === 'nearby' && styles.tabBtnActive]} onPress={() => setTab('nearby')}>
          <Text style={[styles.tabText, tab === 'nearby' && styles.tabTextActive]}>Find Near Me</Text>
        </TouchableOpacity>
      </View>

      {tab === 'my' ? (
        <ScrollView
          style={styles.body}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1a6b3a" />}
        >
          {loading ? (
            <ActivityIndicator color="#1a6b3a" style={{ marginTop: 40 }} />
          ) : (
            <>
              <View style={styles.privacyBanner}>
                <Ionicons name="shield-checkmark-outline" size={14} color="#1a6b3a" />
                <Text style={styles.privacyText}>Revoking access is instant. The doctor loses visibility of your records immediately.</Text>
              </View>

              {activeConsents.length === 0 && revokedConsents.length === 0 && (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyIcon}>👨‍⚕️</Text>
                  <Text style={styles.emptyTitle}>No doctor relationships yet</Text>
                  <Text style={styles.emptySub}>When you book an appointment and the doctor requests access to your records, they'll appear here.</Text>
                </View>
              )}

              {activeConsents.length > 0 && (
                <>
                  <Text style={styles.groupLabel}>ACTIVE ACCESS</Text>
                  {activeConsents.map(c => (
                    <ConsentCard
                      key={c.id} consent={c}
                      onRevoke={() => revokeConsent(c.id, `${c.doctor?.first_name} ${c.doctor?.last_name}`)}
                      revoking={revoking === c.id}
                    />
                  ))}
                </>
              )}

              {revokedConsents.length > 0 && (
                <>
                  <Text style={[styles.groupLabel, { marginTop: 20 }]}>REVOKED</Text>
                  {revokedConsents.map(c => (
                    <ConsentCard
                      key={c.id} consent={c}
                      onReGrant={() => reGrantConsent(c.id)}
                      revoking={false}
                    />
                  ))}
                </>
              )}
            </>
          )}
          <View style={{ height: 48 }} />
        </ScrollView>
      ) : (
        <ScrollView style={styles.body}>
          <View style={styles.nearbyIntro}>
            <Text style={styles.nearbyTitle}>Find AYUSH doctors near you</Text>
            <Text style={styles.nearbySub}>Uses your current location to find verified doctors within 20 km.</Text>
            <TouchableOpacity
              style={[styles.locateBtn, locationLoading && styles.locateBtnDisabled]}
              onPress={findNearby} disabled={locationLoading}
            >
              {locationLoading
                ? <ActivityIndicator color="#fff" size="small" />
                : <><Ionicons name="navigate-outline" size={16} color="#fff" /><Text style={styles.locateBtnText}>Find Doctors Near Me</Text></>}
            </TouchableOpacity>
          </View>

          {locationError ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color="#c0392b" />
              <Text style={styles.errorText}>{locationError}</Text>
            </View>
          ) : null}

          {nearbyDoctors.length > 0 && (
            <>
              <Text style={styles.groupLabel}>{nearbyDoctors.length} DOCTOR{nearbyDoctors.length !== 1 ? 'S' : ''} FOUND</Text>
              {nearbyDoctors.map(doc => (
                <View key={doc.id} style={styles.nearbyCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.nearbyName}>Dr. {doc.first_name} {doc.last_name}</Text>
                    <Text style={styles.nearbySpec}>{SPEC[doc.ayush_specialization] ?? doc.ayush_specialization}</Text>
                    {(doc.city || doc.state) && (
                      <Text style={styles.nearbyLocation}>
                        <Ionicons name="location-outline" size={11} color="#888" /> {[doc.city, doc.state].filter(Boolean).join(', ')}
                      </Text>
                    )}
                  </View>
                  <View style={styles.distanceBadge}>
                    <Text style={styles.distanceText}>{doc.distance_km.toFixed(1)} km</Text>
                  </View>
                </View>
              ))}
            </>
          )}
          <View style={{ height: 48 }} />
        </ScrollView>
      )}
    </View>
  )
}

// ──────────────────────────────────────────────────────────────
// Consent card
// ──────────────────────────────────────────────────────────────
function ConsentCard({
  consent, onRevoke, onReGrant, revoking,
}: {
  consent: ConsentedDoctor
  onRevoke?: () => void
  onReGrant?: () => void
  revoking: boolean
}) {
  const doc = consent.doctor
  const isActive = consent.status === 'ACTIVE'
  const dateStr = new Date(consent.consented_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  return (
    <View style={[styles.consentCard, !isActive && styles.consentCardRevoked]}>
      <View style={styles.consentTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.consentName}>Dr. {doc?.first_name} {doc?.last_name}</Text>
          <Text style={styles.consentSpec}>{SPEC[doc?.ayush_specialization ?? ''] ?? ''}</Text>
          <Text style={styles.consentDate}>{isActive ? `Consented ${dateStr}` : `Revoked`}</Text>
        </View>
        <View style={[styles.statusDot, { backgroundColor: isActive ? '#27ae60' : '#bbb' }]} />
      </View>
      {consent.share_full_history && isActive && (
        <View style={styles.fullHistoryBadge}>
          <Ionicons name="eye-outline" size={12} color="#1a56db" />
          <Text style={styles.fullHistoryText}>Full history access</Text>
        </View>
      )}
      <View style={styles.consentActions}>
        {isActive && onRevoke ? (
          <TouchableOpacity style={styles.revokeBtn} onPress={onRevoke} disabled={revoking}>
            {revoking
              ? <ActivityIndicator color="#c0392b" size="small" />
              : <Text style={styles.revokeBtnText}>Revoke Access</Text>}
          </TouchableOpacity>
        ) : !isActive && onReGrant ? (
          <TouchableOpacity style={styles.regrantBtn} onPress={onReGrant}>
            <Text style={styles.regrantBtnText}>Re-grant Access</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f7f4' },
  header: { backgroundColor: '#1a6b3a', paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '700' },
  headerSub: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 3 },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e0ede6' },
  tabBtn: { flex: 1, paddingVertical: 13, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: '#1a6b3a' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#999' },
  tabTextActive: { color: '#1a6b3a' },
  body: { flex: 1 },
  privacyBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#e8f5ee', margin: 16, borderRadius: 8, padding: 10 },
  privacyText: { fontSize: 12, color: '#1a6b3a', flex: 1, lineHeight: 16 },
  groupLabel: { fontSize: 11, fontWeight: '700', color: '#888', letterSpacing: 0.8, marginHorizontal: 16, marginBottom: 8, marginTop: 4 },
  emptyBox: { alignItems: 'center', padding: 48 },
  emptyIcon: { fontSize: 44, marginBottom: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#555' },
  emptySub: { fontSize: 13, color: '#aaa', textAlign: 'center', marginTop: 6, lineHeight: 20 },
  consentCard: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 10, borderRadius: 14, borderWidth: 1, borderColor: '#d0e8da', padding: 14 },
  consentCardRevoked: { opacity: 0.7, borderColor: '#ddd' },
  consentTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  consentName: { fontSize: 15, fontWeight: '700', color: '#1a6b3a' },
  consentSpec: { fontSize: 13, color: '#555', marginTop: 2 },
  consentDate: { fontSize: 11, color: '#aaa', marginTop: 3 },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  fullHistoryBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#e8f0fe', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 10 },
  fullHistoryText: { fontSize: 11, color: '#1a56db', fontWeight: '600' },
  consentActions: { borderTopWidth: 1, borderTopColor: '#f0f7f4', paddingTop: 10 },
  revokeBtn: { borderWidth: 1, borderColor: '#e74c3c', borderRadius: 8, padding: 8, alignItems: 'center' },
  revokeBtnText: { color: '#e74c3c', fontWeight: '600', fontSize: 13 },
  regrantBtn: { borderWidth: 1, borderColor: '#1a6b3a', borderRadius: 8, padding: 8, alignItems: 'center' },
  regrantBtnText: { color: '#1a6b3a', fontWeight: '600', fontSize: 13 },
  nearbyIntro: { margin: 16, backgroundColor: '#fff', borderRadius: 14, padding: 18, borderWidth: 1, borderColor: '#d0e8da' },
  nearbyTitle: { fontSize: 16, fontWeight: '700', color: '#1a6b3a', marginBottom: 6 },
  nearbySub: { fontSize: 13, color: '#666', lineHeight: 18, marginBottom: 14 },
  locateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#1a6b3a', borderRadius: 10, padding: 13 },
  locateBtnDisabled: { opacity: 0.6 },
  locateBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  errorBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#fde8e8', margin: 16, borderRadius: 8, padding: 12 },
  errorText: { fontSize: 13, color: '#c0392b', flex: 1, lineHeight: 18 },
  nearbyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 10, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#d0e8da' },
  nearbyName: { fontSize: 15, fontWeight: '700', color: '#1a6b3a' },
  nearbySpec: { fontSize: 13, color: '#555', marginTop: 2 },
  nearbyLocation: { fontSize: 12, color: '#888', marginTop: 3 },
  distanceBadge: { backgroundColor: '#e8f5ee', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  distanceText: { fontSize: 13, fontWeight: '700', color: '#1a6b3a' },
})
