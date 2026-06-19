-- ============================================================
-- Ayushpathi — Rich Patient History Seed
-- Scenario: Patient lifecycle — multiple visits, doctor switch,
--           consent revoke/grant, access control validation
-- Run in Supabase SQL Editor AFTER 001_test_data.sql
-- ============================================================

BEGIN;

-- ============================================================
-- PATIENT 01 — RAVI KUMAR
-- Phase 1: 5 visits with Dr. Arjun Sharma (AYU) at Apollo Chennai
-- Phase 2: Doctor detach → consent revoked
-- Phase 3: 3 visits with Dr. Priya Nair (HOM) at Dhanvantri Chennai
--          New doctor has share_full_history=TRUE → sees all old records
-- ============================================================

-- ── PHASE 1: APPOINTMENTS (old doctor) ───────────────────────
-- Visit 1 — 4 months ago: Initial consultation, walk-in booked by receptionist
-- Visit 2 — 3 months ago: Follow-up, patient booked online
-- Visit 3 — 2 months ago: Second follow-up, receptionist booked
-- Visit 4 — 6 weeks ago:  Third follow-up, patient booked
-- Visit 5 — 3 weeks ago:  Final visit before switching doctors

INSERT INTO appointment (id, patient_id, doctor_id, hospital_id,
  appointment_date, start_time, end_time, type, status, booked_by_role, notes) VALUES

  ('a3000000-0000-0000-0000-000000000001',
   'e1000000-0000-0000-0000-000000000001',
   'd1000000-0000-0000-0000-000000000001',
   'c1000000-0000-0000-0000-000000000001',
   CURRENT_DATE - 120, '10:00', '10:30', 'F2F', 'COMPLETED',
   'RECEPTIONIST', 'First visit — referred by family. Complaints of fatigue and poor digestion.'),

  ('a3000000-0000-0000-0000-000000000002',
   'e1000000-0000-0000-0000-000000000001',
   'd1000000-0000-0000-0000-000000000001',
   'c1000000-0000-0000-0000-000000000001',
   CURRENT_DATE - 90, '11:00', '11:30', 'F2F', 'COMPLETED',
   'PATIENT', 'Follow-up. Patient reports improvement in digestion. Continuing treatment.'),

  ('a3000000-0000-0000-0000-000000000003',
   'e1000000-0000-0000-0000-000000000001',
   'd1000000-0000-0000-0000-000000000001',
   'c1000000-0000-0000-0000-000000000001',
   CURRENT_DATE - 60, '09:30', '10:00', 'F2F', 'COMPLETED',
   'RECEPTIONIST', 'Second follow-up. Blood sugar stabilising. Panchakarma discussed.'),

  ('a3000000-0000-0000-0000-000000000004',
   'e1000000-0000-0000-0000-000000000001',
   'd1000000-0000-0000-0000-000000000001',
   'c1000000-0000-0000-0000-000000000001',
   CURRENT_DATE - 42, '14:00', '14:30', 'F2F', 'COMPLETED',
   'PATIENT', 'Third follow-up. Patient feeling significantly better. Dosage reduced.'),

  ('a3000000-0000-0000-0000-000000000005',
   'e1000000-0000-0000-0000-000000000001',
   'd1000000-0000-0000-0000-000000000001',
   'c1000000-0000-0000-0000-000000000001',
   CURRENT_DATE - 21, '10:00', '10:30', 'F2F', 'COMPLETED',
   'PATIENT', 'Final visit with Dr. Sharma — patient moving to homeopathy for holistic treatment.')

ON CONFLICT (id) DO NOTHING;

-- ── PHASE 1: CONSULTATIONS ────────────────────────────────────
INSERT INTO consultation (id, appointment_id, patient_id, doctor_id,
  chief_complaint, diagnosis, notes, next_visit_date) VALUES

  ('b3000000-0000-0000-0000-000000000001',
   'a3000000-0000-0000-0000-000000000001',
   'e1000000-0000-0000-0000-000000000001',
   'd1000000-0000-0000-0000-000000000001',
   'Chronic fatigue, poor digestion, bloating after meals, irregular bowel',
   'Mandagni (impaired digestive fire) with Vataprakopa — Ayurveda Type 2 Diabetes management',
   'Patient has 5-year history of Type 2 Diabetes managed with Metformin. Seeking Ayurveda as complementary treatment. Nadi pariksha: Vataprakriti. Tongue coated white. Started on Trikatu protocol.',
   CURRENT_DATE - 90),

  ('b3000000-0000-0000-0000-000000000002',
   'a3000000-0000-0000-0000-000000000002',
   'e1000000-0000-0000-0000-000000000001',
   'd1000000-0000-0000-0000-000000000001',
   'Follow-up: digestion improved 60%, still bloating after dinner',
   'Mandagni — responding to treatment, partial remission',
   'Patient reports significant improvement. Tongue coating reduced. Continuing Trikatu. Adding Triphala churna for bowel regularisation. HbA1c to be checked before next visit.',
   CURRENT_DATE - 60),

  ('b3000000-0000-0000-0000-000000000003',
   'a3000000-0000-0000-0000-000000000003',
   'e1000000-0000-0000-0000-000000000001',
   'd1000000-0000-0000-0000-000000000001',
   'Follow-up: digestion 80% better, HbA1c improved from 8.1 to 7.4',
   'Mandagni — good response. Introducing Panchakarma protocol.',
   'HbA1c improvement noted. Patient consenting to Virechana (therapeutic purgation) as next step. Reduced Metformin with allopathic doctor consultation. Panchakarma prep: Snehapana starting next week.',
   CURRENT_DATE - 42),

  ('b3000000-0000-0000-0000-000000000004',
   'a3000000-0000-0000-0000-000000000004',
   'e1000000-0000-0000-0000-000000000001',
   'd1000000-0000-0000-0000-000000000001',
   'Post-Virechana follow-up: feeling significantly lighter, energy improved',
   'Post-Panchakarma maintenance — Rasayana protocol',
   'Virechana completed successfully. Patient reports excellent energy levels. Starting Rasayana: Chyawanprash + Amalaki Rasayana. Dosage of Trikatu reduced to once daily maintenance.',
   CURRENT_DATE - 21),

  ('b3000000-0000-0000-0000-000000000005',
   'a3000000-0000-0000-0000-000000000005',
   'e1000000-0000-0000-0000-000000000001',
   'd1000000-0000-0000-0000-000000000001',
   'Final review before switching to homeopathy for constitutional treatment',
   'Stable — Mandagni resolved. Recommending constitutional homeopathy for long-term.',
   'Patient has achieved excellent digestive health. HbA1c 6.9 (near normal). Patient wishes to continue treatment via homeopathy for constitutional improvement. Full history shared consent to be given to new doctor. Discharge summary prepared.',
   NULL)

ON CONFLICT (id) DO NOTHING;

-- ── PHASE 1: PRESCRIPTIONS (mix of DOCTOR_DIRECT and RECEPTIONIST entry) ──
INSERT INTO prescription (id, consultation_id, patient_id, doctor_id,
  medicines, instructions, is_repeat,
  entry_method, entered_by, entered_by_role,
  verified_by_doctor, verified_at, verified_by_doctor_id) VALUES

  -- Visit 1: Doctor entered directly
  ('c3000000-0000-0000-0000-000000000001',
   'b3000000-0000-0000-0000-000000000001',
   'e1000000-0000-0000-0000-000000000001',
   'd1000000-0000-0000-0000-000000000001',
   '[{"name":"Trikatu Churna","dosage":"3g","frequency":"Twice daily","duration":"30 days","notes":"After meals with warm water"},{"name":"Hingvashtak Churna","dosage":"2g","frequency":"Once daily at bedtime","duration":"30 days","notes":"With warm ghee"}]'::jsonb,
   'Avoid cold, raw, and fried food. Eat warm meals. Sleep before 10pm. Light walk after dinner.',
   FALSE,
   'DOCTOR_DIRECT', 'aff25416-f9fe-4c1b-9fdc-ce0d31c078fc', 'DOCTOR',
   TRUE, CURRENT_DATE - 120 + INTERVAL '1 hour',
   'd1000000-0000-0000-0000-000000000001'),

  -- Visit 2: Receptionist entered, then doctor verified
  ('c3000000-0000-0000-0000-000000000002',
   'b3000000-0000-0000-0000-000000000002',
   'e1000000-0000-0000-0000-000000000001',
   'd1000000-0000-0000-0000-000000000001',
   '[{"name":"Trikatu Churna","dosage":"3g","frequency":"Twice daily","duration":"30 days","notes":"Continue"},{"name":"Triphala Churna","dosage":"5g","frequency":"Once daily at bedtime","duration":"30 days","notes":"With warm water — bowel regulation"}]'::jsonb,
   'Continue diet restrictions. Add light yoga (Pawanmuktasana). HbA1c test before next visit.',
   FALSE,
   'RECEPTIONIST', '4d375329-1c14-41ca-88ca-d8b1a0e84865', 'RECEPTIONIST',
   TRUE, CURRENT_DATE - 89 + INTERVAL '2 hours',
   'd1000000-0000-0000-0000-000000000001'),

  -- Visit 3: Doctor entered, Panchakarma prep added
  ('c3000000-0000-0000-0000-000000000003',
   'b3000000-0000-0000-0000-000000000003',
   'e1000000-0000-0000-0000-000000000001',
   'd1000000-0000-0000-0000-000000000001',
   '[{"name":"Trikatu Churna","dosage":"3g","frequency":"Twice daily","duration":"14 days","notes":"Continue"},{"name":"Triphala Churna","dosage":"5g","frequency":"Once daily","duration":"14 days","notes":"Continue"},{"name":"Ghrita (medicated ghee)","dosage":"30ml","frequency":"Morning empty stomach","duration":"7 days","notes":"Snehapana prep for Virechana"}]'::jsonb,
   'Snehapana protocol starting Day 1 with 30ml increasing to 90ml by Day 7. No outside food during prep. Complete bed rest on Virechana day.',
   FALSE,
   'DOCTOR_DIRECT', 'aff25416-f9fe-4c1b-9fdc-ce0d31c078fc', 'DOCTOR',
   TRUE, CURRENT_DATE - 60 + INTERVAL '1 hour',
   'd1000000-0000-0000-0000-000000000001'),

  -- Visit 4: Repeat Rx — Rasayana maintenance, receptionist entered
  ('c3000000-0000-0000-0000-000000000004',
   'b3000000-0000-0000-0000-000000000004',
   'e1000000-0000-0000-0000-000000000001',
   'd1000000-0000-0000-0000-000000000001',
   '[{"name":"Chyawanprash","dosage":"10g","frequency":"Twice daily","duration":"90 days","notes":"With warm milk"},{"name":"Amalaki Rasayana","dosage":"5g","frequency":"Once daily morning","duration":"90 days","notes":"With honey"},{"name":"Trikatu Churna","dosage":"1g","frequency":"Once daily — maintenance","duration":"90 days","notes":"With warm water"}]'::jsonb,
   'Rasayana protocol for 3 months. Continue light exercise. Monthly HbA1c monitoring. Reduce Metformin only under allopathic doctor supervision.',
   TRUE,
   'RECEPTIONIST', '4d375329-1c14-41ca-88ca-d8b1a0e84865', 'RECEPTIONIST',
   TRUE, CURRENT_DATE - 41 + INTERVAL '3 hours',
   'd1000000-0000-0000-0000-000000000001'),

  -- Visit 5: Final discharge note — doctor entered
  ('c3000000-0000-0000-0000-000000000005',
   'b3000000-0000-0000-0000-000000000005',
   'e1000000-0000-0000-0000-000000000001',
   'd1000000-0000-0000-0000-000000000001',
   '[{"name":"Chyawanprash","dosage":"10g","frequency":"Once daily","duration":"60 days","notes":"Continue maintenance"},{"name":"Amalaki Rasayana","dosage":"5g","frequency":"Once daily","duration":"60 days","notes":"Continue"}]'::jsonb,
   'Maintenance only. Patient transitioning to constitutional homeopathy. Share full history with new doctor. No dietary restrictions going forward — patient educated on AYUSH lifestyle.',
   TRUE,
   'DOCTOR_DIRECT', 'aff25416-f9fe-4c1b-9fdc-ce0d31c078fc', 'DOCTOR',
   TRUE, CURRENT_DATE - 21 + INTERVAL '1 hour',
   'd1000000-0000-0000-0000-000000000001')

ON CONFLICT (id) DO NOTHING;

-- ── PHASE 2: CONSENT — REVOKE old doctor, GRANT new doctor ────
-- Patient revokes consent from Dr. Arjun Sharma
-- Patient gives NEW consent to Dr. Priya Nair WITH share_full_history=TRUE
-- This means new doctor sees ALL historical consultations + prescriptions

INSERT INTO patient_doctor_consent
  (patient_id, doctor_id, status, share_full_history, consented_at, revoked_at) VALUES

  -- OLD doctor: consent REVOKED 18 days ago
  ('e1000000-0000-0000-0000-000000000001',
   'd1000000-0000-0000-0000-000000000001',
   'REVOKED', FALSE,
   CURRENT_DATE - 120,        -- originally consented at first visit
   CURRENT_DATE - 18),        -- revoked 18 days ago (3 days after last visit)

  -- NEW doctor: consent ACTIVE with FULL HISTORY shared
  ('e1000000-0000-0000-0000-000000000001',
   'd1000000-0000-0000-0000-000000000002',
   'ACTIVE', TRUE,
   CURRENT_DATE - 14,          -- consented 14 days ago when joining new doctor
   NULL)

ON CONFLICT (patient_id, doctor_id) DO UPDATE SET
  status             = EXCLUDED.status,
  share_full_history = EXCLUDED.share_full_history,
  consented_at       = EXCLUDED.consented_at,
  revoked_at         = EXCLUDED.revoked_at;

-- ── PHASE 3: APPOINTMENTS (new doctor, Dr. Priya Nair at Dhanvantri Chennai) ──
INSERT INTO appointment (id, patient_id, doctor_id, hospital_id,
  appointment_date, start_time, end_time, type, status, booked_by_role, notes) VALUES

  ('a4000000-0000-0000-0000-000000000001',
   'e1000000-0000-0000-0000-000000000001',
   'd1000000-0000-0000-0000-000000000002',
   'c1000000-0000-0000-0000-000000000002',
   CURRENT_DATE - 14, '10:00', '10:30', 'F2F', 'COMPLETED',
   'RECEPTIONIST',
   'New patient intake — transferred from Dr. Arjun Sharma with full Ayurveda history. Constitutional homeopathy intake.'),

  ('a4000000-0000-0000-0000-000000000002',
   'e1000000-0000-0000-0000-000000000001',
   'd1000000-0000-0000-0000-000000000002',
   'c1000000-0000-0000-0000-000000000002',
   CURRENT_DATE - 7, '11:00', '11:30', 'F2F', 'COMPLETED',
   'PATIENT',
   'First follow-up with new doctor. Reviewing constitutional remedy response.'),

  -- Upcoming appointment with new doctor
  ('a4000000-0000-0000-0000-000000000003',
   'e1000000-0000-0000-0000-000000000001',
   'd1000000-0000-0000-0000-000000000002',
   'c1000000-0000-0000-0000-000000000002',
   CURRENT_DATE + 7, '10:00', '10:30', 'F2F', 'BOOKED',
   'PATIENT', NULL)

ON CONFLICT (id) DO NOTHING;

-- ── PHASE 3: CONSULTATIONS (new doctor sees full history via share_full_history=TRUE) ──
INSERT INTO consultation (id, appointment_id, patient_id, doctor_id,
  chief_complaint, diagnosis, notes, next_visit_date) VALUES

  ('b4000000-0000-0000-0000-000000000001',
   'a4000000-0000-0000-0000-000000000001',
   'e1000000-0000-0000-0000-000000000001',
   'd1000000-0000-0000-0000-000000000002',
   'Constitutional treatment intake — Type 2 Diabetes with strong Ayurveda history',
   'Sycotic miasm with Phosphoric acid constitution — Homeopathic intake',
   'Reviewed full Ayurveda history from Dr. Sharma (5 visits, HbA1c improved 8.1→6.9). Patient has strong Vataprakriti. Homeopathic constitutional: Phosphoric acid 200C. Plan: 6-week intervals. Continue Chyawanprash from Ayurveda as supportive. Patient''s family history (Father: Diabetes+Heart, Mother: Hypertension) noted in assessment.',
   CURRENT_DATE - 7),

  ('b4000000-0000-0000-0000-000000000002',
   'a4000000-0000-0000-0000-000000000002',
   'e1000000-0000-0000-0000-000000000001',
   'd1000000-0000-0000-0000-000000000002',
   'Follow-up: constitutional remedy response — energy improved, sleep better',
   'Good response to Phosphoric acid. Continue with Lycopodium 30C complementary.',
   'Patient responding well. Sleep improved significantly (7-8hrs vs 5hrs before). Energy levels sustained. Adding Lycopodium 30C for remaining digestive sensitivity. Next HbA1c test due in 3 weeks.',
   CURRENT_DATE + 7)

ON CONFLICT (id) DO NOTHING;

-- ── PHASE 3: PRESCRIPTIONS (new doctor) ──────────────────────
INSERT INTO prescription (id, consultation_id, patient_id, doctor_id,
  medicines, instructions, is_repeat,
  entry_method, entered_by, entered_by_role,
  verified_by_doctor, verified_at, verified_by_doctor_id) VALUES

  -- New doctor intake — entered by receptionist (Karthik Rajan, recep_h02) then verified
  ('c4000000-0000-0000-0000-000000000001',
   'b4000000-0000-0000-0000-000000000001',
   'e1000000-0000-0000-0000-000000000001',
   'd1000000-0000-0000-0000-000000000002',
   '[{"name":"Phosphoric acid 200C","dosage":"2 globules","frequency":"Single dose — do not repeat until review","duration":"6 weeks","notes":"Dissolve under tongue. No coffee, mint, or camphor during treatment."},{"name":"Chyawanprash (continue from Ayurveda)","dosage":"10g","frequency":"Once daily morning","duration":"Ongoing","notes":"Supportive — maintain Ayurveda gains"}]'::jsonb,
   'Avoid coffee, mint, camphor, strong perfumes — antidote to constitutional remedy. No self-medication. Continue Ayurvedic lifestyle recommendations from Dr. Sharma.',
   FALSE,
   'RECEPTIONIST', '6e595fd1-db2e-4252-989d-8712d2c5de89', 'RECEPTIONIST',
   TRUE, CURRENT_DATE - 13 + INTERVAL '2 hours',
   'd1000000-0000-0000-0000-000000000002'),

  -- Follow-up — doctor entered directly
  ('c4000000-0000-0000-0000-000000000002',
   'b4000000-0000-0000-0000-000000000002',
   'e1000000-0000-0000-0000-000000000001',
   'd1000000-0000-0000-0000-000000000002',
   '[{"name":"Lycopodium 30C","dosage":"4 globules","frequency":"Twice weekly","duration":"4 weeks","notes":"Monday and Thursday evenings"},{"name":"Phosphoric acid 200C","dosage":"Do not repeat yet","frequency":"Wait for next review","duration":"Hold","notes":"Constitutional — only Dr. Priya to repeat when indicated"}]'::jsonb,
   'Continue antidote restrictions. Monitor sleep and energy weekly. HbA1c test before next appointment. Log food diary for 2 weeks.',
   FALSE,
   'DOCTOR_DIRECT', '7fe14587-5185-484f-89cf-8a1000a8282b', 'DOCTOR',
   TRUE, CURRENT_DATE - 7 + INTERVAL '1 hour',
   'd1000000-0000-0000-0000-000000000002')

ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- PATIENT 02 — ANANYA KRISHNAN
-- Scenario: 3 visits with Dr. Venkat Rao (SID, group doctor) at C1
--           then 2 visits with Dr. Meena Pillai (YOG) at C3 (Kochi)
-- ============================================================

INSERT INTO appointment (id, patient_id, doctor_id, hospital_id,
  appointment_date, start_time, end_time, type, status, booked_by_role) VALUES
  ('a5000000-0000-0000-0000-000000000001','e1000000-0000-0000-0000-000000000002','d1000000-0000-0000-0000-000000000003','c1000000-0000-0000-0000-000000000001', CURRENT_DATE-75, '09:00','09:30','F2F','COMPLETED','PATIENT'),
  ('a5000000-0000-0000-0000-000000000002','e1000000-0000-0000-0000-000000000002','d1000000-0000-0000-0000-000000000003','c1000000-0000-0000-0000-000000000001', CURRENT_DATE-45, '10:00','10:30','F2F','COMPLETED','RECEPTIONIST'),
  ('a5000000-0000-0000-0000-000000000003','e1000000-0000-0000-0000-000000000002','d1000000-0000-0000-0000-000000000003','c1000000-0000-0000-0000-000000000001', CURRENT_DATE-20, '11:00','11:30','F2F','COMPLETED','PATIENT'),
  ('a5000000-0000-0000-0000-000000000004','e1000000-0000-0000-0000-000000000002','d1000000-0000-0000-0000-000000000004','c1000000-0000-0000-0000-000000000003', CURRENT_DATE-10, '09:00','09:30','F2F','COMPLETED','PATIENT'),
  ('a5000000-0000-0000-0000-000000000005','e1000000-0000-0000-0000-000000000002','d1000000-0000-0000-0000-000000000004','c1000000-0000-0000-0000-000000000003', CURRENT_DATE+5,  '10:00','10:30','F2F','BOOKED','PATIENT')
ON CONFLICT (id) DO NOTHING;

INSERT INTO consultation (id, appointment_id, patient_id, doctor_id, chief_complaint, diagnosis, notes, next_visit_date) VALUES
  ('b5000000-0000-0000-0000-000000000001','a5000000-0000-0000-0000-000000000001','e1000000-0000-0000-0000-000000000002','d1000000-0000-0000-0000-000000000003','Recurrent skin rash, itching worse at night','Kapha-Pitta Kushtha — Siddha diagnosis','Kozhuppu (skin lipid imbalance) with Pitham dominance. Starting Nochi leaf-based treatment.', CURRENT_DATE-45),
  ('b5000000-0000-0000-0000-000000000002','a5000000-0000-0000-0000-000000000002','e1000000-0000-0000-0000-000000000002','d1000000-0000-0000-0000-000000000003','Follow-up: rash reduced 50%, less itching at night','Kapha-Pitta Kushtha — partial response','Responding well to Nochi. Adding Thirikadugam for internal. External Neem oil.', CURRENT_DATE-20),
  ('b5000000-0000-0000-0000-000000000003','a5000000-0000-0000-0000-000000000003','e1000000-0000-0000-0000-000000000002','d1000000-0000-0000-0000-000000000003','Rash 80% cleared, patient wants Yoga therapy for stress','Kushtha resolved — transitioning to Yoga for stress-related immunity','Patient well. Recommending Yoga Naturopathy for stress-linked immunity. Referral to Dr. Meena Pillai (YOG) at Kochi.', NULL),
  ('b5000000-0000-0000-0000-000000000004','a5000000-0000-0000-0000-000000000004','e1000000-0000-0000-0000-000000000002','d1000000-0000-0000-0000-000000000004','Stress-related low immunity, disturbed sleep, mild anxiety','Prana imbalance — Yoga Naturopathy intake','Reviewed Siddha history from Dr. Venkat. Pranayama protocol + dietary naturopathy. Nadi Shodhana + Bhramari daily.', CURRENT_DATE+5)
ON CONFLICT (id) DO NOTHING;

-- Consent for patient02
INSERT INTO patient_doctor_consent (patient_id, doctor_id, status, share_full_history, consented_at, revoked_at) VALUES
  ('e1000000-0000-0000-0000-000000000002','d1000000-0000-0000-0000-000000000003','REVOKED', FALSE, CURRENT_DATE-75, CURRENT_DATE-12),
  ('e1000000-0000-0000-0000-000000000002','d1000000-0000-0000-0000-000000000004','ACTIVE',  TRUE,  CURRENT_DATE-10, NULL)
ON CONFLICT (patient_id, doctor_id) DO UPDATE SET
  status=EXCLUDED.status, share_full_history=EXCLUDED.share_full_history,
  consented_at=EXCLUDED.consented_at, revoked_at=EXCLUDED.revoked_at;

-- ============================================================
-- PATIENT 03 — MOHAN PILLAI
-- Scenario: Ongoing with same doctor — no switch
-- 4 visits with Dr. Venkat Rao (SID) for arthritis
-- ============================================================

INSERT INTO appointment (id, patient_id, doctor_id, hospital_id,
  appointment_date, start_time, end_time, type, status, booked_by_role) VALUES
  ('a6000000-0000-0000-0000-000000000001','e1000000-0000-0000-0000-000000000003','d1000000-0000-0000-0000-000000000003','c1000000-0000-0000-0000-000000000001', CURRENT_DATE-100,'14:00','14:30','F2F','COMPLETED','RECEPTIONIST'),
  ('a6000000-0000-0000-0000-000000000002','e1000000-0000-0000-0000-000000000003','d1000000-0000-0000-0000-000000000003','c1000000-0000-0000-0000-000000000001', CURRENT_DATE-65, '14:00','14:30','F2F','COMPLETED','PATIENT'),
  ('a6000000-0000-0000-0000-000000000003','e1000000-0000-0000-0000-000000000003','d1000000-0000-0000-0000-000000000003','c1000000-0000-0000-0000-000000000001', CURRENT_DATE-30, '14:00','14:30','F2F','COMPLETED','RECEPTIONIST'),
  ('a6000000-0000-0000-0000-000000000004','e1000000-0000-0000-0000-000000000003','d1000000-0000-0000-0000-000000000003','c1000000-0000-0000-0000-000000000001', CURRENT_DATE+14,'14:00','14:30','F2F','BOOKED','PATIENT')
ON CONFLICT (id) DO NOTHING;

INSERT INTO consultation (id, appointment_id, patient_id, doctor_id, chief_complaint, diagnosis, notes, next_visit_date) VALUES
  ('b6000000-0000-0000-0000-000000000001','a6000000-0000-0000-0000-000000000001','e1000000-0000-0000-0000-000000000003','d1000000-0000-0000-0000-000000000003','Severe knee pain, morning stiffness >1hr, difficulty climbing stairs','Sandhi Vatham (Siddha Arthritis) — Vatham dominance','Both knees affected. Crepitus on right knee. Muthuchippi Parpam started. External Nirgundi tailam.', CURRENT_DATE-65),
  ('b6000000-0000-0000-0000-000000000002','a6000000-0000-0000-0000-000000000002','e1000000-0000-0000-0000-000000000003','d1000000-0000-0000-0000-000000000003','Follow-up: stiffness reduced, pain 40% better','Sandhi Vatham — good response to Muthuchippi Parpam','Morning stiffness now 20min (was 60min). Continuing Parpam. Adding Vathasura Kudineer (herbal decoction).', CURRENT_DATE-30),
  ('b6000000-0000-0000-0000-000000000003','a6000000-0000-0000-0000-000000000003','e1000000-0000-0000-0000-000000000003','d1000000-0000-0000-0000-000000000003','Follow-up: climbing stairs better, pain 70% reduced','Sandhi Vatham — significant improvement. Introducing Janu Basti','Patient can climb stairs unaided now. Janu Basti (medicated oil pooling) scheduled. Reduce Atorvastatin under allopathic consult.', CURRENT_DATE+14)
ON CONFLICT (id) DO NOTHING;

-- Consent for patient03 (ongoing with same doctor)
INSERT INTO patient_doctor_consent (patient_id, doctor_id, status, share_full_history, consented_at) VALUES
  ('e1000000-0000-0000-0000-000000000003','d1000000-0000-0000-0000-000000000003','ACTIVE', TRUE, CURRENT_DATE-100)
ON CONFLICT (patient_id, doctor_id) DO UPDATE SET
  status=EXCLUDED.status, share_full_history=EXCLUDED.share_full_history,
  consented_at=EXCLUDED.consented_at;

COMMIT;

-- ── FINAL VERIFICATION ────────────────────────────────────────
SELECT
  p.first_name || ' ' || p.last_name AS patient,
  d.first_name || ' ' || d.last_name AS doctor,
  pdc.status                          AS consent_status,
  pdc.share_full_history,
  pdc.consented_at::DATE              AS consented,
  pdc.revoked_at::DATE                AS revoked,
  CASE pdc.status
    WHEN 'ACTIVE'  THEN '✅ Doctor CAN access patient'
    WHEN 'REVOKED' THEN '🚫 Doctor CANNOT access patient'
  END AS access
FROM patient_doctor_consent pdc
JOIN patient p ON p.id = pdc.patient_id
JOIN doctor  d ON d.id = pdc.doctor_id
ORDER BY p.last_name, pdc.consented_at;
