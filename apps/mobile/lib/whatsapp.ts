/**
 * Ayushpathi WhatsApp — Mobile (React Native)
 * Uses Linking.openURL with wa.me deep link.
 *
 * WA number hierarchy (same as web):
 *   Patient / Doctor / Receptionist → Hospital WhatsApp
 *   Hospital Admin (in group)       → Group WhatsApp
 *   Hospital Admin (standalone)     → Platform WhatsApp
 *   Group / Global Admin            → Platform WhatsApp
 *
 * Patients NEVER see group or platform numbers.
 */
import { Linking, Alert } from 'react-native'

export const PLATFORM_WA = '919361287432'
const API_BASE = 'https://rasbros.com'

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2)
  if (digits.length === 11 && digits.startsWith('0'))  return digits.slice(1)
  return digits.slice(-10)
}

async function openWA(fullNumber: string, message: string): Promise<void> {
  const digits = fullNumber.replace(/\D/g, '')
  const waAppUrl = `whatsapp://send?phone=${digits}&text=${encodeURIComponent(message)}`
  const waWebUrl = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
  try {
    const canOpen = await Linking.canOpenURL(waAppUrl)
    await Linking.openURL(canOpen ? waAppUrl : waWebUrl)
  } catch {
    Alert.alert('WhatsApp not found', 'Please install WhatsApp to send this message.')
  }
}

/** Send a message to any phone number (e.g. patient notifications) */
export async function openWhatsApp(phone: string, message: string): Promise<void> {
  const clean = normalizePhone(phone)
  await openWA(`91${clean}`, message)
}

/**
 * Opens the correct support WhatsApp for the current user.
 * Calls /api/support/whatsapp with the user's JWT to resolve the right number.
 */
export async function resolveAndOpenSupportWA(
  accessToken: string,
  message = 'Hi! I need help with Ayushpathi.'
): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/api/support/whatsapp`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const json = await res.json()
    await openWA(json.whatsapp ?? PLATFORM_WA, message)
  } catch {
    await openWA(PLATFORM_WA, message)
  }
}

// ─── Message Templates ────────────────────────────────────────────────────────

export function buildAppointmentConfirmation(apt: {
  patientName: string; doctorName: string; specialization?: string
  hospitalName?: string; date: string; startTime: string
  type: string; appointmentId: string
}): string {
  const dateStr = new Date(apt.date).toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' })
  const time = apt.startTime.slice(0, 5)
  const mode = apt.type === 'TELECONSULT' ? '📱 Teleconsultation' : '🏥 In-Person Visit'
  return [
    `✅ *Appointment Confirmed — Ayushpathi*`, ``,
    `Hello ${apt.patientName},`,
    `Your appointment has been booked successfully.`, ``,
    `👨‍⚕️ Doctor: Dr. ${apt.doctorName}${apt.specialization ? ` (${apt.specialization})` : ''}`,
    apt.hospitalName ? `🏥 Hospital: ${apt.hospitalName}` : '',
    `📅 Date: ${dateStr}`, `⏰ Time: ${time}`, mode,
    `🔖 Booking ID: ${apt.appointmentId.slice(0, 8).toUpperCase()}`, ``,
    `📌 *Please carry a valid ID and arrive 10 minutes early.*`, ``,
    `— Ayushpathi Healthcare`,
  ].filter(Boolean).join('\n')
}

export function buildPrescriptionReady(p: {
  patientName: string; doctorName: string; date: string
  medicineCount: number; nextVisitDate?: string
}): string {
  const dateStr = new Date(p.date).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })
  return [
    `💊 *Prescription Saved — Ayushpathi*`, ``,
    `Hello ${p.patientName},`,
    `Your prescription has been saved in Ayushpathi.`, ``,
    `👨‍⚕️ Prescribed by: Dr. ${p.doctorName}`,
    `📅 Date: ${dateStr}`,
    `💊 Medicines: ${p.medicineCount} item${p.medicineCount !== 1 ? 's' : ''}`,
    p.nextVisitDate ? `🗓️ Next Visit: ${new Date(p.nextVisitDate).toLocaleDateString('en-IN', { day:'numeric', month:'long' })}` : '',
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
