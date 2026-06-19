-- ============================================================
-- Ayushpathi — Prescription Audit Data Seed
-- Run AFTER 20260619_prescription_audit.sql is confirmed live
-- Run in Supabase SQL Editor
-- ============================================================

BEGIN;

-- ── STEP 1: Backfill audit columns on existing seeded prescriptions ──

-- Prescription ad000000-01: Doctor-entered by Dr. Arjun Sharma for patient01
UPDATE prescription SET
  entry_method       = 'DOCTOR_DIRECT',
  entered_by         = 'aff25416-f9fe-4c1b-9fdc-ce0d31c078fc',  -- doctor_h01
  entered_by_role    = 'DOCTOR',
  verified_by_doctor = TRUE,
  verified_at        = NOW(),
  verified_by_doctor_id = 'd1000000-0000-0000-0000-000000000001'
WHERE id = 'ad000000-0000-0000-0000-000000000001';

-- Prescription ad000000-02: Doctor-entered by Dr. Priya Nair for patient02
UPDATE prescription SET
  entry_method       = 'DOCTOR_DIRECT',
  entered_by         = '7fe14587-5185-484f-89cf-8a1000a8282b',  -- doctor_h02
  entered_by_role    = 'DOCTOR',
  verified_by_doctor = TRUE,
  verified_at        = NOW(),
  verified_by_doctor_id = 'd1000000-0000-0000-0000-000000000002'
WHERE id = 'ad000000-0000-0000-0000-000000000002';

-- Prescription ad000000-03: Receptionist-entered, NOT yet verified by doctor
UPDATE prescription SET
  entry_method       = 'RECEPTIONIST',
  entered_by         = '4d375329-1c14-41ca-88ca-d8b1a0e84865',  -- recep_h01 (Lakshmi Devi)
  entered_by_role    = 'RECEPTIONIST',
  verified_by_doctor = FALSE
WHERE id = 'ad000000-0000-0000-0000-000000000003';

-- ── STEP 2: Add 3 new diverse prescriptions ──────────────────

-- (A) Doctor-direct, verified instantly — Dr. Venkat Rao for patient01 (today's walk-in)
-- Uses consultation from appointment f1000000-04 (today's walk-in)
-- First create a consultation for that appointment
INSERT INTO consultation (id, appointment_id, patient_id, doctor_id,
  chief_complaint, diagnosis, notes, next_visit_date) VALUES
  ('ac000000-0000-0000-0000-000000000004',
   'f1000000-0000-0000-0000-000000000004',
   'e1000000-0000-0000-0000-000000000001',
   'd1000000-0000-0000-0000-000000000003',
   'Back pain and fatigue',
   'Vatavyadhi — Siddha diagnosis',
   'Patient reports 2-week history of lower back pain. Prescribed Nilavembu Kudineer.',
   CURRENT_DATE + 14)
ON CONFLICT (id) DO NOTHING;

INSERT INTO prescription (id, consultation_id, patient_id, doctor_id,
  medicines, instructions, is_repeat,
  entry_method, entered_by, entered_by_role,
  verified_by_doctor, verified_at, verified_by_doctor_id)
VALUES (
  'ad000000-0000-0000-0000-000000000004',
  'ac000000-0000-0000-0000-000000000004',
  'e1000000-0000-0000-0000-000000000001',
  'd1000000-0000-0000-0000-000000000003',
  '[{"name":"Nilavembu Kudineer","dosage":"60ml","frequency":"Twice daily","duration":"7 days","notes":"Dissolve in warm water"},{"name":"Pinda Thailam","dosage":"Apply externally","frequency":"Once daily at night","duration":"14 days","notes":"Warm oil massage on lower back"}]'::jsonb,
  'Avoid cold water bath. Rest advised. Light stretching after day 3.',
  FALSE,
  'DOCTOR_DIRECT',
  '0b13effe-67af-4710-bdc7-77762ab4ba9d',  -- doctor_grp01
  'DOCTOR',
  TRUE, NOW(),
  'd1000000-0000-0000-0000-000000000003'
) ON CONFLICT (id) DO NOTHING;

-- (B) Receptionist-entered, pending doctor verification — recep_h02 entered for patient03
-- Uses appointment f1000000-03 (today's teleconsult)
INSERT INTO consultation (id, appointment_id, patient_id, doctor_id,
  chief_complaint, diagnosis, notes, next_visit_date) VALUES
  ('ac000000-0000-0000-0000-000000000005',
   'f1000000-0000-0000-0000-000000000003',
   'e1000000-0000-0000-0000-000000000003',
   'd1000000-0000-0000-0000-000000000002',
   'Chronic skin allergy and rash',
   'Kaphaja Kushtha — Homoeopathic',
   'Teleconsult — patient showed rash on video. Receptionist transcribed prescription from doctor''s verbal instruction.',
   CURRENT_DATE + 21)
ON CONFLICT (id) DO NOTHING;

INSERT INTO prescription (id, consultation_id, patient_id, doctor_id,
  medicines, instructions, is_repeat,
  entry_method, entered_by, entered_by_role,
  verified_by_doctor)
VALUES (
  'ad000000-0000-0000-0000-000000000005',
  'ac000000-0000-0000-0000-000000000005',
  'e1000000-0000-0000-0000-000000000003',
  'd1000000-0000-0000-0000-000000000002',
  '[{"name":"Sulphur 200C","dosage":"2 pills","frequency":"Once weekly","duration":"4 weeks","notes":"Single dose Sunday morning"},{"name":"Natrum Mur 30C","dosage":"4 pills","frequency":"Once daily","duration":"30 days","notes":"Morning empty stomach"}]'::jsonb,
  'Avoid pickles, sour food, and excess salt. Apply coconut oil to affected area.',
  FALSE,
  'RECEPTIONIST',
  '6e595fd1-db2e-4252-989d-8712d2c5de89',  -- recep_h02 (Karthik Rajan)
  'RECEPTIONIST',
  FALSE  -- ← PENDING doctor sign-off
) ON CONFLICT (id) DO NOTHING;

-- (C) Repeat prescription — doctor_h01 issues repeat for patient02's ongoing treatment
INSERT INTO prescription (id, consultation_id, patient_id, doctor_id,
  medicines, instructions, is_repeat,
  entry_method, entered_by, entered_by_role,
  verified_by_doctor, verified_at, verified_by_doctor_id)
VALUES (
  'ad000000-0000-0000-0000-000000000006',
  'ac000000-0000-0000-0000-000000000001',   -- reuse consultation g1/ac1
  'e1000000-0000-0000-0000-000000000001',
  'd1000000-0000-0000-0000-000000000001',
  '[{"name":"Trikatu Churna","dosage":"3g","frequency":"Twice daily","duration":"30 days","notes":"Continuation — month 2"}]'::jsonb,
  'Continue same diet restrictions. Reduce dosage to once daily if bloating resolves.',
  TRUE,   -- ← IS_REPEAT = TRUE
  'DOCTOR_DIRECT',
  'aff25416-f9fe-4c1b-9fdc-ce0d31c078fc',
  'DOCTOR',
  TRUE, NOW(),
  'd1000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

COMMIT;

-- ── VERIFY ───────────────────────────────────────────────────
SELECT
  p.id,
  pat.first_name || ' ' || pat.last_name AS patient,
  d.first_name || ' ' || d.last_name AS doctor,
  p.entry_method,
  p.entered_by_role,
  p.verified_by_doctor,
  p.is_repeat,
  CASE WHEN p.verified_by_doctor THEN 'VERIFIED ✓'
       ELSE 'PENDING sign-off ⚠' END AS status
FROM prescription p
JOIN patient pat ON pat.id = p.patient_id
JOIN doctor d ON d.id = p.doctor_id
ORDER BY p.created_at;
