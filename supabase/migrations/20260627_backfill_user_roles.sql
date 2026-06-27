-- ============================================================
-- Backfill user_metadata.role for all existing seed/test users
-- Run in Supabase SQL Editor (runs as postgres, bypasses RLS)
-- Safe to run multiple times (uses jsonb merge, not replace)
-- ============================================================

-- 1. Doctors (approved or pending — both map to 'doctor' role)
--    Doctor dashboard checks verification_status from doctor table itself
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"role":"doctor"}'::jsonb
WHERE id IN (SELECT auth_user_id FROM doctor WHERE auth_user_id IS NOT NULL);

-- 2. Hospital admins (HOSPITAL / GROUP / GLOBAL scopes)
--    GLOBAL scope admins also map to hospital_admin; the dashboard
--    reads scope from hospital_admin table to show the right UI
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"role":"hospital_admin"}'::jsonb
WHERE id IN (SELECT auth_user_id FROM hospital_admin WHERE auth_user_id IS NOT NULL);

-- 3. Receptionists
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"role":"receptionist"}'::jsonb
WHERE id IN (SELECT auth_user_id FROM receptionist WHERE auth_user_id IS NOT NULL);

-- 4. Patients — only if role not already set (doctors/admins registered as
--    patients in some test flows; don't downgrade their role)
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"role":"patient"}'::jsonb
WHERE id IN (SELECT auth_user_id FROM patient WHERE auth_user_id IS NOT NULL)
  AND (raw_user_meta_data->>'role' IS NULL OR raw_user_meta_data->>'role' = '');

-- Verify results
SELECT u.email, u.raw_user_meta_data->>'role' AS role
FROM auth.users u
ORDER BY u.email;
