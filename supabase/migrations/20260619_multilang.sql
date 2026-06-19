-- =============================================================
-- Ayushpathi — Multilingual Support
-- Migration: 20260619_multilang.sql
-- Adds: lookup_language, patient language prefs, doctor ui_language
-- Run order: after 20260619_patient_identity.sql
-- =============================================================

-- ---------------------------------------------------------------
-- 1. LANGUAGE LOOKUP TABLE
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lookup_language (
  code         TEXT PRIMARY KEY,     -- e.g. 'EN', 'TA', 'HI'
  label        TEXT NOT NULL,        -- English label
  native_label TEXT NOT NULL         -- Label in the language itself
);

INSERT INTO lookup_language (code, label, native_label) VALUES
  ('EN', 'English',   'English'),
  ('HI', 'Hindi',     'हिन्दी'),
  ('TA', 'Tamil',     'தமிழ்'),
  ('TE', 'Telugu',    'తెలుగు'),
  ('KN', 'Kannada',   'ಕನ್ನಡ'),
  ('ML', 'Malayalam', 'മലയാളം'),
  ('BN', 'Bengali',   'বাংলা'),
  ('GU', 'Gujarati',  'ગુજરાતી'),
  ('MR', 'Marathi',   'मराठी'),
  ('PA', 'Punjabi',   'ਪੰਜਾਬੀ'),
  ('OR', 'Odia',      'ଓଡ଼ିଆ'),
  ('AS', 'Assamese',  'অসমীয়া'),
  ('UR', 'Urdu',      'اردو'),
  ('SA', 'Sanskrit',  'संस्कृतम्')
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------
-- 2. PATIENT — 3 language preference columns
-- ---------------------------------------------------------------

-- Languages the patient understands (≥1 required at app level)
ALTER TABLE patient
  ADD COLUMN IF NOT EXISTS known_languages TEXT[] NOT NULL DEFAULT '{EN}';

-- Preferred language for the app UI / login shell (always exactly 1)
ALTER TABLE patient
  ADD COLUMN IF NOT EXISTS ui_language TEXT NOT NULL DEFAULT 'EN'
  REFERENCES lookup_language(code);

-- Preferred language for doctor consultations (always exactly 1)
ALTER TABLE patient
  ADD COLUMN IF NOT EXISTS preferred_interaction_language TEXT NOT NULL DEFAULT 'EN'
  REFERENCES lookup_language(code);

-- ---------------------------------------------------------------
-- 3. DOCTOR — ui_language only (languages_spoken already exists from 001)
-- ---------------------------------------------------------------

ALTER TABLE doctor
  ADD COLUMN IF NOT EXISTS ui_language TEXT NOT NULL DEFAULT 'EN'
  REFERENCES lookup_language(code);

-- ---------------------------------------------------------------
-- 4. INDEXES for language-based doctor search
-- ---------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_doctor_languages_spoken_gin
  ON doctor USING GIN (languages_spoken);

CREATE INDEX IF NOT EXISTS idx_patient_known_languages_gin
  ON patient USING GIN (known_languages);

CREATE INDEX IF NOT EXISTS idx_patient_interaction_lang
  ON patient (preferred_interaction_language);

-- ---------------------------------------------------------------
-- 5. COLUMN COMMENTS
-- ---------------------------------------------------------------
COMMENT ON COLUMN patient.known_languages IS
  'Languages the patient can read/speak — multi-select, at least 1 required';
COMMENT ON COLUMN patient.ui_language IS
  'Preferred app UI / login shell language — always exactly 1 code from lookup_language';
COMMENT ON COLUMN patient.preferred_interaction_language IS
  'Preferred language for doctor consultations — always exactly 1 code from lookup_language';
COMMENT ON COLUMN doctor.ui_language IS
  'Preferred app UI language — always exactly 1 code from lookup_language';
COMMENT ON COLUMN doctor.languages_spoken IS
  'Languages the doctor can consult in — used as a patient search filter';
