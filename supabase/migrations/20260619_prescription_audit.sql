-- ============================================================
-- Migration: Prescription — full audit trail + future modes
-- ============================================================

-- 1. Who entered the prescription into the system
ALTER TABLE prescription
  ADD COLUMN IF NOT EXISTS entered_by      UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS entered_by_role TEXT;
  -- entered_by_role: 'DOCTOR' | 'RECEPTIONIST' | 'SYSTEM'

-- 2. Entry method — how the prescription reached the system
--    DOCTOR_DIRECT  : doctor typed it during consultation
--    RECEPTIONIST   : receptionist transcribed from paper
--    SCANNED        : image uploaded, OCR parsed (future)
--    IMPORTED       : external system / ABDM (future)
ALTER TABLE prescription
  ADD COLUMN IF NOT EXISTS entry_method TEXT NOT NULL DEFAULT 'RECEPTIONIST'
    CHECK (entry_method IN ('DOCTOR_DIRECT', 'RECEPTIONIST', 'SCANNED', 'IMPORTED'));

-- 3. Scanned prescription image (phase 2 — manual upload → OCR)
ALTER TABLE prescription
  ADD COLUMN IF NOT EXISTS prescription_image_url TEXT,
  ADD COLUMN IF NOT EXISTS ocr_raw_text           TEXT,
  ADD COLUMN IF NOT EXISTS ocr_confidence         NUMERIC(4,3); -- 0.000–1.000

-- 4. Verification — doctor confirms a receptionist-entered prescription
--    (important: receptionist enters, doctor reviews and signs off)
ALTER TABLE prescription
  ADD COLUMN IF NOT EXISTS verified_by_doctor     BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS verified_at            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_by_doctor_id  UUID REFERENCES doctor(id);

-- 5. Index for looking up prescriptions by who entered them
CREATE INDEX IF NOT EXISTS idx_prescription_entered_by
  ON prescription(entered_by);

-- 6. Index for unverified receptionist-entered prescriptions
--    (so doctor can quickly find ones needing sign-off)
CREATE INDEX IF NOT EXISTS idx_prescription_unverified
  ON prescription(doctor_id, verified_by_doctor)
  WHERE verified_by_doctor = FALSE AND entry_method = 'RECEPTIONIST';

COMMENT ON COLUMN prescription.entered_by IS
  'auth.users.id of person who typed this into the system (doctor, receptionist, or system)';
COMMENT ON COLUMN prescription.entry_method IS
  'DOCTOR_DIRECT=typed by doctor | RECEPTIONIST=transcribed from paper | SCANNED=OCR from image | IMPORTED=external';
COMMENT ON COLUMN prescription.prescription_image_url IS
  'Storage URL of scanned paper prescription (phase 2 feature)';
COMMENT ON COLUMN prescription.verified_by_doctor IS
  'True once the prescribing doctor has reviewed and confirmed a receptionist-entered prescription';
