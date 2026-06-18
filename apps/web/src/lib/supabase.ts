import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client-side Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Type helper — will be replaced by auto-generated types from Supabase CLI
export type Database = {
  public: {
    Tables: {
      patient: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      doctor: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      hospital: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      appointment: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      consultation: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      patient_doctor_consent: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
    }
  }
}
