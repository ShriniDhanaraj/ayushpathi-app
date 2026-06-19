-- ============================================================
-- Migration: Receptionist Role
-- ============================================================

-- 1. Receptionist table
CREATE TABLE IF NOT EXISTS receptionist (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  hospital_id  UUID REFERENCES hospital(id) ON DELETE SET NULL,
  first_name   TEXT NOT NULL,
  last_name    TEXT NOT NULL,
  email        TEXT NOT NULL,
  mobile       TEXT NOT NULL,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Walk-in and source tracking on appointments
ALTER TABLE appointment
  ADD COLUMN IF NOT EXISTS is_walk_in   BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS booked_by_id UUID REFERENCES auth.users(id);

-- (appointment.status is plain TEXT — ARRIVED / NO_SHOW work without schema change)

-- 3. RLS
ALTER TABLE receptionist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "receptionist_own" ON receptionist;
CREATE POLICY "receptionist_own" ON receptionist
  FOR ALL USING (auth.uid() = auth_user_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_receptionist_updated_at ON receptionist;
CREATE TRIGGER trg_receptionist_updated_at
  BEFORE UPDATE ON receptionist
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
