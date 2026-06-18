-- =============================================================
-- Migration 003: Re-enable RLS with proper policies
-- =============================================================

-- ── ADDRESS ──────────────────────────────────────────────────
-- Address rows are inserted server-side via service role only.
-- No direct client access needed — patients read address data
-- through the API, not direct table queries.
ALTER TABLE address ENABLE ROW LEVEL SECURITY;


-- ── PATIENT ──────────────────────────────────────────────────
ALTER TABLE patient ENABLE ROW LEVEL SECURITY;

CREATE POLICY "patient_read_own" ON patient
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

CREATE POLICY "patient_update_own" ON patient
  FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid());

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

CREATE POLICY "patient_read_own_health" ON patient_health_profile
  FOR SELECT TO authenticated
  USING (
    patient_id IN (
      SELECT id FROM patient WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "patient_insert_own_health" ON patient_health_profile
  FOR INSERT TO authenticated
  WITH CHECK (
    patient_id IN (
      SELECT id FROM patient WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "patient_update_own_health" ON patient_health_profile
  FOR UPDATE TO authenticated
  USING (
    patient_id IN (
      SELECT id FROM patient WHERE auth_user_id = auth.uid()
    )
  );

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

CREATE POLICY "public_read_verified_doctors" ON doctor
  FOR SELECT TO anon, authenticated
  USING (verification_status = 'APPROVED');

CREATE POLICY "doctor_read_own" ON doctor
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

CREATE POLICY "doctor_update_own" ON doctor
  FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid());

CREATE POLICY "admin_read_all_doctors" ON doctor
  FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'ayushpathi_admin'
  );

CREATE POLICY "admin_update_all_doctors" ON doctor
  FOR UPDATE TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'ayushpathi_admin'
  );
