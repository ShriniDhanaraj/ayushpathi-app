-- Migration: Enable RLS on all tables that were missing it
-- Session 10 fix — resolves Supabase security alert "Table publicly accessible"

-- Lookup tables: read-only for everyone, no writes via client
ALTER TABLE lookup_gender              ENABLE ROW LEVEL SECURITY;
ALTER TABLE lookup_ayush_specialization ENABLE ROW LEVEL SECURITY;
ALTER TABLE lookup_verification_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE lookup_consent_status      ENABLE ROW LEVEL SECURITY;
ALTER TABLE lookup_day_of_week         ENABLE ROW LEVEL SECURITY;
ALTER TABLE lookup_language            ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_relationship       ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lookup_read_all" ON lookup_gender;
DROP POLICY IF EXISTS "lookup_read_all" ON lookup_ayush_specialization;
DROP POLICY IF EXISTS "lookup_read_all" ON lookup_verification_status;
DROP POLICY IF EXISTS "lookup_read_all" ON lookup_consent_status;
DROP POLICY IF EXISTS "lookup_read_all" ON lookup_day_of_week;
DROP POLICY IF EXISTS "lookup_read_all" ON lookup_language;
DROP POLICY IF EXISTS "lookup_read_all" ON patient_relationship;

CREATE POLICY "lookup_read_all" ON lookup_gender              FOR SELECT USING (true);
CREATE POLICY "lookup_read_all" ON lookup_ayush_specialization FOR SELECT USING (true);
CREATE POLICY "lookup_read_all" ON lookup_verification_status  FOR SELECT USING (true);
CREATE POLICY "lookup_read_all" ON lookup_consent_status       FOR SELECT USING (true);
CREATE POLICY "lookup_read_all" ON lookup_day_of_week          FOR SELECT USING (true);
CREATE POLICY "lookup_read_all" ON lookup_language             FOR SELECT USING (true);
CREATE POLICY "lookup_read_all" ON patient_relationship        FOR SELECT USING (true);

-- appointment: patient sees own, doctor sees own, staff (receptionist/admin) see hospital's
ALTER TABLE appointment ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "appointment_access" ON appointment;
CREATE POLICY "appointment_access" ON appointment
  FOR ALL USING (
    -- patient owns it
    patient_id IN (SELECT id FROM patient WHERE auth_user_id = auth.uid())
    OR
    -- doctor owns it
    doctor_id IN (SELECT id FROM doctor WHERE auth_user_id = auth.uid())
    OR
    -- receptionist at same hospital
    hospital_id IN (SELECT hospital_id FROM receptionist WHERE auth_user_id = auth.uid() AND is_active = true)
    OR
    -- hospital admin at same hospital
    hospital_id IN (
      SELECT hospital_id FROM hospital_admin WHERE auth_user_id = auth.uid() AND is_active = true AND scope = 'HOSPITAL'
    )
  );

-- doctor_availability: doctors manage own; public can read (needed for booking)
ALTER TABLE doctor_availability ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "doctor_avail_read" ON doctor_availability;
DROP POLICY IF EXISTS "doctor_avail_write" ON doctor_availability;
CREATE POLICY "doctor_avail_read"  ON doctor_availability FOR SELECT USING (true);
CREATE POLICY "doctor_avail_write" ON doctor_availability FOR ALL
  USING (doctor_id IN (SELECT id FROM doctor WHERE auth_user_id = auth.uid()));

-- hospital_doctor: public read (needed for doctor profile); admin writes via service role
ALTER TABLE hospital_doctor ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hospital_doctor_read" ON hospital_doctor;
CREATE POLICY "hospital_doctor_read" ON hospital_doctor FOR SELECT USING (true);

-- audit_log, breach_log, data_erasure_request, data_export_request:
-- service role only (all API routes use service role key — these are never exposed to anon)
ALTER TABLE audit_log           ENABLE ROW LEVEL SECURITY;
ALTER TABLE breach_log          ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_erasure_request ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_export_request  ENABLE ROW LEVEL SECURITY;

-- No SELECT policies → only service role (bypasses RLS) can access these tables
