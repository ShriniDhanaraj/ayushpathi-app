-- Migration 002: RLS policy fixes for registration flow
-- Problem: signUp() creates the auth user, but the Supabase client session
-- is not yet established before the next insert. So doctor/address inserts
-- run as 'anon' role, not 'authenticated'. These policies fix that.

-- Allow anon to insert address during patient registration (before session is set)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'address' AND policyname = 'anon_insert_address'
  ) THEN
    CREATE POLICY "anon_insert_address" ON address
      FOR INSERT TO anon WITH CHECK (true);
  END IF;
END $$;

-- Allow anon to insert doctor record during doctor registration
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'doctor' AND policyname = 'anon_insert_doctor'
  ) THEN
    CREATE POLICY "anon_insert_doctor" ON doctor
      FOR INSERT TO anon WITH CHECK (true);
  END IF;
END $$;

-- Allow anon to insert patient record during patient registration
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'patient' AND policyname = 'anon_insert_patient'
  ) THEN
    CREATE POLICY "anon_insert_patient" ON patient
      FOR INSERT TO anon WITH CHECK (true);
  END IF;
END $$;

-- Verify: list all registration-related policies
SELECT tablename, policyname, cmd, roles::text
FROM pg_policies
WHERE tablename IN ('address', 'patient', 'doctor')
  AND cmd = 'INSERT'
ORDER BY tablename, policyname;
