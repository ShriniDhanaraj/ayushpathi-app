-- ============================================================
-- Migration: Patient Identity — unique lookup key + GDPR address
-- ============================================================
-- Unique key for WA receptionist lookup:
--   mobile + date_of_birth + first_name + last_name
-- GDPR confirm step: receptionist validates address_line_1
--   before sharing any patient/doctor info.
-- ============================================================

-- 1. address_line_1 as a stored generated column
--    "1st line of address" = door_number + street
ALTER TABLE address
  ADD COLUMN IF NOT EXISTS address_line_1 TEXT
    GENERATED ALWAYS AS (
      TRIM(COALESCE(door_number || ' ', '') || COALESCE(street, ''))
    ) STORED;

-- 2. Unique index on patient identity key
--    Partial: only when whatsapp_enabled = TRUE (those are the ones calling via WA)
--    Case-insensitive on names to handle "RAJ" vs "Raj" input from receptionist
CREATE UNIQUE INDEX IF NOT EXISTS patient_wa_identity_idx
  ON patient (mobile, date_of_birth, lower(first_name), lower(last_name))
  WHERE whatsapp_enabled = TRUE;

-- 3. Non-unique index for patients WITHOUT WA enabled
--    (allows lookup but won't enforce uniqueness — rare edge case)
CREATE INDEX IF NOT EXISTS patient_identity_idx
  ON patient (mobile, date_of_birth, lower(first_name), lower(last_name))
  WHERE whatsapp_enabled = FALSE;

-- 4. Same for doctor
CREATE UNIQUE INDEX IF NOT EXISTS doctor_wa_identity_idx
  ON doctor (mobile, date_of_birth, lower(first_name), lower(last_name))
  WHERE whatsapp_enabled = TRUE;

CREATE INDEX IF NOT EXISTS doctor_identity_idx
  ON doctor (mobile, date_of_birth, lower(first_name), lower(last_name))
  WHERE whatsapp_enabled = FALSE;

-- 5. Comment
COMMENT ON COLUMN address.address_line_1 IS
  'Computed first line of address (door_number + street). Used for GDPR identity confirmation by receptionist.';
