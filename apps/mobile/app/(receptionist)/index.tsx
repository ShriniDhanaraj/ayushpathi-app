import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, StyleSheet, ActivityIndicator, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { openWhatsApp, buildAppointmentConfirmation, buildAppointmentReminder, buildWalkInToken } from '../../lib/whatsapp'

interface Appointment {
  id: string; start_time: string; end_time: string; status: string; is_walk_in: boolean
  patient: { first_name: string; last_name: string; mobile: string } | null
  doctor: { first_name: string; last_name: string; ayush_specialization: string } | null
  appointment_date: string; type: string
}

const STATUS_COLOR: Record<string, string> = {
  BOOKED:'#3B82F6', CONFIRMED:'#6366F1', ARRIVED:'#F59E0B',
  IN_PROGRESS:'#F97316', COMPLETED:'#16A34A', NO_SHOW:'#EF4444', CANCELLED:'#9CA3AF',
}
const NEXT_STATUS: Record<string, string[]> = {
  BOOKED:['ARRIVED','NO_SHOW'], CONFIRMED:['ARRIVED','NO_SHOW'],
  ARRIVED:['IN_PROGRESS'], IN_PROGRESS:['COMPLETED'],
  COMPLETED:[], NO_SHOW:[], CANCELLED:[],
}

export default function ReceptionistQueueScreen() {
  const router = useRouter()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const today = new Date().toISOString().split('T')[0]

  async function load() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data: rec } = await supabase.from('receptionist').select('hospital_id').eq('auth_user_id', session.user.id).maybeSingle()
    const url = `https://rasbros.com/api/receptionist/appointments?date=${today}${rec?.hospital_id ? `&hospital_id=${rec.hospital_id}` : ''}`
    const res = await fetch(url)
    const json = await res.json()
    setAppointments(json.appointments ?? [])
    setLoading(false); setRefreshing(false)
  }

  useEffect(() => { load() }, [])
  const onRefresh = useCallback(() => { setRefreshing(true); load() }, [])

  async function updateStatus(id: string, status: string) {
    const res = await fetch(`https://rasbros.com/api/receptionist/appointments/${id}/status`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (!res.ok) { Alert.alert('Error', 'Failed to update status'); return }
    load()
  }

  function sendConfirmWA(apt: Appointment) {
    if (!apt.patient?.mobile) return
    const msg = buildAppointmentConfirmation({
      patientName: `${apt.patient.first_name} ${apt.patient.last_name}`,
      doctorName: `${apt.doctor?.first_name} ${apt.doctor?.last_name}`,
      specialization: apt.doctor?.ayush_specialization,
      date: apt.appointment_date, startTime: apt.start_time,
      type: apt.type, appointmentId: apt.id,
    })
    openWhatsApp(apt.patient.mobile, msg)
  }

  function sendWalkInWA(apt: Appointment, position: number) {
    if (!apt.patient?.mobile) return
    const msg = buildWalkInToken({
      patientName: `${apt.patient.first_name} ${apt.patient.last_name}`,
      doctorName: `${apt.doctor?.first_name} ${apt.doctor?.last_name}`,
      position,
    })
    openWhatsApp(apt.patient.mobile, msg)
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#16A34A" />

  let walkInCount = 0

  return (
    <ScrollView style={s.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16A34A" />}>
      <View style={s.header}>
        <Text style={s.title}>Today's Queue</Text>
        <TouchableOpacity onPress={() => router.push('/(receptionist)/book')} style={s.bookBtn}>
          <Text style={s.bookBtnText}>+ Book</Text>
        </TouchableOpacity>
      </View>
      <Text style={s.dateText}>{new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' })}</Text>

      {appointments.length === 0 ? (
        <Text style={s.emptyText}>No appointments today</Text>
      ) : appointments.map(apt => {
        if (apt.is_walk_in) walkInCount++
        const pos = apt.is_walk_in ? walkInCount : 0
        const nextStatuses = NEXT_STATUS[apt.status] ?? []

        return (
          <View key={apt.id} style={s.card}>
            <View style={s.cardRow}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection:'row', alignItems:'center', gap:6, marginBottom:2 }}>
                  <Text style={s.patientName}>{apt.patient?.first_name} {apt.patient?.last_name}</Text>
                  {apt.is_walk_in && <View style={s.walkInBadge}><Text style={s.walkInText}>Walk-in #{pos}</Text></View>}
                </View>
                <Text style={s.subText}>{apt.start_time?.slice(0,5)} · Dr. {apt.doctor?.first_name} {apt.doctor?.last_name}</Text>
                <Text style={s.mobileText}>{apt.patient?.mobile}</Text>
              </View>
              <View style={[s.statusBadge, { backgroundColor: (STATUS_COLOR[apt.status] ?? '#9CA3AF') + '20' }]}>
                <Text style={[s.statusText, { color: STATUS_COLOR[apt.status] ?? '#9CA3AF' }]}>{apt.status}</Text>
              </View>
            </View>

            {/* Status actions */}
            {nextStatuses.length > 0 && (
              <View style={[s.actionRow, { marginTop: 8 }]}>
                {nextStatuses.map(s2 => (
                  <TouchableOpacity key={s2} onPress={() => updateStatus(apt.id, s2)} style={s.actionBtn}>
                    <Text style={s.actionBtnText}>{s2.replace('_',' ')}</Text>
                  </TouchableOpacity>
                ))}
                {apt.status === 'COMPLETED' && (
                  <TouchableOpacity onPress={() => router.push({ pathname:'/(receptionist)/prescription', params:{ appointmentId:apt.id, patientName:`${apt.patient?.first_name} ${apt.patient?.last_name}` } })}
                    style={[s.actionBtn, { backgroundColor:'#16A34A' }]}>
                    <Text style={[s.actionBtnText, { color:'#fff' }]}>+ Prescription</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* WhatsApp actions */}
            {apt.patient?.mobile && (
              <View style={[s.actionRow, { marginTop: 6 }]}>
                {['BOOKED','CONFIRMED'].includes(apt.status) && (
                  <TouchableOpacity onPress={() => sendConfirmWA(apt)} style={s.waBtn}>
                    <Text style={s.waBtnText}>💬 Confirm</Text>
                  </TouchableOpacity>
                )}
                {apt.is_walk_in && apt.status === 'BOOKED' && (
                  <TouchableOpacity onPress={() => sendWalkInWA(apt, pos)} style={[s.waBtn, { borderColor:'#7C3AED' }]}>
                    <Text style={[s.waBtnText, { color:'#7C3AED' }]}>💬 Token</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )
      })}
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container:{ flex:1, backgroundColor:'#F9FAFB' },
  header:{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding:16, paddingTop:56 },
  title:{ fontSize:20, fontWeight:'700', color:'#166534' },
  bookBtn:{ backgroundColor:'#16A34A', borderRadius:8, paddingHorizontal:12, paddingVertical:6 },
  bookBtnText:{ color:'#fff', fontSize:14, fontWeight:'600' },
  dateText:{ paddingHorizontal:16, fontSize:13, color:'#6B7280', marginBottom:12 },
  emptyText:{ textAlign:'center', color:'#9CA3AF', marginTop:40 },
  card:{ backgroundColor:'#fff', marginHorizontal:16, marginBottom:10, borderRadius:10, padding:14, shadowColor:'#000', shadowOpacity:0.04, shadowRadius:4, elevation:2 },
  cardRow:{ flexDirection:'row', alignItems:'flex-start' },
  patientName:{ fontSize:15, fontWeight:'600', color:'#111827' },
  subText:{ fontSize:12, color:'#6B7280', marginTop:2 },
  mobileText:{ fontSize:11, color:'#9CA3AF', marginTop:1 },
  walkInBadge:{ backgroundColor:'#EDE9FE', borderRadius:4, paddingHorizontal:6, paddingVertical:2 },
  walkInText:{ fontSize:10, color:'#7C3AED', fontWeight:'600' },
  statusBadge:{ borderRadius:6, paddingHorizontal:8, paddingVertical:4 },
  statusText:{ fontSize:11, fontWeight:'600' },
  actionRow:{ flexDirection:'row', gap:8, flexWrap:'wrap' },
  actionBtn:{ borderWidth:1, borderColor:'#D1D5DB', borderRadius:6, paddingHorizontal:10, paddingVertical:5 },
  actionBtnText:{ fontSize:12, color:'#374151' },
  waBtn:{ borderWidth:1, borderColor:'#25D366', borderRadius:6, paddingHorizontal:10, paddingVertical:5 },
  waBtnText:{ fontSize:12, color:'#16A34A', fontWeight:'600' },
})
