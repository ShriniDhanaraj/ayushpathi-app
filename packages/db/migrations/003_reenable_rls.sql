-- =============================================================
-- Migration 003: Re-enable RLS with proper policies
-- Run in Supabase SQL Editor after deploying API route changes
-- =============================================================

-- ── ADDRESS ──────────────────────────────────────────────────
ALTER TABLE address ENABLE ROW LEVEL SECURITY;

-- Only service role (server API) can insert — no direct client inserts
-- (no INSERT policy = only service role can insert, anon/authenticated blocked)

-- Patients can read their own address
CREATE POLICY "patient_read_own_address" ON address
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT address_id FROM patient WHERE auth_user_id = auth.uid()
    )
  );

-- Doctors can read their own address (if stored)
CREATE POLICY "doctor_read_own_address" ON address
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT address_id FROM doctor WHERE auth_user_id = auth.uid()
    )
  );

-- Patients can update their own address
CREATE POLICY "patient_update_own_address" ON address
  FOR UPDATE TO authenticated
  USING (
    id IN (
      SELECT address_id FROM patient WHERE auth_user_id = auth.uid()
    )
  );


-- ── PATIENT ──────────────────────────────────────────────────
ALTER TABLE patient ENABLE ROW LEVEL SECURITY;

-- Patient can read their own row
CREATE POLICY "patient_read_own" ON patient
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

-- Patient can update their own row
CREATE POLICY "patient_update_own" ON patient
  FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid());

-- Doctors with active consent can read patient info
CREATE POLICY "doctor_read_consented_patient" ON patient
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT pdc.patient_id
      FROM patient_doctor_consent pdc
      JOIN doctor d ON d.id = pdc.doctor_id
      WHERE d.auth_user_id = auth.uid()
        AND pdc.status = 'ACTIVE'
    )
  );


-- ── PATIENT HEALTH PROFILE ───────────────────────────────────
ALTER TABLE patient_health_profile ENABLE ROW LEVEL SECURITY;

-- Patient can read their own health profile
CREATE POLICY "patient_read_own_health" ON patient_health_profile
  FOR SELECT TO authenticated
  USING (
    patient_id IN (
      SELECT id FROM patient WHERE auth_user_id = auth.uid()
    )
  );

-- Patient can insert their own health profile
CREATE POLICY "patient_insert_own_health" ON patient_health_profile
  FOR INSERT TO authenticated
  WITH CHECK (
    patient_id IN (
      SELECT id FROM patient WHERE auth_user_id = auth.uid()
    )
  );

-- Patient can update their own health profile
CREATE POLICY "patient_update_own_health" ON patient_health_profile
  FOR UPDATE TO authenticated
  USING (
    patient_id IN (
      SELECT id FROM patient WHERE auth_user_id = auth.uid()
    )
  );

-- Doctors with active consent can read patient health profile
CREATE POLICY "doctor_read_consented_health" ON patient_health_profile
  FOR SELECT TO authenticated
  USING (
    patient_id IN (
      SELECT pdc.patient_id
      FROM patient_doctor_consent pdc
      JOIN doctor d ON d.id = pdc.doctor_id
      WHERE d.auth_user_id = auth.uid()
        AND pdc.status = 'ACTIVE'
    )
  );


-- ── DOCTOR ───────────────────────────────────────────────────
ALTER TABLE doctor ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can read verified doctors — needed for search/browse
CREATE POLICY "public_read_verified_doctors" ON doctor
  FOR SELECT TO anon, authenticated
  USING (verification_status = 'APPROVED');

-- Doctor can read their own row (even if pending/rejected)
CREATE POLICY "doctor_read_own" ON doctor
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

-- Doctor can update their own non-critical fields
CREATE POLICY "doctor_update_own" ON doctor
  FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid());

-- Admins can read all doctor rows (for verification dashboard)
-- Uses a custom claim set in auth metadata by the admin registration flow
CREATE POLICY "admin_read_all_doctors" ON doctor
  FOR SELECT TO authenticated
  USING (
    auth.jwt() ->> 'role' = 'ayushpathi_admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'ayushpathi_admin'
  );

-- Admins can update any doctor row (approve/reject)
CREATE POLICY "admin_update_all_doctors" ON doctor
  FOR UPDATE TO authenticated
  USING (
    auth.jwt() ->> 'role' = 'ayushpathi_admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'ayushpathi_admin'
  );
