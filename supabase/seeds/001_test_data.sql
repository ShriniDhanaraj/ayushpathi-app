-- ============================================================
-- Ayushpathi — Test Data Seed v2 (schema-verified)
-- Generated: 2026-06-19
-- Run in Supabase SQL Editor (postgres role, bypasses RLS)
-- Password for all test users: Ayush@2026!
-- ============================================================
-- Auth UUIDs (already created):
-- patient01@gmail.com    d9cbe42b-2170-4e8d-ae80-822dd371aa69
-- patient02@gmail.com    f87e6956-a7a7-44bd-a5ce-7d4a5ae787f3
-- patient03@gmail.com    2768e970-73d6-4bde-851b-663f4da9aac3
-- doctor_h01@gmail.com   aff25416-f9fe-4c1b-9fdc-ce0d31c078fc  Dr. Arjun Sharma, AYU
-- doctor_h02@gmail.com   7fe14587-5185-484f-89cf-8a1000a8282b  Dr. Priya Nair, HOM
-- doctor_grp01@gmail.com 0b13effe-67af-4710-bdc7-77762ab4ba9d  Dr. Venkat Rao, SID
-- doctor_grp02@gmail.com 46b3a587-eb27-4904-8cca-6ae0c8fbd3ca  Dr. Meena Pillai, YOG
-- doctor_01@gmail.com    59534387-2830-40e9-b599-a6df527d4926  Dr. Suresh Kumar, UNA (independent)
-- doctor_02@gmail.com    c5a1b4aa-2307-47cf-9fcd-a4e10f972435  Dr. Kavitha Menon, AYU (independent)
-- admin_h01@gmail.com    56339dd1-6b67-40f0-8b62-44bc83ece7bd  HOSPITAL scope
-- admin_h02@gmail.com    6285a10f-8116-45d5-b35e-75bfa8bf7c50  HOSPITAL scope
-- admin_grp01@gmail.com  9c7caad7-3e97-4523-8fd5-443621e02e3d  GROUP scope
-- admin_grp02@gmail.com  b6a2dab2-5fc4-41df-87b3-58380c0d7f1e  GROUP scope
-- recep_h01@gmail.com    4d375329-1c14-41ca-88ca-d8b1a0e84865
-- recep_h02@gmail.com    6e595fd1-db2e-4252-989d-8712d2c5de89
-- recep_grp01@gmail.com  73835b7f-e1ef-4f91-b41b-2614aaa6c9b6
-- recep_grp02@gmail.com  8c2378e6-08c8-49b0-9be6-3b9f6f031e95
-- ============================================================

BEGIN;

-- ── 1. ADDRESSES ─────────────────────────────────────────────
INSERT INTO address (id, door_number, street, area, city, district, state, pincode, latitude, longitude) VALUES
  ('a1000000-0000-0000-0000-000000000001', '12A', 'Anna Salai',        'Teynampet',     'Chennai',   'Chennai',   'Tamil Nadu', '600018', 13.0524, 80.2489),
  ('a1000000-0000-0000-0000-000000000002', '45B', 'MG Road',           'Nungambakkam',  'Chennai',   'Chennai',   'Tamil Nadu', '600034', 13.0604, 80.2496),
  ('a1000000-0000-0000-0000-000000000003', '7',   'MG Road',           'Ernakulam',     'Kochi',     'Ernakulam', 'Kerala',     '682016', 9.9816,  76.2999),
  ('a1000000-0000-0000-0000-000000000004', '22',  'Brigade Road',      'MG Road Area',  'Bengaluru', 'Bengaluru', 'Karnataka',  '560001', 12.9716, 77.5946),
  ('a1000000-0000-0000-0000-000000000011', '3',   'Luz Church Road',   'Mylapore',      'Chennai',   'Chennai',   'Tamil Nadu', '600004', 13.0358, 80.2667),
  ('a1000000-0000-0000-0000-000000000012', '88',  'Pantheon Road',     'Egmore',        'Chennai',   'Chennai',   'Tamil Nadu', '600008', 13.0710, 80.2623),
  ('a1000000-0000-0000-0000-000000000013', '5',   'Palarivattom',      'NH Bypass',     'Kochi',     'Ernakulam', 'Kerala',     '682025', 10.0159, 76.3085)
ON CONFLICT (id) DO NOTHING;

-- ── 2. HOSPITAL GROUPS ────────────────────────────────────────
-- hospital_group: id, name, description, is_active, whatsapp_number, created_at, updated_at, created_by, updated_by
INSERT INTO hospital_group (id, name, description, is_active, whatsapp_number) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'SunHealth AYUSH Group',    'Multi-hospital AYUSH chain across Tamil Nadu', TRUE, '919876500001'),
  ('b1000000-0000-0000-0000-000000000002', 'WestCoast Wellness Group', 'Kerala-based AYUSH hospital network',          TRUE, '919876500002')
ON CONFLICT (id) DO NOTHING;

-- ── 3. HOSPITALS ─────────────────────────────────────────────
-- hospital (from 001): id, name, registration_no, phone, email, website, address_id, active, created_at, updated_at
-- Added by migrations: hospital_group_id, whatsapp_number, created_by, updated_by
INSERT INTO hospital (id, name, registration_no, phone, email, website, address_id, active, hospital_group_id, whatsapp_number) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'Apollo Ayurveda & Wellness Chennai',   'TNMC-AYU-2021-001', '04428001001', 'apolloayush.chn@sunhealth.in', 'https://sunhealth.in', 'a1000000-0000-0000-0000-000000000001', TRUE, 'b1000000-0000-0000-0000-000000000001', '919840001001'),
  ('c1000000-0000-0000-0000-000000000002', 'Sri Dhanvantri Siddha Clinic Chennai', 'TNMC-SID-2020-007', '04428002002', 'dhanvantri.chn@sunhealth.in',  'https://sunhealth.in', 'a1000000-0000-0000-0000-000000000002', TRUE, 'b1000000-0000-0000-0000-000000000001', '919840001002'),
  ('c1000000-0000-0000-0000-000000000003', 'Kerala Ayur Center Kochi',              'KLMC-AYU-2019-015', '04842003003', 'keralaayur.kochi@westcoast.in','https://westcoast.in', 'a1000000-0000-0000-0000-000000000003', TRUE, 'b1000000-0000-0000-0000-000000000002', '919846003003'),
  ('c1000000-0000-0000-0000-000000000004', 'Harmony Homeopathy Bengaluru',          'KAMC-HOM-2022-003', '08022004004', 'harmony.blr@standalone.in',   NULL,                  'a1000000-0000-0000-0000-000000000004', TRUE, NULL,                                   '919900004004')
ON CONFLICT (id) DO NOTHING;

-- ── 4. DOCTORS ────────────────────────────────────────────────
-- doctor: id, first_name, last_name, email, mobile, registration_number, registration_council,
--   degrees, ayush_specialization (singular), years_of_experience, languages_spoken,
--   verification_status, teleconsult_enabled, teleconsult_fee, auth_user_id
INSERT INTO doctor (id, auth_user_id, first_name, last_name, email, mobile, registration_number, registration_council, ayush_specialization, years_of_experience, degrees, languages_spoken, verification_status, teleconsult_enabled, teleconsult_fee) VALUES
  ('d1000000-0000-0000-0000-000000000001', 'aff25416-f9fe-4c1b-9fdc-ce0d31c078fc', 'Arjun',  'Sharma', 'doctor_h01@gmail.com',   '9840101001', 'TNMC-AYU-9001', 'Tamil Nadu Ayurvedic Medical Council',   'AYU', 12, ARRAY['BAMS','MD(Ayu)'],  ARRAY['Tamil','English','Hindi'],        'APPROVED', TRUE,  500.00),
  ('d1000000-0000-0000-0000-000000000002', '7fe14587-5185-484f-89cf-8a1000a8282b', 'Priya',  'Nair',   'doctor_h02@gmail.com',   '9840102002', 'TNMC-HOM-9002', 'Tamil Nadu Homoeopathic Medical Council','HOM',  8, ARRAY['BHMS','MD(Hom)'], ARRAY['Tamil','English','Malayalam'],    'APPROVED', FALSE, 0.00),
  ('d1000000-0000-0000-0000-000000000003', '0b13effe-67af-4710-bdc7-77762ab4ba9d', 'Venkat', 'Rao',    'doctor_grp01@gmail.com', '9840103003', 'TNMC-SID-9003', 'Tamil Nadu Siddha Medical Council',     'SID', 15, ARRAY['BSMS','MD(Sid)'], ARRAY['Tamil','Telugu','English'],       'APPROVED', TRUE,  750.00),
  ('d1000000-0000-0000-0000-000000000004', '46b3a587-eb27-4904-8cca-6ae0c8fbd3ca', 'Meena',  'Pillai', 'doctor_grp02@gmail.com', '9846104004', 'KLMC-YOG-9004', 'Kerala State Yoga Medical Council',     'YOG',  6, ARRAY['BNYS'],           ARRAY['Malayalam','English','Tamil'],    'APPROVED', TRUE,  300.00),
  ('d1000000-0000-0000-0000-000000000005', '59534387-2830-40e9-b599-a6df527d4926', 'Suresh', 'Kumar',  'doctor_01@gmail.com',    '9940105005', 'TNMC-UNA-9005', 'Tamil Nadu Unani Medical Council',      'UNA', 20, ARRAY['BUMS','MD(Unani)'],ARRAY['Urdu','Tamil','English'],         'APPROVED', TRUE, 1000.00),
  ('d1000000-0000-0000-0000-000000000006', 'c5a1b4aa-2307-47cf-9fcd-a4e10f972435', 'Kavitha','Menon',  'doctor_02@gmail.com',    '9846106006', 'KLMC-AYU-9006', 'Kerala Ayurveda Medical Council',       'AYU', 10, ARRAY['BAMS'],            ARRAY['Malayalam','English'],            'APPROVED', FALSE, 0.00)
ON CONFLICT (id) DO NOTHING;

-- ── 5. LINK DOCTORS → HOSPITALS ───────────────────────────────
-- hospital_doctor (from 001): id, hospital_id, doctor_id, active, joined_at
-- UNIQUE (hospital_id, doctor_id)
INSERT INTO hospital_doctor (hospital_id, doctor_id, active) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', TRUE),
  ('c1000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000002', TRUE),
  ('c1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000003', TRUE),
  ('c1000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000003', TRUE),
  ('c1000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000004', TRUE)
ON CONFLICT (hospital_id, doctor_id) DO NOTHING;

-- ── 6. PATIENTS ───────────────────────────────────────────────
-- patient: id, auth_user_id, first_name, last_name, date_of_birth, gender, email, mobile,
--          whatsapp_enabled, address_id
INSERT INTO patient (id, auth_user_id, first_name, last_name, email, mobile, date_of_birth, gender, address_id, whatsapp_enabled) VALUES
  ('e1000000-0000-0000-0000-000000000001', 'd9cbe42b-2170-4e8d-ae80-822dd371aa69', 'Ravi',   'Kumar',    'patient01@gmail.com', '9841201001', '1985-04-12', 'M', 'a1000000-0000-0000-0000-000000000011', TRUE),
  ('e1000000-0000-0000-0000-000000000002', 'f87e6956-a7a7-44bd-a5ce-7d4a5ae787f3', 'Ananya', 'Krishnan', 'patient02@gmail.com', '9841202002', '1992-08-25', 'F', 'a1000000-0000-0000-0000-000000000012', TRUE),
  ('e1000000-0000-0000-0000-000000000003', '2768e970-73d6-4bde-851b-663f4da9aac3', 'Mohan',  'Pillai',   'patient03@gmail.com', '9846203003', '1975-11-03', 'M', 'a1000000-0000-0000-0000-000000000013', FALSE)
ON CONFLICT (id) DO NOTHING;

-- ── 7. PATIENT HEALTH PROFILES ────────────────────────────────
INSERT INTO patient_health_profile (patient_id, known_conditions, allergies, current_medications, past_surgeries, family_history) VALUES
  ('e1000000-0000-0000-0000-000000000001',
    ARRAY['Type 2 Diabetes','Hypertension'],
    ARRAY['Penicillin'],
    '[{"name":"Metformin","dosage":"500mg","frequency":"Twice daily","since":"2020"}]'::jsonb,
    '[{"procedure":"Appendectomy","year":"2010","hospital":"Apollo Chennai"}]'::jsonb,
    '[{"relation":"Father","condition":"Diabetes"},{"relation":"Mother","condition":"Hypertension"}]'::jsonb),
  ('e1000000-0000-0000-0000-000000000002',
    ARRAY['Asthma'],
    ARRAY['Dust','Pollen'],
    '[]'::jsonb, '[]'::jsonb,
    '[{"relation":"Father","condition":"Asthma"},{"relation":"Sibling","condition":"Eczema"}]'::jsonb),
  ('e1000000-0000-0000-0000-000000000003',
    ARRAY['Arthritis','High Cholesterol'],
    ARRAY[]::TEXT[],
    '[{"name":"Atorvastatin","dosage":"10mg","frequency":"Once daily","since":"2022"}]'::jsonb,
    '[]'::jsonb,
    '[{"relation":"Mother","condition":"Arthritis"}]'::jsonb)
ON CONFLICT (patient_id) DO NOTHING;

-- ── 8. PATIENT FAMILY (new Session-6 table) ───────────────────
INSERT INTO patient_family (patient_id, relation_type, first_name, last_name, date_of_birth, known_conditions, allergies, notes) VALUES
  ('e1000000-0000-0000-0000-000000000001', 'FATHER',      'Rajaram',  'Kumar',    '1958-06-15', ARRAY['Type 2 Diabetes','Heart Disease'], ARRAY['Aspirin'],      'Diagnosed diabetes at age 45'),
  ('e1000000-0000-0000-0000-000000000001', 'MOTHER',      'Saraswati','Kumar',    '1962-03-22', ARRAY['Hypertension'],                   ARRAY[]::TEXT[],       NULL),
  ('e1000000-0000-0000-0000-000000000001', 'SPOUSE',      'Meenakshi','Kumar',    '1987-09-10', ARRAY[]::TEXT[],                         ARRAY['Shellfish'],    NULL),
  ('e1000000-0000-0000-0000-000000000002', 'FATHER',      'Krishnan', 'Iyer',     '1960-01-05', ARRAY['Asthma','COPD'],                  ARRAY['Dust','Mould'], 'Severe asthma since childhood'),
  ('e1000000-0000-0000-0000-000000000002', 'SIBLING',     'Arun',     'Krishnan', '1995-07-18', ARRAY['Eczema'],                         ARRAY[]::TEXT[],       NULL),
  ('e1000000-0000-0000-0000-000000000003', 'MOTHER',      'Kamala',   'Pillai',   '1950-04-30', ARRAY['Arthritis','Osteoporosis'],       ARRAY[]::TEXT[],       'Joint replacement done 2018'),
  ('e1000000-0000-0000-0000-000000000003', 'GRANDPARENT', 'Gopal',    'Pillai',   '1928-11-12', ARRAY['Type 2 Diabetes','Cataracts'],    ARRAY[]::TEXT[],       'Passed away 2005');

-- ── 9. HOSPITAL ADMINS ────────────────────────────────────────
-- scope HOSPITAL requires hospital_id | scope GROUP requires hospital_group_id
INSERT INTO hospital_admin (auth_user_id, scope, hospital_id, hospital_group_id, first_name, last_name, email, mobile, is_active) VALUES
  ('56339dd1-6b67-40f0-8b62-44bc83ece7bd', 'HOSPITAL', 'c1000000-0000-0000-0000-000000000001', NULL,                                   'Rajesh',  'Iyer',   'admin_h01@gmail.com',   '9940301001', TRUE),
  ('6285a10f-8116-45d5-b35e-75bfa8bf7c50', 'HOSPITAL', 'c1000000-0000-0000-0000-000000000002', NULL,                                   'Sunita',  'Verma',  'admin_h02@gmail.com',   '9940302002', TRUE),
  ('9c7caad7-3e97-4523-8fd5-443621e02e3d', 'GROUP',    NULL,                                   'b1000000-0000-0000-0000-000000000001', 'Prakash', 'Nair',   'admin_grp01@gmail.com', '9940303003', TRUE),
  ('b6a2dab2-5fc4-41df-87b3-58380c0d7f1e', 'GROUP',    NULL,                                   'b1000000-0000-0000-0000-000000000002', 'Deepa',   'Menon',  'admin_grp02@gmail.com', '9846304004', TRUE)
ON CONFLICT (auth_user_id) DO NOTHING;

-- ── 10. RECEPTIONISTS ─────────────────────────────────────────
INSERT INTO receptionist (auth_user_id, hospital_id, first_name, last_name, email, mobile, is_active) VALUES
  ('4d375329-1c14-41ca-88ca-d8b1a0e84865', 'c1000000-0000-0000-0000-000000000001', 'Lakshmi',  'Devi',       'recep_h01@gmail.com',   '9940401001', TRUE),
  ('6e595fd1-db2e-4252-989d-8712d2c5de89', 'c1000000-0000-0000-0000-000000000002', 'Karthik',  'Rajan',      'recep_h02@gmail.com',   '9940402002', TRUE),
  ('73835b7f-e1ef-4f91-b41b-2614aaa6c9b6', 'c1000000-0000-0000-0000-000000000001', 'Parvathi', 'Srinivasan', 'recep_grp01@gmail.com', '9940403003', TRUE),
  ('8c2378e6-08c8-49b0-9be6-3b9f6f031e95', 'c1000000-0000-0000-0000-000000000003', 'Murugan',  'Pillai',     'recep_grp02@gmail.com', '9846404004', TRUE)
ON CONFLICT (auth_user_id) DO NOTHING;

-- ── 11. APPOINTMENTS ──────────────────────────────────────────
-- appointment: id, patient_id, doctor_id, hospital_id, appointment_date, start_time, end_time,
--   type ('F2F'|'TELECONSULT'), status, booked_by_role (NOT NULL), notes
-- status values: BOOKED | CONFIRMED | ARRIVED | COMPLETED | CANCELLED | NO_SHOW
INSERT INTO appointment (id, patient_id, doctor_id, hospital_id, appointment_date, start_time, end_time, type, status, booked_by_role) VALUES
  -- Today — for doctor queue and receptionist screen tests
  ('f1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', CURRENT_DATE, '10:00', '10:30', 'F2F',         'ARRIVED',   'PATIENT'),
  ('f1000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', CURRENT_DATE, '11:00', '11:30', 'F2F',         'BOOKED',    'PATIENT'),
  ('f1000000-0000-0000-0000-000000000003', 'e1000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000002', CURRENT_DATE, '14:00', '14:30', 'TELECONSULT', 'CONFIRMED', 'RECEPTIONIST'),
  -- Walk-in today (booked by receptionist)
  ('f1000000-0000-0000-0000-000000000004', 'e1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000001', CURRENT_DATE, '15:00', '15:30', 'F2F',         'BOOKED',    'RECEPTIONIST'),
  -- Upcoming (future — for next-visit card tests)
  ('f1000000-0000-0000-0000-000000000005', 'e1000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', CURRENT_DATE + 3, '10:00', '10:30', 'F2F', 'BOOKED', 'PATIENT'),
  ('f1000000-0000-0000-0000-000000000006', 'e1000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000003', CURRENT_DATE + 7, '09:00', '09:30', 'F2F', 'BOOKED', 'PATIENT'),
  -- Past completed — for consultation history + records page
  ('f1000000-0000-0000-0000-000000000007', 'e1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', CURRENT_DATE - 30, '10:00', '10:30', 'F2F', 'COMPLETED', 'PATIENT'),
  ('f1000000-0000-0000-0000-000000000008', 'e1000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000002', CURRENT_DATE - 15, '11:00', '11:30', 'F2F', 'COMPLETED', 'PATIENT'),
  -- Overdue next-visit scenario
  ('f1000000-0000-0000-0000-000000000009', 'e1000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000001', CURRENT_DATE - 45, '09:00', '09:30', 'F2F', 'COMPLETED', 'PATIENT')
ON CONFLICT (id) DO NOTHING;

-- ── 12. CONSULTATIONS ─────────────────────────────────────────
-- consultation: id, appointment_id, patient_id, doctor_id, chief_complaint, symptoms,
--   diagnosis, notes, next_visit_date, created_at, updated_at
INSERT INTO consultation (id, appointment_id, patient_id, doctor_id, chief_complaint, diagnosis, notes, next_visit_date) VALUES
  -- patient01: next visit in +5 days → ORANGE on home screen
  ('ac000000-0000-0000-0000-000000000001',
   'f1000000-0000-0000-0000-000000000007',
   'e1000000-0000-0000-0000-000000000001',
   'd1000000-0000-0000-0000-000000000001',
   'Chronic indigestion and bloating after meals',
   'Agnimandya (Ayurveda) — Mandagni',
   'Patient reports 3-month history of post-meal heaviness. Recommend Trikatu + dietary changes. Follow-up in 5 days.',
   CURRENT_DATE + 5),

  -- patient02: next visit in +2 days → ORANGE on home screen
  ('ac000000-0000-0000-0000-000000000002',
   'f1000000-0000-0000-0000-000000000008',
   'e1000000-0000-0000-0000-000000000002',
   'd1000000-0000-0000-0000-000000000002',
   'Recurrent skin rash with itching',
   'Kaphaja Kushtha — homeopathic protocol',
   'Prescribed Sulphur 30C. Avoid dairy for 2 weeks.',
   CURRENT_DATE + 2),

  -- patient03: next visit OVERDUE by 10 days → RED on home screen
  ('ac000000-0000-0000-0000-000000000003',
   'f1000000-0000-0000-0000-000000000009',
   'e1000000-0000-0000-0000-000000000003',
   'd1000000-0000-0000-0000-000000000003',
   'Severe knee pain and stiffness',
   'Sandhivata (Ayurvedic Arthritis)',
   'Prescribed Yogaraja Guggulu. Panchakarma advised. Patient to return for Janu Basti.',
   CURRENT_DATE - 10)
ON CONFLICT (id) DO NOTHING;

-- ── 13. PRESCRIPTIONS ─────────────────────────────────────────
-- prescription (from 001): id, consultation_id (NOT appointment_id), patient_id, doctor_id,
--   medicines, instructions, is_repeat, created_at
-- Added by prescription_audit: entered_by, entered_by_role, entry_method,
--   verified_by_doctor, verified_at, verified_by_doctor_id
INSERT INTO prescription (id, consultation_id, patient_id, doctor_id,
  medicines, instructions, is_repeat) VALUES

  ('ad000000-0000-0000-0000-000000000001',
   'ac000000-0000-0000-0000-000000000001',
   'e1000000-0000-0000-0000-000000000001',
   'd1000000-0000-0000-0000-000000000001',
   '[{"name":"Trikatu Churna","dosage":"3g","frequency":"Twice daily","duration":"15 days","notes":"After meals with warm water"},{"name":"Hingvashtak Churna","dosage":"2g","frequency":"Once daily","duration":"15 days","notes":"Before food"}]'::jsonb,
   'Avoid cold food, fried items, and excess dairy. Light dinner before 7pm.',
   FALSE),

  ('ad000000-0000-0000-0000-000000000002',
   'ac000000-0000-0000-0000-000000000002',
   'e1000000-0000-0000-0000-000000000002',
   'd1000000-0000-0000-0000-000000000002',
   '[{"name":"Sulphur 30C","dosage":"4 pills","frequency":"Once daily morning","duration":"30 days","notes":"Dissolve under tongue"},{"name":"Graphites 6C","dosage":"4 pills","frequency":"Twice daily","duration":"15 days","notes":"After meals"}]'::jsonb,
   'Avoid dairy, eggs, and spicy food. No coffee during treatment.',
   FALSE),

  ('ad000000-0000-0000-0000-000000000003',
   'ac000000-0000-0000-0000-000000000003',
   'e1000000-0000-0000-0000-000000000003',
   'd1000000-0000-0000-0000-000000000003',
   '[{"name":"Yogaraja Guggulu","dosage":"2 tabs","frequency":"Twice daily","duration":"30 days","notes":"After meals"},{"name":"Mahayogaraja Guggulu","dosage":"1 tab","frequency":"Once daily","duration":"30 days","notes":"At bedtime"}]'::jsonb,
   'Apply warm sesame oil to knee daily. Avoid cold water. Rest advised.',
   FALSE)

ON CONFLICT (id) DO NOTHING;

COMMIT;

-- ── VERIFY ────────────────────────────────────────────────────
SELECT tbl, cnt FROM (
  SELECT 'hospital_group'  AS tbl, COUNT(*)::INT AS cnt FROM hospital_group  UNION ALL
  SELECT 'hospital',               COUNT(*)        FROM hospital              UNION ALL
  SELECT 'doctor',                 COUNT(*)        FROM doctor                UNION ALL
  SELECT 'hospital_doctor',        COUNT(*)        FROM hospital_doctor       UNION ALL
  SELECT 'patient',                COUNT(*)        FROM patient               UNION ALL
  SELECT 'patient_health_profile', COUNT(*)        FROM patient_health_profile UNION ALL
  SELECT 'patient_family',         COUNT(*)        FROM patient_family        UNION ALL
  SELECT 'hospital_admin',         COUNT(*)        FROM hospital_admin        UNION ALL
  SELECT 'receptionist',           COUNT(*)        FROM receptionist          UNION ALL
  SELECT 'appointment',            COUNT(*)        FROM appointment           UNION ALL
  SELECT 'consultation',           COUNT(*)        FROM consultation          UNION ALL
  SELECT 'prescription',           COUNT(*)        FROM prescription
) t ORDER BY tbl;

-- ── ADDENDUM: Link doctors to addresses with lat/lng ──────────
-- Run this after the main seed to fix near-me search returning 0 results

-- Insert doctor address rows (with lat/lng for RPC)
INSERT INTO address (id, door_number, street, area, city, district, state, pincode, latitude, longitude) VALUES
  ('a2000000-0000-0000-0000-000000000001', '14', 'Nungambakkam High Rd', 'Nungambakkam', 'Chennai',  'Chennai',   'Tamil Nadu', '600034', 13.0569, 80.2432),
  ('a2000000-0000-0000-0000-000000000002', '9',  'TTK Road',             'Alwarpet',     'Chennai',  'Chennai',   'Tamil Nadu', '600018', 13.0343, 80.2480),
  ('a2000000-0000-0000-0000-000000000003', '33', 'Convent Road',         'Ernakulam',    'Kochi',    'Ernakulam', 'Kerala',     '682011', 9.9757,  76.2897),
  ('a2000000-0000-0000-0000-000000000004', '7',  'Koramangala',          '5th Block',    'Bengaluru','Bengaluru', 'Karnataka',  '560095', 12.9352, 77.6245),
  ('a2000000-0000-0000-0000-000000000005', '101','Adyar',                'Besant Nagar', 'Chennai',  'Chennai',   'Tamil Nadu', '600090', 13.0002, 80.2566),
  ('a2000000-0000-0000-0000-000000000006', '55', 'Kaloor Junction',      'Kaloor',       'Kochi',    'Ernakulam', 'Kerala',     '682017', 10.0069, 76.3015)
ON CONFLICT (id) DO NOTHING;

-- Link each doctor to their address
UPDATE doctor SET address_id = 'a2000000-0000-0000-0000-000000000001' WHERE id = 'd1000000-0000-0000-0000-000000000001'; -- Dr. Arjun Sharma (Chennai)
UPDATE doctor SET address_id = 'a2000000-0000-0000-0000-000000000002' WHERE id = 'd1000000-0000-0000-0000-000000000002'; -- Dr. Priya Nair (Chennai)
UPDATE doctor SET address_id = 'a2000000-0000-0000-0000-000000000001' WHERE id = 'd1000000-0000-0000-0000-000000000003'; -- Dr. Venkat Rao (Chennai)
UPDATE doctor SET address_id = 'a2000000-0000-0000-0000-000000000003' WHERE id = 'd1000000-0000-0000-0000-000000000004'; -- Dr. Meena Pillai (Kochi)
UPDATE doctor SET address_id = 'a2000000-0000-0000-0000-000000000005' WHERE id = 'd1000000-0000-0000-0000-000000000005'; -- Dr. Suresh Kumar (Chennai)
UPDATE doctor SET address_id = 'a2000000-0000-0000-0000-000000000006' WHERE id = 'd1000000-0000-0000-0000-000000000006'; -- Dr. Kavitha Menon (Kochi)
