-- ============================================================
-- Ayushpathi — Doctor Dashboard Rich Test Data (Seed 005)
-- Session 16 — fixes "0 records" for doctor_h01 & doctor_h02
--
-- doctor_h01 = Dr. Arjun Sharma (AYU)  hospital_c1  d1000000-...-001
-- doctor_h02 = Dr. Priya Nair   (HOM)  hospital_c2  d1000000-...-002
--
-- What this adds:
--   • 4 new patient_doctor_consent rows (Ananya + Mohan → both doctors)
--   • 15 new appointments across both doctors (today / upcoming / past)
--   • 7 consultations (for all COMPLETED appointments)
--   • 7 prescriptions (with mix of DOCTOR_DIRECT and RECEPTIONIST entry)
--
-- Prefixes used (safe, no collision with prior seeds):
--   Appointments  : f5000000-…
--   Consultations : b7000000-…
--   Prescriptions : c5000000-…
--
-- Run in Supabase SQL Editor as postgres role (bypasses RLS)
-- Safe to re-run — all INSERTs use ON CONFLICT DO NOTHING/DO UPDATE
-- ============================================================

BEGIN;

-- ──────────────────────────────────────────────────────────────
-- 1. CONSENT ROWS — give both doctors active patients
-- ──────────────────────────────────────────────────────────────

-- Ananya Krishnan → Dr. Priya Nair (HOM): ACTIVE, partial history
-- (Ananya already had completed appt f1000000-08 with Priya but no consent row)
INSERT INTO patient_doctor_consent
  (patient_id, doctor_id, status, share_full_history, consented_at, revoked_at)
VALUES
  ('e1000000-0000-0000-0000-000000000002',
   'd1000000-0000-0000-0000-000000000002',
   'ACTIVE', FALSE, CURRENT_DATE - 46, NULL)
ON CONFLICT (patient_id, doctor_id) DO UPDATE SET
  status = EXCLUDED.status, share_full_history = EXCLUDED.share_full_history,
  consented_at = EXCLUDED.consented_at, revoked_at = EXCLUDED.revoked_at;

-- Mohan Pillai → Dr. Priya Nair (HOM): ACTIVE, partial history
INSERT INTO patient_doctor_consent
  (patient_id, doctor_id, status, share_full_history, consented_at, revoked_at)
VALUES
  ('e1000000-0000-0000-0000-000000000003',
   'd1000000-0000-0000-0000-000000000002',
   'ACTIVE', FALSE, CURRENT_DATE - 21, NULL)
ON CONFLICT (patient_id, doctor_id) DO UPDATE SET
  status = EXCLUDED.status, share_full_history = EXCLUDED.share_full_history,
  consented_at = EXCLUDED.consented_at, revoked_at = EXCLUDED.revoked_at;

-- Ananya Krishnan → Dr. Arjun Sharma (AYU): ACTIVE, full history
INSERT INTO patient_doctor_consent
  (patient_id, doctor_id, status, share_full_history, consented_at, revoked_at)
VALUES
  ('e1000000-0000-0000-0000-000000000002',
   'd1000000-0000-0000-0000-000000000001',
   'ACTIVE', TRUE, CURRENT_DATE - 41, NULL)
ON CONFLICT (patient_id, doctor_id) DO UPDATE SET
  status = EXCLUDED.status, share_full_history = EXCLUDED.share_full_history,
  consented_at = EXCLUDED.consented_at, revoked_at = EXCLUDED.revoked_at;

-- Mohan Pillai → Dr. Arjun Sharma (AYU): ACTIVE, full history
INSERT INTO patient_doctor_consent
  (patient_id, doctor_id, status, share_full_history, consented_at, revoked_at)
VALUES
  ('e1000000-0000-0000-0000-000000000003',
   'd1000000-0000-0000-0000-000000000001',
   'ACTIVE', TRUE, CURRENT_DATE - 56, NULL)
ON CONFLICT (patient_id, doctor_id) DO UPDATE SET
  status = EXCLUDED.status, share_full_history = EXCLUDED.share_full_history,
  consented_at = EXCLUDED.consented_at, revoked_at = EXCLUDED.revoked_at;

-- ──────────────────────────────────────────────────────────────
-- 2. APPOINTMENTS — DR. PRIYA NAIR (HOM) · hospital_c2
-- ──────────────────────────────────────────────────────────────
-- Existing at hospital_c2 today: f1000000-03 Mohan 14:00 TELECONSULT CONFIRMED
-- Adding: Ravi ARRIVED 09:00, Ananya IN_PROGRESS 10:30

INSERT INTO appointment (id, patient_id, doctor_id, hospital_id,
  appointment_date, start_time, end_time, type, status, booked_by_role, notes)
VALUES

  -- ── TODAY (hospital_c2) ──────────────────────────────────
  ('f5000000-0000-0000-0000-000000000001',
   'e1000000-0000-0000-0000-000000000001',   -- Ravi Kumar
   'd1000000-0000-0000-0000-000000000002',   -- Dr. Priya Nair
   'c1000000-0000-0000-0000-000000000002',   -- Sri Dhanvantri Chennai
   CURRENT_DATE, '09:00', '09:30', 'F2F', 'ARRIVED', 'PATIENT',
   'Routine follow-up. Patient reports blood sugar running slightly high this week.'),

  ('f5000000-0000-0000-0000-000000000002',
   'e1000000-0000-0000-0000-000000000002',   -- Ananya Krishnan
   'd1000000-0000-0000-0000-000000000002',
   'c1000000-0000-0000-0000-000000000002',
   CURRENT_DATE, '10:30', '11:00', 'F2F', 'IN_PROGRESS', 'PATIENT',
   'Asthma review + ongoing skin rash follow-up.'),

  -- ── UPCOMING (hospital_c2) ───────────────────────────────
  ('f5000000-0000-0000-0000-000000000003',
   'e1000000-0000-0000-0000-000000000002',   -- Ananya Krishnan
   'd1000000-0000-0000-0000-000000000002',
   'c1000000-0000-0000-0000-000000000002',
   CURRENT_DATE + 4, '09:30', '10:00', 'F2F', 'BOOKED', 'PATIENT',
   NULL),

  ('f5000000-0000-0000-0000-000000000004',
   'e1000000-0000-0000-0000-000000000003',   -- Mohan Pillai
   'd1000000-0000-0000-0000-000000000002',
   'c1000000-0000-0000-0000-000000000002',
   CURRENT_DATE + 11, '11:00', '11:30', 'F2F', 'BOOKED', 'RECEPTIONIST',
   NULL),

  -- ── PAST COMPLETED — Ananya × Dr. Priya (sequence before f1000000-08 at -15d) ──
  ('f5000000-0000-0000-0000-000000000005',
   'e1000000-0000-0000-0000-000000000002',   -- Ananya, first visit with Dr. Priya
   'd1000000-0000-0000-0000-000000000002',
   'c1000000-0000-0000-0000-000000000002',
   CURRENT_DATE - 46, '09:00', '09:30', 'F2F', 'COMPLETED', 'PATIENT',
   'New patient intake — referred by Dr. Venkat Rao after Siddha treatment completed.'),

  ('f5000000-0000-0000-0000-000000000006',
   'e1000000-0000-0000-0000-000000000002',   -- Ananya, second visit
   'd1000000-0000-0000-0000-000000000002',
   'c1000000-0000-0000-0000-000000000002',
   CURRENT_DATE - 29, '10:00', '10:30', 'F2F', 'COMPLETED', 'PATIENT',
   NULL),

  -- ── PAST COMPLETED — Mohan × Dr. Priya ──────────────────
  ('f5000000-0000-0000-0000-000000000007',
   'e1000000-0000-0000-0000-000000000003',   -- Mohan Pillai, first visit with Dr. Priya
   'd1000000-0000-0000-0000-000000000002',
   'c1000000-0000-0000-0000-000000000002',
   CURRENT_DATE - 21, '11:00', '11:30', 'F2F', 'COMPLETED', 'RECEPTIONIST',
   'Walk-in — knee pain worsened. Patient requesting homeopathic support alongside Siddha.'),

  ('f5000000-0000-0000-0000-000000000008',
   'e1000000-0000-0000-0000-000000000003',   -- Mohan, follow-up
   'd1000000-0000-0000-0000-000000000002',
   'c1000000-0000-0000-0000-000000000002',
   CURRENT_DATE - 6, '10:00', '10:30', 'F2F', 'COMPLETED', 'PATIENT',
   NULL),

  -- ── CANCELLED — Ravi (tests the CANCELLED row display) ───
  ('f5000000-0000-0000-0000-000000000009',
   'e1000000-0000-0000-0000-000000000001',   -- Ravi Kumar
   'd1000000-0000-0000-0000-000000000002',
   'c1000000-0000-0000-0000-000000000002',
   CURRENT_DATE - 3, '09:00', '09:30', 'F2F', 'CANCELLED', 'PATIENT',
   'Patient cancelled same day — family emergency.')

ON CONFLICT (id) DO NOTHING;

-- ──────────────────────────────────────────────────────────────
-- 3. APPOINTMENTS — DR. ARJUN SHARMA (AYU) · hospital_c1
-- ──────────────────────────────────────────────────────────────
-- Existing today at c1: f1-01 Ravi ARRIVED 10:00,
--                       f1-02 Ananya BOOKED 11:00,
--                       f1-04 Ravi BOOKED (walk-in) 15:00
-- Adding:  Mohan CONFIRMED 12:30

INSERT INTO appointment (id, patient_id, doctor_id, hospital_id,
  appointment_date, start_time, end_time, type, status, booked_by_role, notes)
VALUES

  -- ── TODAY (hospital_c1) ──────────────────────────────────
  ('f5000000-0000-0000-0000-000000000010',
   'e1000000-0000-0000-0000-000000000003',   -- Mohan Pillai
   'd1000000-0000-0000-0000-000000000001',   -- Dr. Arjun Sharma
   'c1000000-0000-0000-0000-000000000001',   -- Apollo Ayurveda Chennai
   CURRENT_DATE, '12:30', '13:00', 'F2F', 'CONFIRMED', 'RECEPTIONIST',
   'Knee pain + cholesterol review. Receptionist-booked follow-up.'),

  -- ── UPCOMING (hospital_c1) ───────────────────────────────
  ('f5000000-0000-0000-0000-000000000011',
   'e1000000-0000-0000-0000-000000000003',   -- Mohan Pillai
   'd1000000-0000-0000-0000-000000000001',
   'c1000000-0000-0000-0000-000000000001',
   CURRENT_DATE + 6, '14:00', '14:30', 'F2F', 'BOOKED', 'PATIENT',
   NULL),

  ('f5000000-0000-0000-0000-000000000012',
   'e1000000-0000-0000-0000-000000000002',   -- Ananya Krishnan
   'd1000000-0000-0000-0000-000000000001',
   'c1000000-0000-0000-0000-000000000001',
   CURRENT_DATE + 12, '10:00', '10:30', 'TELECONSULT', 'BOOKED', 'PATIENT',
   NULL),

  -- ── PAST COMPLETED — Ananya × Dr. Arjun ─────────────────
  ('f5000000-0000-0000-0000-000000000013',
   'e1000000-0000-0000-0000-000000000002',   -- Ananya — first visit with Dr. Arjun
   'd1000000-0000-0000-0000-000000000001',
   'c1000000-0000-0000-0000-000000000001',
   CURRENT_DATE - 41, '09:00', '09:30', 'F2F', 'COMPLETED', 'PATIENT',
   'Asthma + seasonal allergies. Patient interested in Ayurveda alongside allopathy.'),

  ('f5000000-0000-0000-0000-000000000014',
   'e1000000-0000-0000-0000-000000000002',   -- Ananya — follow-up
   'd1000000-0000-0000-0000-000000000001',
   'c1000000-0000-0000-0000-000000000001',
   CURRENT_DATE - 18, '09:30', '10:00', 'F2F', 'COMPLETED', 'PATIENT',
   NULL),

  -- ── PAST COMPLETED — Mohan × Dr. Arjun ──────────────────
  ('f5000000-0000-0000-0000-000000000015',
   'e1000000-0000-0000-0000-000000000003',   -- Mohan Pillai — first visit with Dr. Arjun
   'd1000000-0000-0000-0000-000000000001',
   'c1000000-0000-0000-0000-000000000001',
   CURRENT_DATE - 56, '14:00', '14:30', 'F2F', 'COMPLETED', 'RECEPTIONIST',
   'Knee pain + high cholesterol. Seeking Ayurveda complementary to allopathy.'),

  ('f5000000-0000-0000-0000-000000000016',
   'e1000000-0000-0000-0000-000000000003',   -- Mohan — follow-up
   'd1000000-0000-0000-0000-000000000001',
   'c1000000-0000-0000-0000-000000000001',
   CURRENT_DATE - 28, '14:00', '14:30', 'F2F', 'COMPLETED', 'PATIENT',
   NULL),

  -- ── NO_SHOW — Ananya (tests NO_SHOW status display) ──────
  ('f5000000-0000-0000-0000-000000000017',
   'e1000000-0000-0000-0000-000000000002',
   'd1000000-0000-0000-0000-000000000001',
   'c1000000-0000-0000-0000-000000000001',
   CURRENT_DATE - 5, '09:00', '09:30', 'F2F', 'NO_SHOW', 'PATIENT',
   'Patient did not attend. Phone unreachable. Rescheduled.')

ON CONFLICT (id) DO NOTHING;

-- ──────────────────────────────────────────────────────────────
-- 4. CONSULTATIONS — for all COMPLETED appointments above
-- ──────────────────────────────────────────────────────────────

INSERT INTO consultation (id, appointment_id, patient_id, doctor_id,
  chief_complaint, diagnosis, notes, next_visit_date)
VALUES

  -- ── Dr. Priya Nair × Ananya — Visit 1 (f5-05, -46 days) ──
  ('b7000000-0000-0000-0000-000000000001',
   'f5000000-0000-0000-0000-000000000005',
   'e1000000-0000-0000-0000-000000000002',
   'd1000000-0000-0000-0000-000000000002',
   'Recurrent skin rash with itching, mild breathlessness on exertion — post Siddha treatment',
   'Sycotic miasm with Tuberculinum constitution — Homoeopathic intake',
   'Reviewed full Siddha history from Dr. Venkat Rao. Skin rash 80% resolved on Siddha; residual tendency. Asthma likely stress-linked (miasmatic). Constitutional: Natrum Muriaticum 30C. Diet: avoid sour, salty, dairy. Stress management counselling advised.',
   CURRENT_DATE - 29),

  -- ── Dr. Priya Nair × Ananya — Visit 2 (f5-06, -29 days) ──
  ('b7000000-0000-0000-0000-000000000002',
   'f5000000-0000-0000-0000-000000000006',
   'e1000000-0000-0000-0000-000000000002',
   'd1000000-0000-0000-0000-000000000002',
   'Follow-up: rash clear, breathing improved 60%, sleep better',
   'Good constitutional response — Natrum Mur. Adding Arsenicum Album for respiratory component.',
   'Sleep quality improved markedly. Rash fully clear. Mild breathlessness on climbing stairs persists. Adding Arsenicum Album 30C twice weekly. Review in 4 weeks.',
   CURRENT_DATE - 15),

  -- ── Dr. Priya Nair × Mohan — Visit 1 (f5-07, -21 days) ──
  ('b7000000-0000-0000-0000-000000000003',
   'f5000000-0000-0000-0000-000000000007',
   'e1000000-0000-0000-0000-000000000003',
   'd1000000-0000-0000-0000-000000000002',
   'Right knee pain worsened past week, difficulty descending stairs, high cholesterol',
   'Calc Fluor constitution — Homoeopathic intake for joint degeneration + lipid imbalance',
   'Ongoing Siddha treatment from Dr. Venkat (Janu Basti course). Patient requests complementary homoeopathy. Calc Fluor 6X for connective tissue + bone. Rhus Tox 30C for stiffness. Cholesterol: Allium Sativum Q. Lab: LDL 168 mg/dL. Lifestyle: morning walk 30min.',
   CURRENT_DATE - 6),

  -- ── Dr. Priya Nair × Mohan — Visit 2 (f5-08, -6 days) ───
  ('b7000000-0000-0000-0000-000000000004',
   'f5000000-0000-0000-0000-000000000008',
   'e1000000-0000-0000-0000-000000000003',
   'd1000000-0000-0000-0000-000000000002',
   'Follow-up: knee pain 50% better, stiffness reduced, LDL re-check pending',
   'Calc Fluor responding well. Continue regime. Add Ledum Palustre for residual swelling.',
   'Significant improvement in morning stiffness (5 min vs 30 min). Descending stairs easier. LDL test result awaited. Adding Ledum Pal 30C for knee swelling. Next visit: bring LDL report.',
   CURRENT_DATE + 11),

  -- ── Dr. Arjun Sharma × Ananya — Visit 1 (f5-13, -41 days) ──
  ('b7000000-0000-0000-0000-000000000005',
   'f5000000-0000-0000-0000-000000000013',
   'e1000000-0000-0000-0000-000000000002',
   'd1000000-0000-0000-0000-000000000001',
   'Asthma — mild to moderate, seasonal allergies (dust, pollen), recurrent skin rash',
   'Tamaka Shwasa (Ayurveda Asthma) with Kaphaja Twak Vikara — dual presentation',
   'Patient with 5-year asthma history on Salbutamol inhaler PRN. Allergies documented: dust, pollen. Seeks AYUSH complementary. Nadi pariksha: Kapha-Vata prakriti. Starting Vasa Avaleha for bronchodilation. External: Haridra paste for skin rash. Pranayama protocol added.',
   CURRENT_DATE - 18),

  -- ── Dr. Arjun Sharma × Ananya — Visit 2 (f5-14, -18 days) ──
  ('b7000000-0000-0000-0000-000000000006',
   'f5000000-0000-0000-0000-000000000014',
   'e1000000-0000-0000-0000-000000000002',
   'd1000000-0000-0000-0000-000000000001',
   'Follow-up: breathing 70% improved, inhaler use reduced, skin clear',
   'Tamaka Shwasa — excellent response to Vasa Avaleha. Upgrading to Sitopaladi Churna.',
   'Inhaler use down from daily to 2× per week. Skin rash fully resolved with Haridra. Continuing Vasa Avaleha. Adding Sitopaladi Churna for deeper respiratory toning. Pranayama maintained daily. HbA1c not applicable; CBC ordered to rule out eosinophilia.',
   CURRENT_DATE + 12),

  -- ── Dr. Arjun Sharma × Mohan — Visit 1 (f5-15, -56 days) ──
  ('b7000000-0000-0000-0000-000000000007',
   'f5000000-0000-0000-0000-000000000015',
   'e1000000-0000-0000-0000-000000000003',
   'd1000000-0000-0000-0000-000000000001',
   'Bilateral knee pain and stiffness (R>L), high cholesterol on Atorvastatin 10mg',
   'Sandhivata (Ayurvedic Arthritis) + Medo Roga (hyperlipidaemia)',
   'Patient on Atorvastatin 10mg for 4 years. BMI 27.2. Knee X-ray: Grade II OA bilateral. Nadi pariksha: Vata-Kapha prakriti. Starting Maharasnadi Kwath for joint inflammation. Guggulu for lipid control. External Pinda Tailam massage. Lipid panel: TC 240, LDL 162, HDL 38.',
   CURRENT_DATE - 28),

  -- ── Dr. Arjun Sharma × Mohan — Visit 2 (f5-16, -28 days) ──
  ('b7000000-0000-0000-0000-000000000008',
   'f5000000-0000-0000-0000-000000000016',
   'e1000000-0000-0000-0000-000000000003',
   'd1000000-0000-0000-0000-000000000001',
   'Follow-up: stiffness 40% better, HDL improving, still morning pain',
   'Sandhivata — moderate response. Introducing Shallaki (Boswellia) for anti-inflammatory.',
   'Morning stiffness reduced (15 min vs 45 min). Lipid panel improving: LDL 148 (was 162), HDL 42 (was 38). Adding Shallaki capsules for further anti-inflammatory benefit. Atorvastatin dose review with allopathic physician. Yoga: Vajrasana + Pawanmuktasana added.',
   CURRENT_DATE + 6)

ON CONFLICT (id) DO NOTHING;

-- ──────────────────────────────────────────────────────────────
-- 5. PRESCRIPTIONS — for all 8 consultations above
-- ──────────────────────────────────────────────────────────────

INSERT INTO prescription (id, consultation_id, patient_id, doctor_id,
  medicines, instructions, is_repeat,
  entry_method, entered_by, entered_by_role,
  verified_by_doctor, verified_at, verified_by_doctor_id)
VALUES

  -- ── Priya × Ananya Visit 1 (b7-01) — RECEPTIONIST entered, verified ──
  ('c5000000-0000-0000-0000-000000000001',
   'b7000000-0000-0000-0000-000000000001',
   'e1000000-0000-0000-0000-000000000002',
   'd1000000-0000-0000-0000-000000000002',
   '[
     {"name":"Natrum Muriaticum 30C","dosage":"4 globules","frequency":"Once daily morning","duration":"30 days","notes":"Empty stomach. Dissolve under tongue. Avoid mint/coffee/camphor."},
     {"name":"Calendula Q (Mother Tincture)","dosage":"10 drops in 50ml water","frequency":"Apply topically twice daily","duration":"30 days","notes":"For residual skin areas — dab with cotton."}
   ]'::jsonb,
   'Avoid sour food, excess salt, dairy, and fish. No self-medication. Strict antidote avoidance (mint, coffee, camphor, strong perfumes).',
   FALSE,
   'RECEPTIONIST', '6e595fd1-db2e-4252-989d-8712d2c5de89', 'RECEPTIONIST',
   TRUE, CURRENT_DATE - 46 + INTERVAL '2 hours',
   'd1000000-0000-0000-0000-000000000002'),

  -- ── Priya × Ananya Visit 2 (b7-02) — DOCTOR_DIRECT ─────
  ('c5000000-0000-0000-0000-000000000002',
   'b7000000-0000-0000-0000-000000000002',
   'e1000000-0000-0000-0000-000000000002',
   'd1000000-0000-0000-0000-000000000002',
   '[
     {"name":"Natrum Muriaticum 200C","dosage":"2 globules","frequency":"Single dose — do not repeat until review","duration":"6 weeks","notes":"Potency upgraded. One-time dose only."},
     {"name":"Arsenicum Album 30C","dosage":"4 globules","frequency":"Twice weekly (Mon & Thu)","duration":"4 weeks","notes":"For respiratory component — breathlessness on exertion."}
   ]'::jsonb,
   'Continue antidote restrictions. Monitor breathing diary daily. Avoid cold drinks and cold baths. If breathlessness worsens, use Salbutamol inhaler and contact immediately.',
   FALSE,
   'DOCTOR_DIRECT', '7fe14587-5185-484f-89cf-8a1000a8282b', 'DOCTOR',
   TRUE, CURRENT_DATE - 29 + INTERVAL '1 hour',
   'd1000000-0000-0000-0000-000000000002'),

  -- ── Priya × Mohan Visit 1 (b7-03) — DOCTOR_DIRECT ──────
  ('c5000000-0000-0000-0000-000000000003',
   'b7000000-0000-0000-0000-000000000003',
   'e1000000-0000-0000-0000-000000000003',
   'd1000000-0000-0000-0000-000000000002',
   '[
     {"name":"Calc Fluor 6X","dosage":"4 tablets","frequency":"Thrice daily","duration":"30 days","notes":"Tissue salt — supports bone and connective tissue health."},
     {"name":"Rhus Tox 30C","dosage":"4 globules","frequency":"Twice daily","duration":"21 days","notes":"For stiffness worse on first motion, better with continued movement."},
     {"name":"Allium Sativum Q","dosage":"10 drops in water","frequency":"Once daily at bedtime","duration":"30 days","notes":"For cholesterol support — fresh garlic supplement equivalent."}
   ]'::jsonb,
   'Morning walk 30 minutes daily. Avoid cold and damp. Warm sesame oil massage on knees before bath. Reduce fried and oily food. Bring LDL report to next visit.',
   FALSE,
   'DOCTOR_DIRECT', '7fe14587-5185-484f-89cf-8a1000a8282b', 'DOCTOR',
   TRUE, CURRENT_DATE - 21 + INTERVAL '1 hour',
   'd1000000-0000-0000-0000-000000000002'),

  -- ── Priya × Mohan Visit 2 (b7-04) — RECEPTIONIST entered, verified ──
  ('c5000000-0000-0000-0000-000000000004',
   'b7000000-0000-0000-0000-000000000004',
   'e1000000-0000-0000-0000-000000000003',
   'd1000000-0000-0000-0000-000000000002',
   '[
     {"name":"Calc Fluor 6X","dosage":"4 tablets","frequency":"Thrice daily","duration":"30 days","notes":"Continue — tissue salt for joint health."},
     {"name":"Ledum Palustre 30C","dosage":"4 globules","frequency":"Once daily evening","duration":"21 days","notes":"For residual knee swelling — cold applications may temporarily relieve."},
     {"name":"Allium Sativum Q","dosage":"10 drops in water","frequency":"Once daily at bedtime","duration":"30 days","notes":"Continue cholesterol support. Bring LDL report next visit."}
   ]'::jsonb,
   'Continue morning walk. Increase to 45 minutes if tolerated. Avoid cold drinks. Bring LDL report to next appointment. Call clinic if swelling increases suddenly.',
   TRUE,
   'RECEPTIONIST', '6e595fd1-db2e-4252-989d-8712d2c5de89', 'RECEPTIONIST',
   TRUE, CURRENT_DATE - 6 + INTERVAL '2 hours',
   'd1000000-0000-0000-0000-000000000002'),

  -- ── Arjun × Ananya Visit 1 (b7-05) — DOCTOR_DIRECT ─────
  ('c5000000-0000-0000-0000-000000000005',
   'b7000000-0000-0000-0000-000000000005',
   'e1000000-0000-0000-0000-000000000002',
   'd1000000-0000-0000-0000-000000000001',
   '[
     {"name":"Vasa Avaleha","dosage":"10g","frequency":"Twice daily","duration":"30 days","notes":"Before meals with warm water — primary bronchodilator."},
     {"name":"Haridra Khanda","dosage":"5g","frequency":"Once daily at bedtime","duration":"30 days","notes":"For allergic component — skin + respiratory immunity."},
     {"name":"Sitopaladi Churna","dosage":"3g","frequency":"Twice daily","duration":"15 days","notes":"With honey — for respiratory toning and cough prophylaxis."}
   ]'::jsonb,
   'Pranayama: Anulom Vilom 10 min + Bhramari 5 min daily. Avoid dust, cold air, and pollen. Steam inhalation with Eucalyptus twice weekly. Keep Salbutamol inhaler available. Avoid dairy at night.',
   FALSE,
   'DOCTOR_DIRECT', 'aff25416-f9fe-4c1b-9fdc-ce0d31c078fc', 'DOCTOR',
   TRUE, CURRENT_DATE - 41 + INTERVAL '1 hour',
   'd1000000-0000-0000-0000-000000000001'),

  -- ── Arjun × Ananya Visit 2 (b7-06) — RECEPTIONIST entered, verified ──
  ('c5000000-0000-0000-0000-000000000006',
   'b7000000-0000-0000-0000-000000000006',
   'e1000000-0000-0000-0000-000000000002',
   'd1000000-0000-0000-0000-000000000001',
   '[
     {"name":"Vasa Avaleha","dosage":"10g","frequency":"Once daily (maintenance)","duration":"30 days","notes":"Reduced to maintenance dose. Continue long-term."},
     {"name":"Sitopaladi Churna","dosage":"3g","frequency":"Once daily","duration":"30 days","notes":"Upgrade to full course for respiratory toning."},
     {"name":"Haridra Khanda","dosage":"5g","frequency":"Once daily at bedtime","duration":"60 days","notes":"Continue — excellent response for allergic immunity."}
   ]'::jsonb,
   'Continue Pranayama. Inhaler now PRN only — do not use prophylactically. CBC eosinophil count to be done before next visit. Diet: avoid curd at night, cold beverages. Yoga: add Matsyasana for chest expansion.',
   TRUE,
   'RECEPTIONIST', '4d375329-1c14-41ca-88ca-d8b1a0e84865', 'RECEPTIONIST',
   TRUE, CURRENT_DATE - 17 + INTERVAL '3 hours',
   'd1000000-0000-0000-0000-000000000001'),

  -- ── Arjun × Mohan Visit 1 (b7-07) — DOCTOR_DIRECT ──────
  ('c5000000-0000-0000-0000-000000000007',
   'b7000000-0000-0000-0000-000000000007',
   'e1000000-0000-0000-0000-000000000003',
   'd1000000-0000-0000-0000-000000000001',
   '[
     {"name":"Maharasnadi Kwath","dosage":"30ml","frequency":"Twice daily before meals","duration":"30 days","notes":"Dilute in equal warm water. Anti-inflammatory for Vatavyadhi."},
     {"name":"Yogaraja Guggulu","dosage":"2 tablets","frequency":"Twice daily after meals","duration":"30 days","notes":"For joint + lipid support — Guggulu formula."},
     {"name":"Pinda Tailam","dosage":"Apply 5ml externally","frequency":"Once daily at night","duration":"30 days","notes":"Warm oil massage on both knees for 10 minutes."}
   ]'::jsonb,
   'Morning walk 20 minutes, gradually increase. Avoid cold water bath — use lukewarm. Reduce oily and fried food. Atorvastatin: continue with allopathic physician — do not stop. Lipid panel recheck in 30 days.',
   FALSE,
   'DOCTOR_DIRECT', 'aff25416-f9fe-4c1b-9fdc-ce0d31c078fc', 'DOCTOR',
   TRUE, CURRENT_DATE - 56 + INTERVAL '1 hour',
   'd1000000-0000-0000-0000-000000000001'),

  -- ── Arjun × Mohan Visit 2 (b7-08) — DOCTOR_DIRECT, repeat ──
  ('c5000000-0000-0000-0000-000000000008',
   'b7000000-0000-0000-0000-000000000008',
   'e1000000-0000-0000-0000-000000000003',
   'd1000000-0000-0000-0000-000000000001',
   '[
     {"name":"Maharasnadi Kwath","dosage":"30ml","frequency":"Once daily before dinner (maintenance)","duration":"30 days","notes":"Reduced to maintenance. Continue."},
     {"name":"Shallaki (Boswellia) 400mg","dosage":"1 capsule","frequency":"Twice daily after meals","duration":"30 days","notes":"Added for anti-inflammatory — clinical evidence for OA Grade II."},
     {"name":"Yogaraja Guggulu","dosage":"2 tablets","frequency":"Once daily at bedtime","duration":"30 days","notes":"Continue — lipid improving. Reduce to once daily."},
     {"name":"Pinda Tailam","dosage":"Apply 5ml externally","frequency":"Once daily at night","duration":"30 days","notes":"Continue knee massage."}
   ]'::jsonb,
   'Yoga: add Vajrasana (after meals, 10 min) + Pawanmuktasana. Swimming or cycling preferred over jogging. Lipid panel target: LDL <130, HDL >45. Share result with allopathic physician. Next visit: bring updated lipid panel.',
   TRUE,
   'DOCTOR_DIRECT', 'aff25416-f9fe-4c1b-9fdc-ce0d31c078fc', 'DOCTOR',
   TRUE, CURRENT_DATE - 28 + INTERVAL '1 hour',
   'd1000000-0000-0000-0000-000000000001')

ON CONFLICT (id) DO NOTHING;

COMMIT;

-- ── VERIFICATION ─────────────────────────────────────────────
SELECT
  d.first_name || ' ' || d.last_name AS doctor,
  COUNT(DISTINCT a.id)                AS total_appointments,
  COUNT(DISTINCT CASE WHEN a.appointment_date = CURRENT_DATE THEN a.id END) AS today,
  COUNT(DISTINCT CASE WHEN a.appointment_date > CURRENT_DATE  THEN a.id END) AS upcoming,
  COUNT(DISTINCT CASE WHEN a.status = 'COMPLETED' THEN a.id END)             AS completed,
  COUNT(DISTINCT pdc.patient_id)      AS active_patients
FROM doctor d
LEFT JOIN appointment a ON a.doctor_id = d.id
LEFT JOIN patient_doctor_consent pdc ON pdc.doctor_id = d.id AND pdc.status = 'ACTIVE'
WHERE d.id IN (
  'd1000000-0000-0000-0000-000000000001',
  'd1000000-0000-0000-0000-000000000002'
)
GROUP BY d.id, d.first_name, d.last_name
ORDER BY d.last_name;
