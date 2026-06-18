// Ayushpathi — Shared Constants

export const AYUSH_SPECIALIZATIONS = [
  { code: 'AYU', label: 'Ayurveda' },
  { code: 'YOG', label: 'Yoga & Naturopathy' },
  { code: 'UNA', label: 'Unani' },
  { code: 'SID', label: 'Siddha' },
  { code: 'HOM', label: 'Homeopathy' },
] as const;

export const GENDERS = [
  { code: 'M', label: 'Male' },
  { code: 'F', label: 'Female' },
  { code: 'U', label: 'Prefer not to say' },
] as const;

export const COMMUNICATION_CHANNELS = ['SMS', 'WHATSAPP', 'EMAIL'] as const;

export const DOCTOR_DEGREES = [
  'BAMS', 'BSMS', 'BUMS', 'BHMS', 'BNYS',
  'MD (Ayurveda)', 'MS (Ayurveda)', 'MD (Siddha)', 'MD (Unani)', 'MD (Homeopathy)',
  'PhD',
] as const;

export const APPOINTMENT_TYPES = {
  F2F: 'Face to Face',
  TELECONSULT: 'Teleconsultation',
} as const;

export const APPOINTMENT_STATUS = {
  BOOKED: 'Booked',
  CONFIRMED: 'Confirmed',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
} as const;

export const CONSENT_STATUS = {
  ACTIVE: 'Active',
  REVOKED: 'Revoked',
} as const;

export const VERIFICATION_STATUS = {
  PENDING: 'Pending Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
} as const;

export const USER_ROLES = {
  AYUSHPATHI_ADMIN: 'ayushpathi_admin',
  HOSPITAL_ADMIN: 'hospital_admin',
  RECEPTIONIST: 'receptionist',
  DOCTOR: 'doctor',
  PATIENT: 'patient',
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];
