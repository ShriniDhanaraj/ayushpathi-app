-- ─────────────────────────────────────────────────────────────────────────────
-- Fix Near-Me search (was returning 0 results)
-- Problems fixed:
--   1. RPC param names (lat/lng → p_lat/p_lng/p_radius_km, to match API route)
--   2. Wrong column refs: full_name → first_name||last_name, phone → mobile,
--      specialization → ayush_specialization
--   3. Return fields renamed to match what near-me page expects
--      (doctor_id→id, address_city→city, address_state→state)
--   4. Add years_of_experience, teleconsult_enabled, teleconsult_fee to output
--   5. Seed lat/lng for original 6 seeded doctors (addendum from seed.sql)
--   6. Add lat/lng to multilang 8 doctors' address rows (inserted without coords)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Fix the RPC ────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS doctors_near_location(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION);

CREATE OR REPLACE FUNCTION doctors_near_location(
  p_lat       DOUBLE PRECISION,
  p_lng       DOUBLE PRECISION,
  p_radius_km DOUBLE PRECISION DEFAULT 10
)
RETURNS TABLE (
  id                   UUID,
  first_name           TEXT,
  last_name            TEXT,
  ayush_specialization TEXT,
  mobile               TEXT,
  years_of_experience  INTEGER,
  teleconsult_enabled  BOOLEAN,
  teleconsult_fee      DECIMAL,
  languages_spoken     TEXT[],
  distance_km          DOUBLE PRECISION,
  city                 TEXT,
  state                TEXT,
  latitude             DOUBLE PRECISION,
  longitude            DOUBLE PRECISION
)
LANGUAGE sql STABLE AS $$
  SELECT
    d.id,
    d.first_name,
    d.last_name,
    d.ayush_specialization,
    d.mobile,
    d.years_of_experience,
    d.teleconsult_enabled,
    d.teleconsult_fee,
    d.languages_spoken,
    (6371 * acos(
      LEAST(1.0,
        cos(radians(p_lat)) * cos(radians(a.latitude))
        * cos(radians(a.longitude) - radians(p_lng))
        + sin(radians(p_lat)) * sin(radians(a.latitude))
      )
    ))              AS distance_km,
    a.city,
    a.state,
    a.latitude,
    a.longitude
  FROM doctor d
  JOIN address a ON a.id = d.address_id
  WHERE
    d.verification_status = 'APPROVED'
    AND a.latitude  IS NOT NULL
    AND a.longitude IS NOT NULL
    AND (6371 * acos(
      LEAST(1.0,
        cos(radians(p_lat)) * cos(radians(a.latitude))
        * cos(radians(a.longitude) - radians(p_lng))
        + sin(radians(p_lat)) * sin(radians(a.latitude))
      )
    )) <= p_radius_km
  ORDER BY distance_km
$$;

COMMENT ON FUNCTION doctors_near_location IS
  'Approved doctors within p_radius_km of (p_lat, p_lng). Param names use p_ prefix to match API route.';


-- ── 2. Original 6 seeded doctors — address rows with lat/lng ─────────────────
INSERT INTO address (id, door_number, street, area, city, district, state, pincode, latitude, longitude) VALUES
  ('a2000000-0000-0000-0000-000000000001', '14',  'Nungambakkam High Rd', 'Nungambakkam', 'Chennai',   'Chennai',   'Tamil Nadu', '600034', 13.0569, 80.2432),
  ('a2000000-0000-0000-0000-000000000002', '9',   'TTK Road',             'Alwarpet',     'Chennai',   'Chennai',   'Tamil Nadu', '600018', 13.0343, 80.2480),
  ('a2000000-0000-0000-0000-000000000003', '33',  'Convent Road',         'Ernakulam',    'Kochi',     'Ernakulam', 'Kerala',     '682011',  9.9757, 76.2897),
  ('a2000000-0000-0000-0000-000000000004', '7',   'Koramangala',          '5th Block',    'Bengaluru', 'Bengaluru', 'Karnataka',  '560095', 12.9352, 77.6245),
  ('a2000000-0000-0000-0000-000000000005', '101', 'Adyar',                'Besant Nagar', 'Chennai',   'Chennai',   'Tamil Nadu', '600090', 13.0002, 80.2566),
  ('a2000000-0000-0000-0000-000000000006', '55',  'Kaloor Junction',      'Kaloor',       'Kochi',     'Ernakulam', 'Kerala',     '682017', 10.0069, 76.3015)
ON CONFLICT (id) DO UPDATE SET
  latitude  = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude;

UPDATE doctor SET address_id = 'a2000000-0000-0000-0000-000000000001' WHERE id = 'd1000000-0000-0000-0000-000000000001'; -- Dr. Arjun Sharma (Chennai)
UPDATE doctor SET address_id = 'a2000000-0000-0000-0000-000000000002' WHERE id = 'd1000000-0000-0000-0000-000000000002'; -- Dr. Priya Nair (Chennai)
UPDATE doctor SET address_id = 'a2000000-0000-0000-0000-000000000001' WHERE id = 'd1000000-0000-0000-0000-000000000003'; -- Dr. Venkat Rao (Chennai)
UPDATE doctor SET address_id = 'a2000000-0000-0000-0000-000000000003' WHERE id = 'd1000000-0000-0000-0000-000000000004'; -- Dr. Meena Pillai (Kochi)
UPDATE doctor SET address_id = 'a2000000-0000-0000-0000-000000000005' WHERE id = 'd1000000-0000-0000-0000-000000000005'; -- Dr. Suresh Kumar (Chennai)
UPDATE doctor SET address_id = 'a2000000-0000-0000-0000-000000000006' WHERE id = 'd1000000-0000-0000-0000-000000000006'; -- Dr. Kavitha Menon (Kochi)


-- ── 3. Multilang 8 doctors — add lat/lng to their address rows ────────────────
UPDATE address a SET
  latitude  = coords.lat,
  longitude = coords.lng
FROM (
  SELECT d.address_id, c.lat, c.lng
  FROM doctor d
  JOIN (VALUES
    ('dr.murugan@demo.ayushpathi.in',    13.0418,  80.2341),  -- Chennai, T. Nagar
    ('dr.meenakshi@demo.ayushpathi.in',  13.0569,  80.2432),  -- Chennai, Nungambakkam
    ('dr.arun@demo.ayushpathi.in',        8.5241,  76.9366),  -- Thiruvananthapuram
    ('dr.shivaprasad@demo.ayushpathi.in',12.9279,  77.5783),  -- Bengaluru, Jayanagar
    ('dr.naseem@demo.ayushpathi.in',     18.9545,  72.8350),  -- Mumbai, Bhendi Bazaar
    ('dr.pooja@demo.ayushpathi.in',      28.5672,  77.2360),  -- New Delhi, Lajpat Nagar
    ('dr.padmavathi@demo.ayushpathi.in', 17.4239,  78.4738),  -- Hyderabad, Banjara Hills
    ('dr.debabrata@demo.ayushpathi.in',  22.5194,  88.3647)   -- Kolkata, Gariahat
  ) AS c(email, lat, lng) ON d.email = c.email
  WHERE d.address_id IS NOT NULL
) AS coords
WHERE a.id = coords.address_id;


-- ── Verify ────────────────────────────────────────────────────────────────────
-- SELECT d.first_name, d.last_name, d.ayush_specialization, a.city, a.latitude, a.longitude
-- FROM doctor d JOIN address a ON a.id = d.address_id
-- WHERE d.verification_status = 'APPROVED'
-- ORDER BY a.city;
