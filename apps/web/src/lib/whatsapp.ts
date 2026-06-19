/**
 * Ayushpathi WhatsApp Integration
 * Method: wa.me deep links — no API key, no third-party service.
 *
 * WA number hierarchy:
 *   Patient / Doctor / Receptionist → Hospital's own WhatsApp
 *   Hospital Admin (in a group)     → Group's WhatsApp
 *   Hospital Admin (standalone)     → Platform WhatsApp
 *   Group Admin / Global Admin      → Platform WhatsApp
 *
 * Patients NEVER see group or platform numbers.
 * Use resolveAndOpenSupportWA() to automatically pick the right number.
 */

export const PLATFORM_WA = '919361287432'

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2)
  if (digits.length === 11 && digits.startsWith('0'))  return digits.slice(1)
  return digits.slice(-10)
}

/** Opens WhatsApp for any phone number (patient notifications, etc.) */
export function openWhatsApp(phone: string, message: string): void {
  const clean = normalizePhone(phone)
  const url = `https://wa.me/91${clean}?text=${encodeURIComponent(message)}`
  window.open(url, '_blank', 'noopener,noreferrer')
}

/**
 * Opens the correct support WhatsApp for the current user.
 * Fetches the resolved number from /api/support/whatsapp (JWT-aware).
 * Falls back to platform WA if the API fails.
 */
export async function resolveAndOpenSupportWA(
  accessToken: string,
  message = 'Hi! I need help with Ayushpathi.'
): Promise<void> {
  try {
    const res = await fetch('/api/support/whatsapp', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const json = await res.json()
    const number: string = json.whatsapp ?? PLATFORM_WA
    const digits = number.replace(/\D/g, '')
    const url = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  } catch {
    const url = `https://wa.me/${PLATFORM_WA}?text=${encodeURIComponent(message)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}

// ─── Message Templates ────────────────────────────────────────────────────────

export interface AppointmentDetails {
  patientName: string; doctorName: string; specialization?: string
  hospitalName?: string; date: string; startTime: string
  type: 'F2F' | 'TELECONSULT'; appointmentId: string
}

export function buildAppointmentConfirmation(apt: AppointmentDetails): string {
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

export function buildAppointmentReminder(r: {
  patientName: string; doctorName: string; hospitalName?: string
  date: string; startTime: string; appointmentId: string
}): string {
  const time = r.startTime.slice(0, 5)
  return [
    `⏰ *Appointment Reminder — Ayushpathi*`, ``,
    `Hello ${r.patientName},`,
    `This is a reminder for your appointment *tomorrow*.`, ``,
    `👨‍⚕️ Dr. ${r.doctorName}`,
    r.hospitalName ? `🏥 ${r.hospitalName}` : '',
    `⏰ ${time}`,
    `🔖 ID: ${r.appointmentId.slice(0, 8).toUpperCase()}`, ``,
    `Please arrive 10 minutes early with a valid ID.`,
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
    `Your prescription from today's consultation has been saved.`, ``,
    `👨‍⚕️ Prescribed by: Dr. ${p.doctorName}`,
    `📅 Date: ${dateStr}`,
    `💊 Medicines: ${p.medicineCount} item${p.medicineCount !== 1 ? 's' : ''}`,
    p.nextVisitDate ? `🗓️ Next Visit: ${new Date(p.nextVisitDate).toLocaleDateString('en-IN', { day:'numeric', month:'long' })}` : '',
    ``, `📲 Log in to Ayushpathi to view your full prescription.`,
    `🌐 rasbros.com`, ``, `— Ayushpathi Healthcare`,
  ].filter(Boolean).join('\n')
}

export function buildDoctorApproved(d: { doctorName: string; specialization: string }): string {
  return [
    `🎉 *Profile Approved — Ayushpathi*`, ``,
    `Congratulations Dr. ${d.doctorName}!`, ``,
    `Your Ayushpathi doctor profile has been *verified and approved*.`,
    `You can now start accepting patient appointments.`, ``,
    `📋 Specialization: ${d.specialization}`, ``,
    `*Next steps:*`,
    `1️⃣ Log in to the Ayushpathi app`,
    `2️⃣ Set your weekly availability`,
    `3️⃣ Start accepting appointments`, ``,
    `🌐 rasbros.com`, `— Ayushpathi Team`,
  ].join('\n')
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
