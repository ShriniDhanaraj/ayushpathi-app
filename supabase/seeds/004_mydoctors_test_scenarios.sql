-- ================================================================
-- Ayushpathi — My Doctors Screen Test Scenarios (Seed 004)
-- Run AFTER 003_rich_patient_history.sql
--
-- Adds missing edge-case consents so every UI state can be tested:
--   Scenario A: No doctors linked         → Mohan Pillai (before this seed, only 1)
--   Scenario B: 1 active, no revoked      → Mohan Pillai currently
--   Scenario C: 1 active + 1 revoked      → Ravi Kumar & Ananya (already seeded)
--   Scenario D: 2 active (full + partial) → Mohan Pillai (added below)
--   Scenario E: Revoke live action        → Use Ravi's ACTIVE row
--   Scenario F: Re-grant live action      → Use Ravi's REVOKED row
--
-- After running this seed:
--   Mohan Pillai → 2 ACTIVE doctors:
--     Dr. Venkat Rao (SID) — ACTIVE, share_full_history=TRUE  → shows Full History badge
--     Dr. Suresh Kumar (UNA) — ACTIVE, share_full_history=FALSE → no badge (partial only)
-- ================================================================

-- ── Mohan Pillai: add Dr. Suresh Kumar (UNA) as a second ACTIVE doctor ──
-- share_full_history=FALSE so we can test the absence of the Full History badge
INSERT INTO patient_doctor_consent
  (patient_id, doctor_id, status, share_full_history, consented_at, revoked_at)
VALUES
  ('e1000000-0000-0000-0000-000000000003',  -- Mohan Pillai
   'd1000000-0000-0000-0000-000000000005',  -- Dr. Suresh Kumar (UNA)
   'ACTIVE',
   FALSE,                                    -- partial history only — no badge expected
   CURRENT_DATE - 20,
   NULL)
ON CONFLICT (patient_id, doctor_id) DO UPDATE SET
  status             = EXCLUDED.status,
  share_full_history = EXCLUDED.share_full_history,
  consented_at       = EXCLUDED.consented_at,
  revoked_at         = EXCLUDED.revoked_at;

-- ── Ravi Kumar: add a third doctor (REVOKED quickly) ────────────
-- Gives Ravi 2 REVOKED + 1 ACTIVE so the REVOKED section shows multiple cards
INSERT INTO patient_doctor_consent
  (patient_id, doctor_id, status, share_full_history, consented_at, revoked_at)
VALUES
  ('e1000000-0000-0000-0000-000000000001',  -- Ravi Kumar
   'd1000000-0000-0000-0000-000000000004',  -- Dr. Meena Pillai (YOG)
   'REVOKED',
   FALSE,
   CURRENT_DATE - 45,
   CURRENT_DATE - 5)
ON CONFLICT (patient_id, doctor_id) DO UPDATE SET
  status             = EXCLUDED.status,
  share_full_history = EXCLUDED.share_full_history,
  consented_at       = EXCLUDED.consented_at,
  revoked_at         = EXCLUDED.revoked_at;

-- ================================================================
-- VERIFICATION QUERY — run after applying seed to confirm
-- ================================================================
-- SELECT
--   p.first_name || ' ' || p.last_name AS patient,
--   d.first_name || ' ' || d.last_name AS doctor,
--   d.ayush_specialization             AS spec,
--   pdc.status,
--   pdc.share_full_history,
--   pdc.consented_at::date             AS consented,
--   pdc.revoked_at::date               AS revoked
-- FROM patient_doctor_consent pdc
-- JOIN patient p ON p.id = pdc.patient_id
-- JOIN doctor  d ON d.id = pdc.doctor_id
-- ORDER BY p.last_name, pdc.consented_at;
