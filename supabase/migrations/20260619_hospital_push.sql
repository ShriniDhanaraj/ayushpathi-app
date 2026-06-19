-- ============================================================
-- Migration: Hospital, Push Tokens, Lat/Lng on Address
-- ============================================================

-- 1. Add lat/lng columns to address table
ALTER TABLE address
  ADD COLUMN IF NOT EXISTS latitude  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- 2. Create hospital table (if not exists)
CREATE TABLE IF NOT EXISTS hospital (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,
  registration_no       TEXT NOT NULL UNIQUE,
  phone                 TEXT,
  email                 TEXT,
  website               TEXT,
  address_id            UUID REFERENCES address(id) ON DELETE SET NULL,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  ayush_specializations TEXT[] NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create doctor_hospital join table
CREATE TABLE IF NOT EXISTS doctor_hospital (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id   UUID NOT NULL REFERENCES doctor(id) ON DELETE CASCADE,
  hospital_id UUID NOT NULL REFERENCES hospital(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'VISITING'
                CHECK (role IN ('VISITING', 'RESIDENT', 'CONSULTANT')),
  is_primary  BOOLEAN NOT NULL DEFAULT FALSE,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (doctor_id, hospital_id)
);

-- 4. Create device_push_token table
CREATE TABLE IF NOT EXISTS device_push_token (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token      TEXT NOT NULL,
  platform   TEXT NOT NULL DEFAULT 'expo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, token)
);

-- 5. RLS: hospital (admin-only writes, public reads)
ALTER TABLE hospital ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hospital_read" ON hospital;
CREATE POLICY "hospital_read" ON hospital FOR SELECT USING (true);

ALTER TABLE doctor_hospital ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "doctor_hospital_read" ON doctor_hospital;
CREATE POLICY "doctor_hospital_read" ON doctor_hospital FOR SELECT USING (true);

ALTER TABLE device_push_token ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "push_token_own" ON device_push_token;
CREATE POLICY "push_token_own" ON device_push_token
  FOR ALL USING (auth.uid() = user_id);

-- 6. Update doctors_near_location RPC to include hospital affiliations
-- (drop old version if exists, recreate with extended return type)
DROP FUNCTION IF EXISTS doctors_near_location(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION);

CREATE OR REPLACE FUNCTION doctors_near_location(
  lat   DOUBLE PRECISION,
  lng   DOUBLE PRECISION,
  radius_km DOUBLE PRECISION DEFAULT 10
)
RETURNS TABLE (
  doctor_id         UUID,
  full_name         TEXT,
  specialization    TEXT,
  phone             TEXT,
  distance_km       DOUBLE PRECISION,
  address_city      TEXT,
  address_state     TEXT,
  latitude          DOUBLE PRECISION,
  longitude         DOUBLE PRECISION
)
LANGUAGE sql STABLE AS $$
  SELECT
    d.id                                                           AS doctor_id,
    d.full_name,
    d.specialization,
    d.phone,
    (6371 * acos(
      cos(radians(lat)) * cos(radians(a.latitude))
      * cos(radians(a.longitude) - radians(lng))
      + sin(radians(lat)) * sin(radians(a.latitude))
    ))                                                             AS distance_km,
    a.city                                                         AS address_city,
    a.state                                                        AS address_state,
    a.latitude,
    a.longitude
  FROM doctor d
  JOIN address a ON a.id = d.address_id
  WHERE
    d.verification_status = 'APPROVED'
    AND a.latitude  IS NOT NULL
    AND a.longitude IS NOT NULL
    AND (6371 * acos(
      cos(radians(lat)) * cos(radians(a.latitude))
      * cos(radians(a.longitude) - radians(lng))
      + sin(radians(lat)) * sin(radians(a.latitude))
    )) <= radius_km
  ORDER BY distance_km
$$;
