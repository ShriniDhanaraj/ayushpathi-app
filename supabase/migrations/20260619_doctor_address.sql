-- ============================================================
-- Migration: Add address_id to doctor table
-- Required for doctors_near_location RPC to work
-- ============================================================
ALTER TABLE doctor
  ADD COLUMN IF NOT EXISTS address_id UUID REFERENCES address(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_doctor_address ON doctor(address_id);

COMMENT ON COLUMN doctor.address_id IS
  'Links doctor to an address row with lat/lng for near-me search via doctors_near_location RPC';
