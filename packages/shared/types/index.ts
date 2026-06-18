// Ayushpathi — Shared TypeScript Types
// Mirrors the database schema from 001_initial_schema.sql

export interface Address {
  id: string;
  door_number?: string;
  street?: string;
  area?: string;
  city: string;
  district?: string;
  state: string;
  pincode?: string;
  country: string;
  latitude?: number;
  longitude?: number;
  created_at: string;
  updated_at: string;
}

export interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender?: 'M' | 'F' | 'U';
  profile_photo_url?: string;
  email: string;
  mobile: string;
  phone?: string;
  whatsapp_enabled: boolean;
  social_media?: Record<string, string>;
  communication_consent: string[];
  address_id?: string;
  abha_id?: string;
  abha_verified: boolean;
  auth_user_id?: string;
  created_at: string;
  updated_at: string;
}

export interface PatientHealthProfile {
  id: string;
  patient_id: string;
  known_conditions: string[];
  allergies: string[];
  current_medications: Medication[];
  past_surgeries: Surgery[];
  family_history: FamilyHistory[];
  created_at: string;
  updated_at: string;
}

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  since?: string;
}

export interface Surgery {
  procedure: string;
  year: number;
  hospital?: string;
}

export interface FamilyHistory {
  relation: string;
  condition: string;
}

export interface Doctor {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  gender?: 'M' | 'F' | 'U';
  profile_photo_url?: string;
  email: string;
  mobile: string;
  whatsapp_enabled: boolean;
  registration_number: string;
  registration_council: string;
  degrees: string[];
  ayush_specialization?: string;
  years_of_experience?: number;
  languages_spoken: string[];
  teleconsult_enabled: boolean;
  teleconsult_fee: number;
  verification_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  verified_at?: string;
  rejection_reason?: string;
  auth_user_id?: string;
  created_at: string;
  updated_at: string;
}

export interface DoctorAvailability {
  id: string;
  doctor_id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  slot_duration: number;
  active: boolean;
}

export interface Hospital {
  id: string;
  name: string;
  registration_no?: string;
  phone?: string;
  email?: string;
  website?: string;
  address_id?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PatientDoctorConsent {
  id: string;
  patient_id: string;
  doctor_id: string;
  status: 'ACTIVE' | 'REVOKED';
  share_full_history: boolean;
  consented_at: string;
  revoked_at?: string;
}

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  hospital_id?: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  type: 'F2F' | 'TELECONSULT';
  status: 'BOOKED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  booked_by_role: string;
  notes?: string;
  teleconsult_url?: string;
  payment_status?: string;
  payment_amount?: number;
  created_at: string;
  updated_at: string;
}

export interface Consultation {
  id: string;
  appointment_id?: string;
  patient_id: string;
  doctor_id: string;
  chief_complaint?: string;
  symptoms?: string[];
  diagnosis?: string;
  notes?: string;
  next_visit_date?: string;
  created_at: string;
  updated_at: string;
}

export interface PrescriptionMedicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  notes?: string;
}

export interface Prescription {
  id: string;
  consultation_id: string;
  patient_id: string;
  doctor_id: string;
  medicines: PrescriptionMedicine[];
  instructions?: string;
  is_repeat: boolean;
  created_at: string;
}
