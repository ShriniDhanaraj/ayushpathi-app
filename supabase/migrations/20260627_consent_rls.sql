-- ================================================================
-- FIX: RLS policies for patient_doctor_consent
-- RLS was enabled on this table but no policies were defined,
-- so patients could neither read their consents nor revoke them.
-- ================================================================

-- ── Patient: read own consent rows ──────────────────────────────
CREATE POLICY "patient_read_own_consents" ON patient_doctor_consent
  FOR SELECT TO authenticated
  USING (
    patient_id IN (
      SELECT id FROM patient WHERE auth_user_id = auth.uid()
    )
  );

-- ── Patient: update own consent rows (revoke / re-grant) ────────
-- Patients can change status + revoked_at + consented_at on their own rows.
-- They cannot change patient_id, doctor_id, or share_full_history directly.
CREATE POLICY "patient_update_own_consents" ON patient_doctor_consent
  FOR UPDATE TO authenticated
  USING (
    patient_id IN (
      SELECT id FROM patient WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    patient_id IN (
      SELECT id FROM patient WHERE auth_user_id = auth.uid()
    )
  );

-- ── Doctor: read consents where they are the doctor ─────────────
-- Needed so a doctor can confirm active consents from their side.
CREATE POLICY "doctor_read_own_consents" ON patient_doctor_consent
  FOR SELECT TO authenticated
  USING (
    doctor_id IN (
      SELECT id FROM doctor WHERE auth_user_id = auth.uid()
    )
  );

-- ── Staff (receptionist / hospital_admin): read consents for patients
-- at their hospital — needed for GDPR lookup and patient record views.
CREATE POLICY "staff_read_consents" ON patient_doctor_consent
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM receptionist r
      WHERE r.auth_user_id = auth.uid()
        AND r.is_active = TRUE
    )
    OR
    EXISTS (
      SELECT 1 FROM hospital_admin ha
      WHERE ha.auth_user_id = auth.uid()
        AND ha.is_active = TRUE
    )
  );
