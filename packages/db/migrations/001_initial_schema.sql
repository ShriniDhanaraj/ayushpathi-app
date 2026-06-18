-- =============================================================
-- Ayushpathi — Initial Database Schema
-- Migration: 001_initial_schema.sql
-- Generated from: AYUSHPATHI_Decisions_Log.md
-- =============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";      -- for lat/long geospatial queries

-- =============================================================
-- LOOKUP / REFERENCE TABLES
-- =============================================================

CREATE TABLE lookup_gender (
  code TEXT PRIMARY KEY,
  label TEXT NOT NULL
);
INSERT INTO lookup_gender VALUES ('M', 'Male'), ('F', 'Female'), ('U', 'Undisclosed');

CREATE TABLE lookup_ayush_specialization (
  code TEXT PRIMARY KEY,
  label TEXT NOT NULL
);
INSERT INTO lookup_ayush_specialization VALUES
  ('AYU', 'Ayurveda'),
  ('YOG', 'Yoga & Naturopathy'),
  ('UNA', 'Unani'),
  ('SID', 'Siddha'),
  ('HOM', 'Homeopathy');

CREATE TABLE lookup_verification_status (
  code TEXT PRIMARY KEY,
  label TEXT NOT NULL
);
INSERT INTO lookup_verification_status VALUES
  ('PENDING', 'Pending Review'),
  ('APPROVED', 'Approved'),
  ('REJECTED', 'Rejected');

CREATE TABLE lookup_consent_status (
  code TEXT PRIMARY KEY,
  label TEXT NOT NULL
);
INSERT INTO lookup_consent_status VALUES
  ('ACTIVE', 'Active'),
  ('REVOKED', 'Revoked');

CREATE TABLE lookup_day_of_week (
  code TEXT PRIMARY KEY,
  label TEXT NOT NULL
);
INSERT INTO lookup_day_of_week VALUES
  ('MON','Monday'),('TUE','Tuesday'),('WED','Wednesday'),
  ('THU','Thursday'),('FRI','Friday'),('SAT','Saturday'),('SUN','Sunday');

-- =============================================================
-- ADDRESS
-- =============================================================

CREATE TABLE address (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  door_number   TEXT,
  street        TEXT,
  area          TEXT,
  city          TEXT NOT NULL,
  district      TEXT,
  state         TEXT NOT NULL,
  pincode       TEXT,
  country       TEXT NOT NULL DEFAULT 'India',
  latitude      DECIMAL(10, 8),
  longitude     DECIMAL(11, 8),
  location      GEOGRAPHY(POINT, 4326),   -- PostGIS point for "near me" queries
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Index for geospatial "near me" searches
CREATE INDEX idx_address_location ON address USING GIST (location);

-- Auto-populate PostGIS point from lat/long
CREATE OR REPLACE FUNCTION sync_address_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_address_location
  BEFORE INSERT OR UPDATE ON address
  FOR EACH ROW EXECUTE FUNCTION sync_address_location();

-- =============================================================
-- PATIENT
-- =============================================================

CREATE TABLE patient (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Identity
  first_name            TEXT NOT NULL,
  last_name             TEXT NOT NULL,
  date_of_birth         DATE NOT NULL,
  gender                TEXT REFERENCES lookup_gender(code),
  profile_photo_url     TEXT,
  -- Contact
  email                 TEXT UNIQUE NOT NULL,
  mobile                TEXT NOT NULL,
  phone                 TEXT,                          -- landline, optional
  whatsapp_enabled      BOOLEAN DEFAULT FALSE,
  social_media          JSONB DEFAULT '{}',            -- {instagram, facebook, twitter, ...}
  communication_consent TEXT[] DEFAULT '{}',           -- ['SMS','WHATSAPP','EMAIL']
  -- Address
  address_id            UUID REFERENCES address(id),
  -- ABHA
  abha_id               TEXT UNIQUE,                  -- 14-digit Ayushman Bharat Health Account ID
  abha_verified         BOOLEAN DEFAULT FALSE,
  -- Auth (linked to Supabase Auth)
  auth_user_id          UUID UNIQUE,                  -- supabase.auth.users.id
  -- Timestamps
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Health history — collected from visit 2/3 onwards
CREATE TABLE patient_health_profile (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id            UUID NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
  known_conditions      TEXT[] DEFAULT '{}',           -- ['diabetes', 'hypertension']
  allergies             TEXT[] DEFAULT '{}',           -- ['penicillin', 'peanuts']
  current_medications   JSONB DEFAULT '[]',            -- [{name, dosage, frequency, since}]
  past_surgeries        JSONB DEFAULT '[]',            -- [{procedure, year, hospital}]
  family_history        JSONB DEFAULT '[]',            -- [{relation, condition}]
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (patient_id)   -- one health profile per patient
);

-- Patient family relationships (optional)
CREATE TABLE patient_relationship (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id      UUID NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
  related_to      UUID NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
  relationship    TEXT NOT NULL,                       -- 'spouse', 'parent', 'child', 'sibling'
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (patient_id, related_to)
);

-- =============================================================
-- HOSPITAL
-- =============================================================

CREATE TABLE hospital (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              TEXT NOT NULL,
  registration_no   TEXT,
  phone             TEXT,
  email             TEXT,
  website           TEXT,
  address_id        UUID REFERENCES address(id),
  active            BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- DOCTOR
-- =============================================================

CREATE TABLE doctor (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Identity
  first_name              TEXT NOT NULL,
  last_name               TEXT NOT NULL,
  date_of_birth           DATE,
  gender                  TEXT REFERENCES lookup_gender(code),
  profile_photo_url       TEXT,
  -- Contact
  email                   TEXT UNIQUE NOT NULL,
  mobile                  TEXT NOT NULL,
  whatsapp_enabled        BOOLEAN DEFAULT FALSE,
  -- Professional
  registration_number     TEXT NOT NULL,              -- MCI / State Council
  registration_council    TEXT NOT NULL,              -- e.g. Tamil Nadu Medical Council
  degrees                 TEXT[] DEFAULT '{}',         -- ['BSMS', 'MD']
  ayush_specialization    TEXT REFERENCES lookup_ayush_specialization(code),
  years_of_experience     INTEGER,
  languages_spoken        TEXT[] DEFAULT '{}',
  -- Teleconsultation (opt-in, off by default)
  teleconsult_enabled     BOOLEAN DEFAULT FALSE,
  teleconsult_fee         DECIMAL(10,2) DEFAULT 0,    -- in INR; 0 = free
  -- Verification
  degree_cert_url         TEXT,
  registration_cert_url   TEXT,
  verification_status     TEXT DEFAULT 'PENDING' REFERENCES lookup_verification_status(code),
  verified_by             UUID,                       -- FK to admin user (set after auth table exists)
  verified_at             TIMESTAMPTZ,
  rejection_reason        TEXT,
  -- Auth
  auth_user_id            UUID UNIQUE,               -- supabase.auth.users.id
  -- Timestamps
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Doctor availability (custom calendar — no Google Calendar dependency)
CREATE TABLE doctor_availability (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doctor_id       UUID NOT NULL REFERENCES doctor(id) ON DELETE CASCADE,
  day_of_week     TEXT NOT NULL REFERENCES lookup_day_of_week(code),
  start_time      TIME NOT NULL,
  end_time        TIME NOT NULL,
  slot_duration   INTEGER NOT NULL DEFAULT 15,        -- minutes
  active          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (doctor_id, day_of_week)
);

-- =============================================================
-- HOSPITAL ↔ DOCTOR (Many-to-Many)
-- =============================================================

CREATE TABLE hospital_doctor (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id   UUID NOT NULL REFERENCES hospital(id) ON DELETE CASCADE,
  doctor_id     UUID NOT NULL REFERENCES doctor(id) ON DELETE CASCADE,
  active        BOOLEAN DEFAULT TRUE,
  joined_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (hospital_id, doctor_id)
);

-- =============================================================
-- PATIENT ↔ DOCTOR CONSENT (Core of the access model)
-- =============================================================

CREATE TABLE patient_doctor_consent (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id      UUID NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
  doctor_id       UUID NOT NULL REFERENCES doctor(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'ACTIVE' REFERENCES lookup_consent_status(code),
  -- What the doctor can access
  share_full_history  BOOLEAN DEFAULT FALSE,          -- true = doctor sees all history, false = only new records
  -- Timestamps
  consented_at    TIMESTAMPTZ DEFAULT NOW(),
  revoked_at      TIMESTAMPTZ,
  UNIQUE (patient_id, doctor_id)
);

-- Index for fast consent checks
CREATE INDEX idx_consent_patient_doctor ON patient_doctor_consent(patient_id, doctor_id, status);

-- =============================================================
-- APPOINTMENTS
-- =============================================================

CREATE TABLE appointment (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id        UUID NOT NULL REFERENCES patient(id),
  doctor_id         UUID NOT NULL REFERENCES doctor(id),
  hospital_id       UUID REFERENCES hospital(id),
  appointment_date  DATE NOT NULL,
  start_time        TIME NOT NULL,
  end_time          TIME NOT NULL,
  type              TEXT NOT NULL DEFAULT 'F2F',      -- 'F2F' | 'TELECONSULT'
  status            TEXT NOT NULL DEFAULT 'BOOKED',  -- 'BOOKED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'
  booked_by_role    TEXT NOT NULL,                   -- 'PATIENT' | 'RECEPTIONIST'
  notes             TEXT,
  -- Teleconsult fields (null for F2F)
  teleconsult_url   TEXT,
  payment_status    TEXT,                            -- null | 'PENDING' | 'PAID' | 'REFUNDED'
  payment_amount    DECIMAL(10,2),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Prevent double-booking
CREATE UNIQUE INDEX idx_no_double_booking
  ON appointment(doctor_id, appointment_date, start_time)
  WHERE status NOT IN ('CANCELLED');

-- =============================================================
-- CONSULTATION RECORDS (Doctor writes, fully audited)
-- =============================================================

CREATE TABLE consultation (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id    UUID REFERENCES appointment(id),
  patient_id        UUID NOT NULL REFERENCES patient(id),
  doctor_id         UUID NOT NULL REFERENCES doctor(id),
  -- Health capture
  chief_complaint   TEXT,
  symptoms          TEXT[],
  diagnosis         TEXT,
  notes             TEXT,
  next_visit_date   DATE,
  -- Timestamps
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE prescription (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultation_id   UUID NOT NULL REFERENCES consultation(id) ON DELETE CASCADE,
  patient_id        UUID NOT NULL REFERENCES patient(id),
  doctor_id         UUID NOT NULL REFERENCES doctor(id),
  medicines         JSONB NOT NULL DEFAULT '[]',    -- [{name, dosage, frequency, duration, notes}]
  instructions      TEXT,
  is_repeat         BOOLEAN DEFAULT FALSE,          -- repetitive prescription flag
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- AUDIT LOG (Every write to medical records)
-- =============================================================

CREATE TABLE audit_log (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name    TEXT NOT NULL,
  record_id     UUID NOT NULL,
  action        TEXT NOT NULL,                      -- 'INSERT' | 'UPDATE' | 'DELETE'
  changed_by    UUID NOT NULL,                      -- auth_user_id
  changed_role  TEXT NOT NULL,                      -- role at time of change
  old_values    JSONB,
  new_values    JSONB,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying audit history on a record
CREATE INDEX idx_audit_record ON audit_log(table_name, record_id);

-- =============================================================
-- ROW LEVEL SECURITY (Supabase RLS — enforces consent model)
-- =============================================================

-- Enable RLS on all sensitive tables
ALTER TABLE patient ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_health_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_doctor_consent ENABLE ROW LEVEL SECURITY;

-- Patient can always see their own data
CREATE POLICY patient_own_data ON patient
  FOR ALL USING (auth.uid() = auth_user_id);

-- Doctor can only see patients who have given active consent
CREATE POLICY doctor_consented_patients ON patient
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM patient_doctor_consent pdc
      JOIN doctor d ON d.id = pdc.doctor_id
      WHERE pdc.patient_id = patient.id
        AND d.auth_user_id = auth.uid()
        AND pdc.status = 'ACTIVE'
    )
  );

-- Doctor can only read/write consultations for consented patients
CREATE POLICY doctor_consultation_access ON consultation
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM patient_doctor_consent pdc
      JOIN doctor d ON d.id = pdc.doctor_id
      WHERE pdc.patient_id = consultation.patient_id
        AND d.auth_user_id = auth.uid()
        AND pdc.status = 'ACTIVE'
    )
  );

-- =============================================================
-- UPDATED_AT auto-trigger
-- =============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_patient_updated_at BEFORE UPDATE ON patient FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_doctor_updated_at BEFORE UPDATE ON doctor FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_hospital_updated_at BEFORE UPDATE ON hospital FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_appointment_updated_at BEFORE UPDATE ON appointment FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_consultation_updated_at BEFORE UPDATE ON consultation FOR EACH ROW EXECUTE FUNCTION set_updated_at();
