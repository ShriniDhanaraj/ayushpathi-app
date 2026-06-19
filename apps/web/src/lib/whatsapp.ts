/**
 * Ayushpathi WhatsApp Integration
 * Method: wa.me deep links — no API key, no third-party service.
 * Same approach as used in DROPeZi project.
 *
 * Usage:
 *   openWhatsApp(patientMobile, buildAppointmentConfirmation({...}))
 */

const AYUSHPATHI_WA = '919876543210' // Ayushpathi support number (update when live)

/** Strips country code if present, returns 10-digit Indian mobile */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2)
  if (digits.length === 11 && digits.startsWith('0'))  return digits.slice(1)
  return digits.slice(-10)
}

/** Opens WhatsApp with pre-filled message in a new tab */
export function openWhatsApp(phone: string, message: string): void {
  const clean = normalizePhone(phone)
  const url = `https://wa.me/91${clean}?text=${encodeURIComponent(message)}`
  window.open(url, '_blank', 'noopener,noreferrer')
}

/** Opens Ayushpathi's own WhatsApp (for patient queries) */
export function openAyushpathiWhatsApp(message = 'Hi Ayushpathi! I need help with my appointment.'): void {
  const url = `https://wa.me/${AYUSHPATHI_WA}?text=${encodeURIComponent(message)}`
  window.open(url, '_blank', 'noopener,noreferrer')
}

// ─── Message Templates ────────────────────────────────────────────────────────

export interface AppointmentDetails {
  patientName: string
  doctorName: string
  specialization?: string
  hospitalName?: string
  date: string          // YYYY-MM-DD
  startTime: string     // HH:MM
  type: 'F2F' | 'TELECONSULT'
  appointmentId: string
}

export function buildAppointmentConfirmation(apt: AppointmentDetails): string {
  const dateStr = new Date(apt.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const time = apt.startTime.slice(0, 5)
  const mode = apt.type === 'TELECONSULT' ? '📱 Teleconsultation' : '🏥 In-Person Visit'

  return [
    `✅ *Appointment Confirmed — Ayushpathi*`,
    ``,
    `Hello ${apt.patientName},`,
    `Your appointment has been booked successfully.`,
    ``,
    `👨‍⚕️ Doctor: Dr. ${apt.doctorName}${apt.specialization ? ` (${apt.specialization})` : ''}`,
    apt.hospitalName ? `🏥 Hospital: ${apt.hospitalName}` : '',
    `📅 Date: ${dateStr}`,
    `⏰ Time: ${time}`,
    `${mode}`,
    `🔖 Booking ID: ${apt.appointmentId.slice(0, 8).toUpperCase()}`,
    ``,
    `📌 *Please carry a valid ID proof and arrive 10 minutes early.*`,
    ``,
    `To reschedule or cancel, reply to this message or call us.`,
    `— Ayushpathi Healthcare`,
  ].filter(l => l !== null).join('\n')
}

export interface ReminderDetails {
  patientName: string
  doctorName: string
  hospitalName?: string
  date: string
  startTime: string
  appointmentId: string
}

export function buildAppointmentReminder(r: ReminderDetails): string {
  const time = r.startTime.slice(0, 5)
  return [
    `⏰ *Appointment Reminder — Ayushpathi*`,
    ``,
    `Hello ${r.patientName},`,
    `This is a reminder for your appointment *tomorrow*.`,
    ``,
    `👨‍⚕️ Dr. ${r.doctorName}`,
    r.hospitalName ? `🏥 ${r.hospitalName}` : '',
    `⏰ ${time}`,
    `🔖 ID: ${r.appointmentId.slice(0, 8).toUpperCase()}`,
    ``,
    `Please arrive 10 minutes early with a valid ID.`,
    `— Ayushpathi Healthcare`,
  ].filter(l => l !== null).join('\n')
}

export interface PrescriptionDetails {
  patientName: string
  doctorName: string
  date: string
  medicineCount: number
  nextVisitDate?: string
}

export function buildPrescriptionReady(p: PrescriptionDetails): string {
  const dateStr = new Date(p.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  return [
    `💊 *Prescription Saved — Ayushpathi*`,
    ``,
    `Hello ${p.patientName},`,
    `Your prescription from today's consultation has been saved.`,
    ``,
    `👨‍⚕️ Prescribed by: Dr. ${p.doctorName}`,
    `📅 Date: ${dateStr}`,
    `💊 Medicines: ${p.medicineCount} item${p.medicineCount !== 1 ? 's' : ''}`,
    p.nextVisitDate ? `🗓️ Next Visit: ${new Date(p.nextVisitDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}` : '',
    ``,
    `📲 *Log in to Ayushpathi to view your full prescription and health records.*`,
    `🌐 rasbros.com`,
    ``,
    `— Ayushpathi Healthcare`,
  ].filter(l => l !== null).join('\n')
}

export interface DoctorApprovalDetails {
  doctorName: string
  specialization: string
}

export function buildDoctorApproved(d: DoctorApprovalDetails): string {
  return [
    `🎉 *Profile Approved — Ayushpathi*`,
    ``,
    `Congratulations Dr. ${d.doctorName}!`,
    ``,
    `Your Ayushpathi doctor profile has been *verified and approved*.`,
    `You can now start accepting patient appointments.`,
    ``,
    `📋 Specialization: ${d.specialization}`,
    ``,
    `*Next steps:*`,
    `1️⃣ Log in to the Ayushpathi app`,
    `2️⃣ Set your weekly availability`,
    `3️⃣ Start accepting appointments`,
    ``,
    `🌐 rasbros.com`,
    `— Ayushpathi Team`,
  ].join('\n')
}

export interface WalkInDetails {
  patientName: string
  doctorName: string
  position: number   // queue position
  estimatedWait?: number  // minutes
}

export function buildWalkInToken(w: WalkInDetails): string {
  return [
    `🏥 *Walk-in Token — Ayushpathi*`,
    ``,
    `Hello ${w.patientName},`,
    `You have been added to today's queue.`,
    ``,
    `👨‍⚕️ Dr. ${w.doctorName}`,
    `🔢 Your Position: *#${w.position}*`,
    w.estimatedWait ? `⏱️ Estimated Wait: ~${w.estimatedWait} minutes` : '',
    ``,
    `Please stay nearby. You will be called when it's your turn.`,
    `— Ayushpathi Healthcare`,
  ].filter(l => l !== null).join('\n')
}
