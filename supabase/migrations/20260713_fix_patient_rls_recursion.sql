-- ================================================================
-- FIX: infinite recursion (42P17) in RLS for relation "patient"
--
-- Cause (introduced S14): reading `patient` fires policy
-- `doctor_read_consented_patient`, which subqueries
-- `patient_doctor_consent`; that fires `patient_read_own_consents`
-- (S14), which subqueries `patient` again -> infinite loop.
-- Symptom: patient login stalls; every patient-table read errors.
--
-- Solution: resolve "which patient rows does the current user own"
-- via a SECURITY DEFINER function. Because it runs as the definer,
-- RLS is not re-evaluated inside it, so the cycle is broken.
-- ================================================================

CREATE OR REPLACE FUNCTION public.current_patient_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id FROM patient WHERE auth_user_id = auth.uid()
$$;

REVOKE ALL ON FUNCTION public.current_patient_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_patient_ids() TO authenticated;

-- Rewrite the consent policies to use the helper instead of
-- subquerying `patient` directly (this is the side that recurses).
DROP POLICY IF EXISTS "patient_read_own_consents"   ON patient_doctor_consent;
DROP POLICY IF EXISTS "patient_update_own_consents" ON patient_doctor_consent;

CREATE POLICY "patient_read_own_consents" ON patient_doctor_consent
  FOR SELECT TO authenticated
  USING ( patient_id IN (SELECT public.current_patient_ids()) );

CREATE POLICY "patient_update_own_consents" ON patient_doctor_consent
  FOR UPDATE TO authenticated
  USING     ( patient_id IN (SELECT public.current_patient_ids()) )
  WITH CHECK( patient_id IN (SELECT public.current_patient_ids()) );

-- Also rewrite the patient-side policy that subqueries consent, so
-- neither direction can re-enter patient RLS.
DROP POLICY IF EXISTS "doctor_read_consented_patient" ON patient;

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
