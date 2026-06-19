/**
 * Ayushpathi WhatsApp — Mobile (React Native)
 * Uses Linking.openURL with wa.me deep link.
 * No API key, no third-party service. Same method as DROPeZi project.
 */
import { Linking, Alert } from 'react-native'

const AYUSHPATHI_WA = '919876543210'

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2)
  if (digits.length === 11 && digits.startsWith('0'))  return digits.slice(1)
  return digits.slice(-10)
}

export async function openWhatsApp(phone: string, message: string): Promise<void> {
  const clean = normalizePhone(phone)
  // Try WhatsApp app first, fall back to wa.me web
  const waAppUrl = `whatsapp://send?phone=91${clean}&text=${encodeURIComponent(message)}`
  const waWebUrl = `https://wa.me/91${clean}?text=${encodeURIComponent(message)}`

  const canOpen = await Linking.canOpenURL(waAppUrl)
  const url = canOpen ? waAppUrl : waWebUrl

  try {
    await Linking.openURL(url)
  } catch {
    Alert.alert('WhatsApp not found', 'Please install WhatsApp to send this message.')
  }
}

export async function openAyushpathiWhatsApp(message = 'Hi Ayushpathi! I need help.'): Promise<void> {
  await openWhatsApp(AYUSHPATHI_WA, message)
}

// ─── Message Templates (shared with web, copy kept here for offline use) ──────

export function buildAppointmentConfirmation(apt: {
  patientName: string; doctorName: string; specialization?: string
  hospitalName?: string; date: string; startTime: string
  type: string; appointmentId: string
}): string {
  const dateStr = new Date(apt.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const time = apt.startTime.slice(0, 5)
  const mode = apt.type === 'TELECONSULT' ? '📱 Teleconsultation' : '🏥 In-Person Visit'
  return [
    `✅ *Appointment Confirmed — Ayushpathi*`, ``,
    `Hello ${apt.patientName},`,
    `Your appointment has been booked successfully.`, ``,
    `👨‍⚕️ Doctor: Dr. ${apt.doctorName}${apt.specialization ? ` (${apt.specialization})` : ''}`,
    apt.hospitalName ? `🏥 Hospital: ${apt.hospitalName}` : '',
    `📅 Date: ${dateStr}`, `⏰ Time: ${time}`, `${mode}`,
    `🔖 Booking ID: ${apt.appointmentId.slice(0, 8).toUpperCase()}`, ``,
    `📌 *Please carry a valid ID and arrive 10 minutes early.*`, ``,
    `— Ayushpathi Healthcare`,
  ].filter(Boolean).join('\n')
}

export function buildPrescriptionReady(p: {
  patientName: string; doctorName: string; date: string
  medicineCount: number; nextVisitDate?: string
}): string {
  const dateStr = new Date(p.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  return [
    `💊 *Prescription Saved — Ayushpathi*`, ``,
    `Hello ${p.patientName},`,
    `Your prescription has been saved in Ayushpathi.`, ``,
    `👨‍⚕️ Prescribed by: Dr. ${p.doctorName}`,
    `📅 Date: ${dateStr}`,
    `💊 Medicines: ${p.medicineCount} item${p.medicineCount !== 1 ? 's' : ''}`,
    p.nextVisitDate ? `🗓️ Next Visit: ${new Date(p.nextVisitDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}` : '',
    ``, `📲 Log in to Ayushpathi to view your full prescription.`,
    `🌐 rasbros.com`, ``, `— Ayushpathi Healthcare`,
  ].filter(Boolean).join('\n')
}

export function buildWalkInToken(w: {
  patientName: string; doctorName: string; position: number; estimatedWait?: number
}): string {
  return [
    `🏥 *Walk-in Token — Ayushpathi*`, ``,
    `Hello ${w.patientName},`,
    `You have been added to today's queue.`, ``,
    `👨‍⚕️ Dr. ${w.doctorName}`,
    `🔢 Your Position: *#${w.position}*`,
    w.estimatedWait ? `⏱️ Estimated Wait: ~${w.estimatedWait} minutes` : '',
    ``, `Please stay nearby. You will be called when it's your turn.`,
    `— Ayushpathi Healthcare`,
  ].filter(Boolean).join('\n')
}
