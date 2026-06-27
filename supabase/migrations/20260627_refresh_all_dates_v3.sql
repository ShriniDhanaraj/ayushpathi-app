-- ============================================================
-- Ayushpathi — Comprehensive Date Refresh (v3)
-- Fixes: appointment_date = old seed date (e.g. 2026-06-19)
--        causing doctor/patient dashboards to show 0 counts
--
-- SAFE: does NOT delete any rows. Only updates dates.
-- Run AFTER all seeds (001–005) have been applied.
-- Run in Supabase SQL Editor (postgres role).
-- Safe to re-run any time dates go stale.
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- SECTION 1: DIAGNOSTIC
-- Run this first to see what's in the DB before refreshing
-- ──────────────────────────────────────────────────────────────

SELECT
  d.first_name || ' ' || d.last_name            AS doctor,
  COUNT(*)                                       AS total_appts,
  COUNT(*) FILTER (WHERE a.appointment_date = CURRENT_DATE)                 AS today,
  COUNT(*) FILTER (WHERE a.appointment_date > CURRENT_DATE)                 AS upcoming,
  COUNT(*) FILTER (WHERE a.appointment_date < CURRENT_DATE AND a.status = 'COMPLETED') AS past_completed,
  MIN(a.appointment_date)::TEXT                  AS earliest_date,
  MAX(a.appointment_date)::TEXT                  AS latest_date
FROM appointment a
JOIN doctor d ON d.id = a.doctor_id
WHERE d.id IN (
  'd1000000-0000-0000-0000-000000000001',
  'd1000000-0000-0000-0000-000000000002'
)
GROUP BY d.id, d.first_name, d.last_name
ORDER BY d.last_name;

-- ──────────────────────────────────────────────────────────────
-- SECTION 2: DATE REFRESH
-- ──────────────────────────────────────────────────────────────

BEGIN;

-- ── Series f1: Original 9 base seed appointments ─────────────
-- (also handled by v1/v2 refresh — safe to repeat)
UPDATE appointment SET appointment_date = CURRENT_DATE       WHERE id = 'f1000000-0000-0000-0000-000000000001';  -- Ravi → Arjun     TODAY ARRIVED
UPDATE appointment SET appointment_date = CURRENT_DATE       WHERE id = 'f1000000-0000-0000-0000-000000000002';  -- Ananya → Arjun   TODAY BOOKED
UPDATE appointment SET appointment_date = CURRENT_DATE       WHERE id = 'f1000000-0000-0000-0000-000000000003';  -- Mohan → Priya    TODAY CONFIRMED (teleconsult)
UPDATE appointment SET appointment_date = CURRENT_DATE       WHERE id = 'f1000000-0000-0000-0000-000000000004';  -- Ravi → Venkat    TODAY BOOKED walk-in
UPDATE appointment SET appointment_date = CURRENT_DATE + 3   WHERE id = 'f1000000-0000-0000-0000-000000000005';  -- Ananya → Arjun   +3 BOOKED
UPDATE appointment SET appointment_date = CURRENT_DATE + 7   WHERE id = 'f1000000-0000-0000-0000-000000000006';  -- Mohan → Meena    +7 BOOKED
UPDATE appointment SET appointment_date = CURRENT_DATE - 30  WHERE id = 'f1000000-0000-0000-0000-000000000007';  -- Ravi → Arjun     -30 COMPLETED
UPDATE appointment SET appointment_date = CURRENT_DATE - 15  WHERE id = 'f1000000-0000-0000-0000-000000000008';  -- Ananya → Priya   -15 COMPLETED
UPDATE appointment SET appointment_date = CURRENT_DATE - 45  WHERE id = 'f1000000-0000-0000-0000-000000000009';  -- Mohan → Venkat   -45 COMPLETED

-- ── Series a3: Ravi Kumar × Dr. Arjun Sharma (Seed 003) ──────
UPDATE appointment SET appointment_date = CURRENT_DATE - 120 WHERE id = 'a3000000-0000-0000-0000-000000000001';  -- Visit 1
UPDATE appointment SET appointment_date = CURRENT_DATE - 90  WHERE id = 'a3000000-0000-0000-0000-000000000002';  -- Visit 2
UPDATE appointment SET appointment_date = CURRENT_DATE - 60  WHERE id = 'a3000000-0000-0000-0000-000000000003';  -- Visit 3
UPDATE appointment SET appointment_date = CURRENT_DATE - 42  WHERE id = 'a3000000-0000-0000-0000-000000000004';  -- Visit 4
UPDATE appointment SET appointment_date = CURRENT_DATE - 21  WHERE id = 'a3000000-0000-0000-0000-000000000005';  -- Visit 5 (last with Arjun)

-- ── Series a4: Ravi Kumar × Dr. Priya Nair (Seed 003) ────────
UPDATE appointment SET appointment_date = CURRENT_DATE - 14  WHERE id = 'a4000000-0000-0000-0000-000000000001';  -- New doctor intake
UPDATE appointment SET appointment_date = CURRENT_DATE - 7   WHERE id = 'a4000000-0000-0000-0000-000000000002';  -- Follow-up
UPDATE appointment SET appointment_date = CURRENT_DATE + 7   WHERE id = 'a4000000-0000-0000-0000-000000000003';  -- Upcoming

-- ── Series a5: Ananya Krishnan (Seed 003) ────────────────────
UPDATE appointment SET appointment_date = CURRENT_DATE - 75  WHERE id = 'a5000000-0000-0000-0000-000000000001';  -- Ananya → Venkat Visit 1
UPDATE appointment SET appointment_date = CURRENT_DATE - 45  WHERE id = 'a5000000-0000-0000-0000-000000000002';  -- Ananya → Venkat Visit 2
UPDATE appointment SET appointment_date = CURRENT_DATE - 20  WHERE id = 'a5000000-0000-0000-0000-000000000003';  -- Ananya → Venkat Visit 3
UPDATE appointment SET appointment_date = CURRENT_DATE - 10  WHERE id = 'a5000000-0000-0000-0000-000000000004';  -- Ananya → Meena  Visit 1
UPDATE appointment SET appointment_date = CURRENT_DATE + 5   WHERE id = 'a5000000-0000-0000-0000-000000000005';  -- Ananya → Meena  Upcoming

-- ── Series a6: Mohan Pillai × Dr. Venkat Rao (Seed 003) ──────
UPDATE appointment SET appointment_date = CURRENT_DATE - 100 WHERE id = 'a6000000-0000-0000-0000-000000000001';  -- Visit 1
UPDATE appointment SET appointment_date = CURRENT_DATE - 65  WHERE id = 'a6000000-0000-0000-0000-000000000002';  -- Visit 2
UPDATE appointment SET appointment_date = CURRENT_DATE - 30  WHERE id = 'a6000000-0000-0000-0000-000000000003';  -- Visit 3
UPDATE appointment SET appointment_date = CURRENT_DATE + 14  WHERE id = 'a6000000-0000-0000-0000-000000000004';  -- Upcoming

-- ── Series f5: New seed 005 (Dr. Priya Nair + Dr. Arjun) ──────
UPDATE appointment SET appointment_date = CURRENT_DATE       WHERE id = 'f5000000-0000-0000-0000-000000000001';  -- Ravi → Priya     TODAY ARRIVED
UPDATE appointment SET appointment_date = CURRENT_DATE       WHERE id = 'f5000000-0000-0000-0000-000000000002';  -- Ananya → Priya   TODAY IN_PROGRESS
UPDATE appointment SET appointment_date = CURRENT_DATE + 4   WHERE id = 'f5000000-0000-0000-0000-000000000003';  -- Ananya → Priya   +4 BOOKED
UPDATE appointment SET appointment_date = CURRENT_DATE + 11  WHERE id = 'f5000000-0000-0000-0000-000000000004';  -- Mohan → Priya    +11 BOOKED
UPDATE appointment SET appointment_date = CURRENT_DATE - 46  WHERE id = 'f5000000-0000-0000-0000-000000000005';  -- Ananya → Priya   -46 COMPLETED
UPDATE appointment SET appointment_date = CURRENT_DATE - 29  WHERE id = 'f5000000-0000-0000-0000-000000000006';  -- Ananya → Priya   -29 COMPLETED
UPDATE appointment SET appointment_date = CURRENT_DATE - 21  WHERE id = 'f5000000-0000-0000-0000-000000000007';  -- Mohan → Priya    -21 COMPLETED
UPDATE appointment SET appointment_date = CURRENT_DATE - 6   WHERE id = 'f5000000-0000-0000-0000-000000000008';  -- Mohan → Priya    -6  COMPLETED
UPDATE appointment SET appointment_date = CURRENT_DATE - 3   WHERE id = 'f5000000-0000-0000-0000-000000000009';  -- Ravi → Priya     -3  CANCELLED
UPDATE appointment SET appointment_date = CURRENT_DATE       WHERE id = 'f5000000-0000-0000-0000-000000000010'; -- Mohan → Arjun   TODAY CONFIRMED
UPDATE appointment SET appointment_date = CURRENT_DATE + 6   WHERE id = 'f5000000-0000-0000-0000-000000000011'; -- Mohan → Arjun   +6  BOOKED
UPDATE appointment SET appointment_date = CURRENT_DATE + 12  WHERE id = 'f5000000-0000-0000-0000-000000000012'; -- Ananya → Arjun  +12 TELECONSULT
UPDATE appointment SET appointment_date = CURRENT_DATE - 41  WHERE id = 'f5000000-0000-0000-0000-000000000013'; -- Ananya → Arjun  -41 COMPLETED
UPDATE appointment SET appointment_date = CURRENT_DATE - 18  WHERE id = 'f5000000-0000-0000-0000-000000000014'; -- Ananya → Arjun  -18 COMPLETED
UPDATE appointment SET appointment_date = CURRENT_DATE - 56  WHERE id = 'f5000000-0000-0000-0000-000000000015'; -- Mohan → Arjun   -56 COMPLETED
UPDATE appointment SET appointment_date = CURRENT_DATE - 28  WHERE id = 'f5000000-0000-0000-0000-000000000016'; -- Mohan → Arjun   -28 COMPLETED
UPDATE appointment SET appointment_date = CURRENT_DATE - 5   WHERE id = 'f5000000-0000-0000-0000-000000000017'; -- Ananya → Arjun  -5  NO_SHOW

-- ── Prescription audit seed: walk-in and teleconsult appts ────
UPDATE appointment SET appointment_date = CURRENT_DATE WHERE id = 'f1000000-0000-0000-0000-000000000004';  -- already set above (safe repeat)

-- ── Consultation next_visit_dates ─────────────────────────────
-- Base seed consultations
UPDATE consultation SET next_visit_date = CURRENT_DATE + 5  WHERE id = 'ac000000-0000-0000-0000-000000000001';
UPDATE consultation SET next_visit_date = CURRENT_DATE + 2  WHERE id = 'ac000000-0000-0000-0000-000000000002';
UPDATE consultation SET next_visit_date = CURRENT_DATE - 10 WHERE id = 'ac000000-0000-0000-0000-000000000003';
UPDATE consultation SET next_visit_date = CURRENT_DATE + 14 WHERE id = 'ac000000-0000-0000-0000-000000000005';

-- Seed 003 consultations — Ravi × Arjun
UPDATE consultation SET next_visit_date = CURRENT_DATE - 90 WHERE id = 'b3000000-0000-0000-0000-000000000001';
UPDATE consultation SET next_visit_date = CURRENT_DATE - 60 WHERE id = 'b3000000-0000-0000-0000-000000000002';
UPDATE consultation SET next_visit_date = CURRENT_DATE - 42 WHERE id = 'b3000000-0000-0000-0000-000000000003';
UPDATE consultation SET next_visit_date = CURRENT_DATE - 21 WHERE id = 'b3000000-0000-0000-0000-000000000004';
UPDATE consultation SET next_visit_date = NULL              WHERE id = 'b3000000-0000-0000-0000-000000000005';

-- Seed 003 — Ravi × Priya
UPDATE consultation SET next_visit_date = CURRENT_DATE - 7  WHERE id = 'b4000000-0000-0000-0000-000000000001';
UPDATE consultation SET next_visit_date = CURRENT_DATE + 7  WHERE id = 'b4000000-0000-0000-0000-000000000002';

-- Seed 003 — Ananya × Venkat → Meena
UPDATE consultation SET next_visit_date = CURRENT_DATE - 45 WHERE id = 'b5000000-0000-0000-0000-000000000001';
UPDATE consultation SET next_visit_date = CURRENT_DATE - 20 WHERE id = 'b5000000-0000-0000-0000-000000000002';
UPDATE consultation SET next_visit_date = NULL              WHERE id = 'b5000000-0000-0000-0000-000000000003';
UPDATE consultation SET next_visit_date = CURRENT_DATE + 5  WHERE id = 'b5000000-0000-0000-0000-000000000004';

-- Seed 003 — Mohan × Venkat
UPDATE consultation SET next_visit_date = CURRENT_DATE - 65 WHERE id = 'b6000000-0000-0000-0000-000000000001';
UPDATE consultation SET next_visit_date = CURRENT_DATE - 30 WHERE id = 'b6000000-0000-0000-0000-000000000002';
UPDATE consultation SET next_visit_date = CURRENT_DATE + 14 WHERE id = 'b6000000-0000-0000-0000-000000000003';

-- Seed 005 consultations
UPDATE consultation SET next_visit_date = CURRENT_DATE - 29 WHERE id = 'b7000000-0000-0000-0000-000000000001';
UPDATE consultation SET next_visit_date = CURRENT_DATE - 15 WHERE id = 'b7000000-0000-0000-0000-000000000002';
UPDATE consultation SET next_visit_date = CURRENT_DATE - 6  WHERE id = 'b7000000-0000-0000-0000-000000000003';
UPDATE consultation SET next_visit_date = CURRENT_DATE + 11 WHERE id = 'b7000000-0000-0000-0000-000000000004';
UPDATE consultation SET next_visit_date = CURRENT_DATE - 18 WHERE id = 'b7000000-0000-0000-0000-000000000005';
UPDATE consultation SET next_visit_date = CURRENT_DATE + 12 WHERE id = 'b7000000-0000-0000-0000-000000000006';
UPDATE consultation SET next_visit_date = CURRENT_DATE - 28 WHERE id = 'b7000000-0000-0000-0000-000000000007';
UPDATE consultation SET next_visit_date = CURRENT_DATE + 6  WHERE id = 'b7000000-0000-0000-0000-000000000008';

COMMIT;

-- ──────────────────────────────────────────────────────────────
-- SECTION 3: VERIFY — run after COMMIT
-- Expected after refresh:
--   Dr. Arjun Sharma: today=4, upcoming=3, active_patients=2
--   Dr. Priya Nair:   today=3, upcoming=3, active_patients=3
-- ──────────────────────────────────────────────────────────────

SELECT
  d.first_name || ' ' || d.last_name               AS doctor,
  COUNT(*) FILTER (WHERE a.appointment_date = CURRENT_DATE AND a.status != 'CANCELLED')  AS today,
  COUNT(*) FILTER (WHERE a.appointment_date > CURRENT_DATE AND a.status IN ('BOOKED','CONFIRMED')) AS upcoming,
  (SELECT COUNT(*) FROM patient_doctor_consent pdc
   WHERE pdc.doctor_id = d.id AND pdc.status = 'ACTIVE')                                 AS active_patients,
  MIN(a.appointment_date)::TEXT                     AS earliest,
  MAX(a.appointment_date)::TEXT                     AS latest
FROM appointment a
JOIN doctor d ON d.id = a.doctor_id
WHERE d.id IN (
  'd1000000-0000-0000-0000-000000000001',
  'd1000000-0000-0000-0000-000000000002'
)
GROUP BY d.id, d.first_name, d.last_name
ORDER BY d.last_name;
