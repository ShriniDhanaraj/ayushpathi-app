-- ============================================================
-- Migration: Hospital Group, Hospital Admin tiers, Audit Trail
-- ============================================================

-- 1. Hospital Group (chain / multi-hospital org)
CREATE TABLE IF NOT EXISTS hospital_group (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID REFERENCES auth.users(id),
  updated_by  UUID REFERENCES auth.users(id)
);

-- 2. Link hospital → group (optional; a hospital can be standalone)
ALTER TABLE hospital
  ADD COLUMN IF NOT EXISTS hospital_group_id UUID REFERENCES hospital_group(id) ON DELETE SET NULL;

-- 3. Hospital Admin table — three-tier scope
--    HOSPITAL : manages exactly one hospital
--    GROUP    : manages all hospitals in a hospital_group
--    GLOBAL   : Ayushpathi platform owner, sees everything
CREATE TABLE IF NOT EXISTS hospital_admin (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id       UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope              TEXT NOT NULL DEFAULT 'HOSPITAL'
                       CHECK (scope IN ('HOSPITAL', 'GROUP', 'GLOBAL')),
  hospital_id        UUID REFERENCES hospital(id) ON DELETE SET NULL,
  hospital_group_id  UUID REFERENCES hospital_group(id) ON DELETE SET NULL,
  first_name         TEXT NOT NULL,
  last_name          TEXT NOT NULL,
  email              TEXT NOT NULL,
  mobile             TEXT NOT NULL,
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by         UUID REFERENCES auth.users(id),
  updated_by         UUID REFERENCES auth.users(id),
  CONSTRAINT scope_check CHECK (
    (scope = 'HOSPITAL'  AND hospital_id IS NOT NULL) OR
    (scope = 'GROUP'     AND hospital_group_id IS NOT NULL) OR
    (scope = 'GLOBAL')
  )
);

-- 4. Universal audit columns — add to all key tables that are missing them
-- (Uses IF NOT EXISTS so safe to re-run)

-- address
ALTER TABLE address
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- patient
ALTER TABLE patient
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- doctor
ALTER TABLE doctor
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- hospital
ALTER TABLE hospital
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- appointment
ALTER TABLE appointment
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- consultation
ALTER TABLE consultation
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- receptionist
ALTER TABLE receptionist
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- hospital_doctor (existing join table)
ALTER TABLE hospital_doctor
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- doctor_hospital (new join table from earlier migration)
ALTER TABLE doctor_hospital
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- patient_doctor_consent
ALTER TABLE patient_doctor_consent
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- 5. Comments for documentation
COMMENT ON TABLE hospital_admin IS
  'Three-tier admin: HOSPITAL=single hospital, GROUP=hospital chain, GLOBAL=platform owner';
COMMENT ON COLUMN hospital_admin.scope IS
  'HOSPITAL: hospital_id set | GROUP: hospital_group_id set | GLOBAL: no restriction';

-- 6. RLS
ALTER TABLE hospital_admin ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hospital_admin_own" ON hospital_admin;
CREATE POLICY "hospital_admin_own" ON hospital_admin
  FOR ALL USING (auth.uid() = auth_user_id);

ALTER TABLE hospital_group ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hospital_group_read" ON hospital_group;
CREATE POLICY "hospital_group_read" ON hospital_group
  FOR SELECT USING (true);

-- 7. Updated_at triggers
DROP TRIGGER IF EXISTS trg_hospital_group_updated_at ON hospital_group;
CREATE TRIGGER trg_hospital_group_updated_at
  BEFORE UPDATE ON hospital_group
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_hospital_admin_updated_at ON hospital_admin;
CREATE TRIGGER trg_hospital_admin_updated_at
  BEFORE UPDATE ON hospital_admin
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
