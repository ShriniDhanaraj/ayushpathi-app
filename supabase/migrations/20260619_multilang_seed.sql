-- =============================================================
-- Ayushpathi — Multilingual Seed Data
-- Migration: 20260619_multilang_seed.sql
-- Depends on: 20260619_multilang.sql (run that first)
--
-- Populates language fields for existing patients and doctors
-- with realistic Indian multi-lingual profiles.
-- Run order: LAST — after all schema migrations.
-- =============================================================

-- ---------------------------------------------------------------
-- STRATEGY
-- Each patient/doctor is assigned languages based on their state
-- (derived from their address). This mirrors real India demographics.
-- ---------------------------------------------------------------

-- ---------------------------------------------------------------
-- HELPER: derive state → primary language mapping
-- ---------------------------------------------------------------
-- Tamil Nadu       → TA (Tamil)
-- Karnataka        → KN (Kannada)
-- Kerala           → ML (Malayalam)
-- Andhra Pradesh   → TE (Telugu)
-- Telangana        → TE (Telugu)
-- West Bengal      → BN (Bengali)
-- Gujarat          → GU (Gujarati)
-- Maharashtra      → MR (Marathi)
-- Punjab           → PA (Punjabi)
-- Delhi / UP / Bihar / Rajasthan / MP / Haryana / HP / Uttarakhand → HI (Hindi)
-- All others       → EN (English as default)
-- ---------------------------------------------------------------

-- ---------------------------------------------------------------
-- 1. UPDATE PATIENTS — language fields
-- ---------------------------------------------------------------

-- We use a CASE on address.state for the primary language derivation.
-- known_languages always includes the state language + EN.
-- ui_language = state's primary language.
-- preferred_interaction_language = state's primary language.

WITH state_lang AS (
  SELECT
    p.id AS patient_id,
    a.state,
    CASE
      WHEN a.state ILIKE '%Tamil Nadu%'                             THEN 'TA'
      WHEN a.state ILIKE '%Karnataka%'                              THEN 'KN'
      WHEN a.state ILIKE '%Kerala%'                                 THEN 'ML'
      WHEN a.state ILIKE '%Andhra Pradesh%'                         THEN 'TE'
      WHEN a.state ILIKE '%Telangana%'                              THEN 'TE'
      WHEN a.state ILIKE '%West Bengal%'                            THEN 'BN'
      WHEN a.state ILIKE '%Gujarat%'                                THEN 'GU'
      WHEN a.state ILIKE '%Maharashtra%'                            THEN 'MR'
      WHEN a.state ILIKE '%Punjab%'                                 THEN 'PA'
      WHEN a.state ILIKE '%Odisha%' OR a.state ILIKE '%Orissa%'    THEN 'OR'
      WHEN a.state ILIKE '%Assam%'                                  THEN 'AS'
      WHEN a.state ILIKE ANY(ARRAY[
        '%Delhi%','%Uttar Pradesh%','%Bihar%','%Rajasthan%',
        '%Madhya Pradesh%','%Haryana%','%Himachal Pradesh%',
        '%Uttarakhand%','%Jharkhand%','%Chhattisgarh%'
      ])                                                            THEN 'HI'
      ELSE 'EN'
    END AS primary_lang
  FROM patient p
  LEFT JOIN address a ON a.id = p.address_id
  WHERE p.ui_language = 'EN'   -- only rows not yet populated
    AND (p.known_languages IS NULL OR p.known_languages = '{}')
)
UPDATE patient p
SET
  ui_language                   = sl.primary_lang,
  preferred_interaction_language = sl.primary_lang,
  known_languages               = CASE
    WHEN sl.primary_lang = 'EN' THEN ARRAY['EN']
    ELSE ARRAY[sl.primary_lang, 'EN']
  END,
  updated_at = NOW()
FROM state_lang sl
WHERE p.id = sl.patient_id;

-- ---------------------------------------------------------------
-- 2. UPDATE DOCTORS — ui_language + extend languages_spoken
-- ---------------------------------------------------------------

-- Doctors can typically speak their state language + Hindi (if North India)
-- or Tamil/Kannada + English. We also set ui_language.

WITH doc_lang AS (
  SELECT
    d.id AS doctor_id,
    a.state,
    CASE
      WHEN a.state ILIKE '%Tamil Nadu%'       THEN 'TA'
      WHEN a.state ILIKE '%Karnataka%'         THEN 'KN'
      WHEN a.state ILIKE '%Kerala%'            THEN 'ML'
      WHEN a.state ILIKE '%Andhra Pradesh%'    THEN 'TE'
      WHEN a.state ILIKE '%Telangana%'         THEN 'TE'
      WHEN a.state ILIKE '%West Bengal%'       THEN 'BN'
      WHEN a.state ILIKE '%Gujarat%'           THEN 'GU'
      WHEN a.state ILIKE '%Maharashtra%'       THEN 'MR'
      WHEN a.state ILIKE '%Punjab%'            THEN 'PA'
      WHEN a.state ILIKE '%Odisha%' OR a.state ILIKE '%Orissa%'  THEN 'OR'
      WHEN a.state ILIKE '%Assam%'             THEN 'AS'
      WHEN a.state ILIKE ANY(ARRAY[
        '%Delhi%','%Uttar Pradesh%','%Bihar%','%Rajasthan%',
        '%Madhya Pradesh%','%Haryana%','%Himachal Pradesh%',
        '%Uttarakhand%','%Jharkhand%','%Chhattisgarh%'
      ])                                        THEN 'HI'
      ELSE 'EN'
    END AS primary_lang
  FROM doctor d
  LEFT JOIN address a ON a.id = d.address_id
  WHERE d.ui_language = 'EN'
)
UPDATE doctor d
SET
  ui_language   = dl.primary_lang,
  -- Extend languages_spoken: add primary_lang and EN if not already present
  languages_spoken = (
    SELECT array_agg(DISTINCT lang ORDER BY lang)
    FROM unnest(
      COALESCE(d.languages_spoken, '{}') ||
      ARRAY[dl.primary_lang, 'EN']
    ) AS lang
  ),
  updated_at = NOW()
FROM doc_lang dl
WHERE d.id = dl.doctor_id;

-- ---------------------------------------------------------------
-- 3. FABRICATED DEMO PATIENTS — insert 8 diverse language profiles
--    (wrapped in DO block so we can use variables)
-- ---------------------------------------------------------------

DO $$
DECLARE
  addr_id UUID;
BEGIN

  -- Patient 1: Tamil Nadu — speaks Tamil + English
  INSERT INTO address (door_number, street, area, city, district, state, pincode, country)
  VALUES ('42A', 'Anna Salai', 'T. Nagar', 'Chennai', 'Chennai', 'Tamil Nadu', '600017', 'India')
  RETURNING id INTO addr_id;

  INSERT INTO patient (
    first_name, last_name, date_of_birth, gender, email, mobile,
    whatsapp_enabled, address_id,
    known_languages, ui_language, preferred_interaction_language,
    communication_consent
  ) VALUES (
    'Kavitha', 'Subramanian', '1985-03-12', 'F',
    'kavitha.subramanian@demo.ayushpathi.in', '+919876543201',
    TRUE, addr_id,
    ARRAY['TA', 'EN'], 'TA', 'TA',
    ARRAY['WHATSAPP', 'EMAIL']
  ) ON CONFLICT (email) DO NOTHING;

  -- Patient 2: Karnataka — Kannada + English
  INSERT INTO address (door_number, street, area, city, district, state, pincode, country)
  VALUES ('15', 'MG Road', 'Indiranagar', 'Bengaluru', 'Bengaluru Urban', 'Karnataka', '560038', 'India')
  RETURNING id INTO addr_id;

  INSERT INTO patient (
    first_name, last_name, date_of_birth, gender, email, mobile,
    whatsapp_enabled, address_id,
    known_languages, ui_language, preferred_interaction_language,
    communication_consent
  ) VALUES (
    'Rajesh', 'Gowda', '1978-11-22', 'M',
    'rajesh.gowda@demo.ayushpathi.in', '+919876543202',
    TRUE, addr_id,
    ARRAY['KN', 'EN', 'HI'], 'KN', 'KN',
    ARRAY['WHATSAPP']
  ) ON CONFLICT (email) DO NOTHING;

  -- Patient 3: Kerala — Malayalam + English
  INSERT INTO address (door_number, street, area, city, district, state, pincode, country)
  VALUES ('8/12', 'MG Road', 'Ernakulam', 'Kochi', 'Ernakulam', 'Kerala', '682016', 'India')
  RETURNING id INTO addr_id;

  INSERT INTO patient (
    first_name, last_name, date_of_birth, gender, email, mobile,
    whatsapp_enabled, address_id,
    known_languages, ui_language, preferred_interaction_language,
    communication_consent
  ) VALUES (
    'Priya', 'Nair', '1990-07-04', 'F',
    'priya.nair@demo.ayushpathi.in', '+919876543203',
    FALSE, addr_id,
    ARRAY['ML', 'EN'], 'ML', 'ML',
    ARRAY['EMAIL', 'SMS']
  ) ON CONFLICT (email) DO NOTHING;

  -- Patient 4: Andhra Pradesh — Telugu + Hindi + English
  INSERT INTO address (door_number, street, area, city, district, state, pincode, country)
  VALUES ('21', 'Abids Road', 'Abids', 'Hyderabad', 'Hyderabad', 'Andhra Pradesh', '500001', 'India')
  RETURNING id INTO addr_id;

  INSERT INTO patient (
    first_name, last_name, date_of_birth, gender, email, mobile,
    whatsapp_enabled, address_id,
    known_languages, ui_language, preferred_interaction_language,
    communication_consent
  ) VALUES (
    'Venkata', 'Rao', '1972-05-18', 'M',
    'venkata.rao@demo.ayushpathi.in', '+919876543204',
    TRUE, addr_id,
    ARRAY['TE', 'HI', 'EN'], 'TE', 'TE',
    ARRAY['WHATSAPP', 'EMAIL']
  ) ON CONFLICT (email) DO NOTHING;

  -- Patient 5: Maharashtra — Marathi + Hindi + English
  INSERT INTO address (door_number, street, area, city, district, state, pincode, country)
  VALUES ('5', 'FC Road', 'Shivajinagar', 'Pune', 'Pune', 'Maharashtra', '411005', 'India')
  RETURNING id INTO addr_id;

  INSERT INTO patient (
    first_name, last_name, date_of_birth, gender, email, mobile,
    whatsapp_enabled, address_id,
    known_languages, ui_language, preferred_interaction_language,
    communication_consent
  ) VALUES (
    'Sunita', 'Patil', '1983-09-30', 'F',
    'sunita.patil@demo.ayushpathi.in', '+919876543205',
    TRUE, addr_id,
    ARRAY['MR', 'HI', 'EN'], 'MR', 'MR',
    ARRAY['WHATSAPP']
  ) ON CONFLICT (email) DO NOTHING;

  -- Patient 6: West Bengal — Bengali + Hindi + English
  INSERT INTO address (door_number, street, area, city, district, state, pincode, country)
  VALUES ('12', 'Park Street', 'Park Circus', 'Kolkata', 'Kolkata', 'West Bengal', '700016', 'India')
  RETURNING id INTO addr_id;

  INSERT INTO patient (
    first_name, last_name, date_of_birth, gender, email, mobile,
    whatsapp_enabled, address_id,
    known_languages, ui_language, preferred_interaction_language,
    communication_consent
  ) VALUES (
    'Arnab', 'Chatterjee', '1968-02-14', 'M',
    'arnab.chatterjee@demo.ayushpathi.in', '+919876543206',
    FALSE, addr_id,
    ARRAY['BN', 'EN'], 'BN', 'BN',
    ARRAY['EMAIL']
  ) ON CONFLICT (email) DO NOTHING;

  -- Patient 7: Gujarat — Gujarati + Hindi + English
  INSERT INTO address (door_number, street, area, city, district, state, pincode, country)
  VALUES ('7', 'CG Road', 'Navrangpura', 'Ahmedabad', 'Ahmedabad', 'Gujarat', '380009', 'India')
  RETURNING id INTO addr_id;

  INSERT INTO patient (
    first_name, last_name, date_of_birth, gender, email, mobile,
    whatsapp_enabled, address_id,
    known_languages, ui_language, preferred_interaction_language,
    communication_consent
  ) VALUES (
    'Hardik', 'Shah', '1994-12-01', 'M',
    'hardik.shah@demo.ayushpathi.in', '+919876543207',
    TRUE, addr_id,
    ARRAY['GU', 'HI', 'EN'], 'GU', 'GU',
    ARRAY['WHATSAPP', 'EMAIL']
  ) ON CONFLICT (email) DO NOTHING;

  -- Patient 8: Delhi — Hindi + English
  -- Note: English ui_language but prefers Hindi for consultation
  INSERT INTO address (door_number, street, area, city, district, state, pincode, country)
  VALUES ('3B', 'Connaught Place', 'CP', 'New Delhi', 'New Delhi', 'Delhi', '110001', 'India')
  RETURNING id INTO addr_id;

  INSERT INTO patient (
    first_name, last_name, date_of_birth, gender, email, mobile,
    whatsapp_enabled, address_id,
    known_languages, ui_language, preferred_interaction_language,
    communication_consent
  ) VALUES (
    'Ritu', 'Sharma', '1987-06-25', 'F',
    'ritu.sharma@demo.ayushpathi.in', '+919876543208',
    TRUE, addr_id,
    ARRAY['HI', 'EN'], 'EN', 'HI',   -- UI in English, consults in Hindi
    ARRAY['WHATSAPP', 'EMAIL', 'SMS']
  ) ON CONFLICT (email) DO NOTHING;

END $$;

-- ---------------------------------------------------------------
-- 4. FABRICATED DEMO DOCTORS — diverse language profiles
-- ---------------------------------------------------------------

DO $$
DECLARE
  addr_id UUID;
BEGIN

  -- Doctor 1: Ayurvedic — Tamil Nadu, speaks TA + EN
  INSERT INTO address (door_number, street, area, city, district, state, pincode, country)
  VALUES ('1', 'Usman Road', 'T. Nagar', 'Chennai', 'Chennai', 'Tamil Nadu', '600017', 'India')
  RETURNING id INTO addr_id;

  INSERT INTO doctor (
    first_name, last_name, gender, mobile, email,
    registration_number, registration_council, degrees,
    ayush_specialization, years_of_experience,
    languages_spoken, ui_language,
    address_id, verification_status
  ) VALUES (
    'Murugan', 'Arumugam', 'M', '+919988776601', 'dr.murugan@demo.ayushpathi.in',
    'TNBIM-10001', 'Tamil Nadu Board of Indian Medicine', ARRAY['BAMS', 'MD (Ayurveda)'],
    'AYU', 18,
    ARRAY['TA', 'EN'], 'TA',
    addr_id, 'APPROVED'
  ) ON CONFLICT (email) DO NOTHING;

  -- Doctor 2: Siddha — Tamil Nadu, speaks TA + EN + HI (North Indian patients)
  INSERT INTO address (door_number, street, area, city, district, state, pincode, country)
  VALUES ('22', 'Nungambakkam High Road', 'Nungambakkam', 'Chennai', 'Chennai', 'Tamil Nadu', '600034', 'India')
  RETURNING id INTO addr_id;

  INSERT INTO doctor (
    first_name, last_name, gender, mobile, email,
    registration_number, registration_council, degrees,
    ayush_specialization, years_of_experience,
    languages_spoken, ui_language,
    address_id, verification_status
  ) VALUES (
    'Meenakshi', 'Sundaram', 'F', '+919988776602', 'dr.meenakshi@demo.ayushpathi.in',
    'TNBIM-10002', 'Tamil Nadu Board of Indian Medicine', ARRAY['BSMS', 'MD (Siddha)'],
    'SID', 12,
    ARRAY['TA', 'EN', 'HI'], 'TA',
    addr_id, 'APPROVED'
  ) ON CONFLICT (email) DO NOTHING;

  -- Doctor 3: Homeopathy — Kerala, speaks ML + EN
  INSERT INTO address (door_number, street, area, city, district, state, pincode, country)
  VALUES ('4', 'Statue Junction', 'Palayam', 'Thiruvananthapuram', 'Thiruvananthapuram', 'Kerala', '695001', 'India')
  RETURNING id INTO addr_id;

  INSERT INTO doctor (
    first_name, last_name, gender, mobile, email,
    registration_number, registration_council, degrees,
    ayush_specialization, years_of_experience,
    languages_spoken, ui_language,
    address_id, verification_status
  ) VALUES (
    'Arun', 'Krishnakumar', 'M', '+919988776603', 'dr.arun@demo.ayushpathi.in',
    'KSBIM-20001', 'Kerala State Board of Indian Medicine', ARRAY['BHMS', 'MD (Homeopathy)'],
    'HOM', 9,
    ARRAY['ML', 'EN', 'TA'], 'ML',
    addr_id, 'APPROVED'
  ) ON CONFLICT (email) DO NOTHING;

  -- Doctor 4: Ayurveda — Karnataka, speaks KN + EN + TE
  INSERT INTO address (door_number, street, area, city, district, state, pincode, country)
  VALUES ('78', 'Jayanagar 4th Block', 'Jayanagar', 'Bengaluru', 'Bengaluru Urban', 'Karnataka', '560041', 'India')
  RETURNING id INTO addr_id;

  INSERT INTO doctor (
    first_name, last_name, gender, mobile, email,
    registration_number, registration_council, degrees,
    ayush_specialization, years_of_experience,
    languages_spoken, ui_language,
    address_id, verification_status
  ) VALUES (
    'Shivaprasad', 'Hegde', 'M', '+919988776604', 'dr.shivaprasad@demo.ayushpathi.in',
    'KAUPB-30001', 'Karnataka Ayurvedic & Unani Practitioners Board', ARRAY['BAMS'],
    'AYU', 22,
    ARRAY['KN', 'EN', 'TE'], 'KN',
    addr_id, 'APPROVED'
  ) ON CONFLICT (email) DO NOTHING;

  -- Doctor 5: Unani — Maharashtra, speaks MR + HI + UR + EN
  INSERT INTO address (door_number, street, area, city, district, state, pincode, country)
  VALUES ('9', 'Bhendi Bazaar', 'Dongri', 'Mumbai', 'Mumbai City', 'Maharashtra', '400009', 'India')
  RETURNING id INTO addr_id;

  INSERT INTO doctor (
    first_name, last_name, gender, mobile, email,
    registration_number, registration_council, degrees,
    ayush_specialization, years_of_experience,
    languages_spoken, ui_language,
    address_id, verification_status
  ) VALUES (
    'Naseem', 'Qureshi', 'M', '+919988776605', 'dr.naseem@demo.ayushpathi.in',
    'MCIM-40001', 'Maharashtra Council of Indian Medicine', ARRAY['BUMS'],
    'UNA', 15,
    ARRAY['UR', 'HI', 'MR', 'EN'], 'EN',
    addr_id, 'APPROVED'
  ) ON CONFLICT (email) DO NOTHING;

  -- Doctor 6: Yoga & Naturopathy — Delhi, speaks HI + EN
  INSERT INTO address (door_number, street, area, city, district, state, pincode, country)
  VALUES ('45', 'Lajpat Nagar II', 'Lajpat Nagar', 'New Delhi', 'South Delhi', 'Delhi', '110024', 'India')
  RETURNING id INTO addr_id;

  INSERT INTO doctor (
    first_name, last_name, gender, mobile, email,
    registration_number, registration_council, degrees,
    ayush_specialization, years_of_experience,
    languages_spoken, ui_language,
    address_id, verification_status
  ) VALUES (
    'Pooja', 'Aggarwal', 'F', '+919988776606', 'dr.pooja@demo.ayushpathi.in',
    'CCIM-50001', 'Central Council of Indian Medicine (CCIM)', ARRAY['BNYS'],
    'YOG', 7,
    ARRAY['HI', 'EN', 'PA'], 'HI',
    addr_id, 'APPROVED'
  ) ON CONFLICT (email) DO NOTHING;

  -- Doctor 7: Ayurveda — Telugu doctor in Hyderabad, speaks TE + HI + EN
  INSERT INTO address (door_number, street, area, city, district, state, pincode, country)
  VALUES ('101', 'Banjara Hills Road No. 12', 'Banjara Hills', 'Hyderabad', 'Hyderabad', 'Telangana', '500034', 'India')
  RETURNING id INTO addr_id;

  INSERT INTO doctor (
    first_name, last_name, gender, mobile, email,
    registration_number, registration_council, degrees,
    ayush_specialization, years_of_experience,
    languages_spoken, ui_language,
    address_id, verification_status
  ) VALUES (
    'Padmavathi', 'Reddy', 'F', '+919988776607', 'dr.padmavathi@demo.ayushpathi.in',
    'CCIM-50002', 'Central Council of Indian Medicine (CCIM)', ARRAY['BAMS', 'MD (Ayurveda)'],
    'AYU', 20,
    ARRAY['TE', 'HI', 'EN'], 'TE',
    addr_id, 'APPROVED'
  ) ON CONFLICT (email) DO NOTHING;

  -- Doctor 8: Homeopathy — Bengali doctor in Kolkata, speaks BN + EN + HI
  INSERT INTO address (door_number, street, area, city, district, state, pincode, country)
  VALUES ('33', 'Gariahat Road', 'Gariahat', 'Kolkata', 'Kolkata', 'West Bengal', '700019', 'India')
  RETURNING id INTO addr_id;

  INSERT INTO doctor (
    first_name, last_name, gender, mobile, email,
    registration_number, registration_council, degrees,
    ayush_specialization, years_of_experience,
    languages_spoken, ui_language,
    address_id, verification_status
  ) VALUES (
    'Debabrata', 'Sen', 'M', '+919988776608', 'dr.debabrata@demo.ayushpathi.in',
    'CCH-60001', 'Central Council of Homeopathy (CCH)', ARRAY['BHMS'],
    'HOM', 11,
    ARRAY['BN', 'EN', 'HI'], 'BN',
    addr_id, 'APPROVED'
  ) ON CONFLICT (email) DO NOTHING;

END $$;

-- ---------------------------------------------------------------
-- 5. VERIFICATION QUERY (run after seeding to confirm data)
-- ---------------------------------------------------------------
-- SELECT id, first_name, last_name, ui_language, known_languages,
--        preferred_interaction_language
-- FROM patient
-- ORDER BY created_at DESC LIMIT 20;
--
-- SELECT id, first_name, last_name, ui_language, languages_spoken
-- FROM doctor
-- ORDER BY created_at DESC LIMIT 20;
