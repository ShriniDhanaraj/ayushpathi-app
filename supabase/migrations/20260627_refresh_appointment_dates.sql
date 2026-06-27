-- ============================================================
-- Refresh seed appointment dates to be relative to TODAY
-- Run in Supabase SQL Editor
-- Seed was run on ~2026-06-19, so CURRENT_DATE offsets are stale
-- This script pins them to 2026-06-27 (today) so Upcoming/Past
-- tabs work correctly for all 3 patients
-- ============================================================

-- ── Step 1: Delete test/duplicate bookings created during UI testing
-- (These are appointments NOT in the original seed UUIDs f1000000-...-00[1-9])
-- Keep only the 9 seed appointments; remove any extra test ones
DELETE FROM appointment
WHERE id NOT IN (
  'f1000000-0000-0000-0000-000000000001',
  'f1000000-0000-0000-0000-000000000002',
  'f1000000-0000-0000-0000-000000000003',
  'f1000000-0000-0000-0000-000000000004',
  'f1000000-0000-0000-0000-000000000005',
  'f1000000-0000-0000-0000-000000000006',
  'f1000000-0000-0000-0000-000000000007',
  'f1000000-0000-0000-0000-000000000008',
  'f1000000-0000-0000-0000-000000000009'
);

-- ── Step 2: Reset seed appointment dates relative to TODAY (2026-06-27)
-- Original seed intent:
--   f001 = Ravi Kumar    → Dr. Arjun Sharma   → today,       10:00, BOOKED    (doctor queue + receptionist tests)
--   f002 = Ananya        → Dr. Arjun Sharma   → today,       11:00, BOOKED
--   f003 = Mohan Pillai  → Dr. Priya Nair     → today,       14:00, TELECONSULT CONFIRMED
--   f004 = Ravi Kumar    → Dr. Venkat Rao     → today,       15:00, BOOKED (walk-in)
--   f005 = Ananya        → Dr. Arjun Sharma   → today + 3,  10:00, BOOKED (upcoming)
--   f006 = Mohan Pillai  → Dr. Meena Pillai   → today + 7,  09:00, BOOKED (upcoming)
--   f007 = Ravi Kumar    → Dr. Arjun Sharma   → today - 30, 10:00, COMPLETED (past history)
--   f008 = Ananya        → Dr. Priya Nair     → today - 15, 11:00, COMPLETED (past history)
--   f009 = Mohan Pillai  → Dr. Venkat Rao     → today - 45, 09:00, COMPLETED (past history)

UPDATE appointment SET appointment_date = CURRENT_DATE
WHERE id = 'f1000000-0000-0000-0000-000000000001';

UPDATE appointment SET appointment_date = CURRENT_DATE
WHERE id = 'f1000000-0000-0000-0000-000000000002';

UPDATE appointment SET appointment_date = CURRENT_DATE
WHERE id = 'f1000000-0000-0000-0000-000000000003';

UPDATE appointment SET appointment_date = CURRENT_DATE
WHERE id = 'f1000000-0000-0000-0000-000000000004';

UPDATE appointment SET appointment_date = CURRENT_DATE + 3
WHERE id = 'f1000000-0000-0000-0000-000000000005';

UPDATE appointment SET appointment_date = CURRENT_DATE + 7
WHERE id = 'f1000000-0000-0000-0000-000000000006';

UPDATE appointment SET appointment_date = CURRENT_DATE - 30
WHERE id = 'f1000000-0000-0000-0000-000000000007';

UPDATE appointment SET appointment_date = CURRENT_DATE - 15
WHERE id = 'f1000000-0000-0000-0000-000000000008';

UPDATE appointment SET appointment_date = CURRENT_DATE - 45
WHERE id = 'f1000000-0000-0000-0000-000000000009';

-- ── Step 3: Also refresh consultation next_visit_date
-- patient01 next visit should be +5 days from today (ORANGE badge)
UPDATE consultation SET next_visit_date = CURRENT_DATE + 5
WHERE id = 'ac000000-0000-0000-0000-000000000001';

-- patient02 next visit +2 days (ORANGE)
UPDATE consultation SET next_visit_date = CURRENT_DATE + 2
WHERE id = 'ac000000-0000-0000-0000-000000000002';

-- patient03 next visit OVERDUE -10 days (RED)
UPDATE consultation SET next_visit_date = CURRENT_DATE - 10
WHERE id = 'ac000000-0000-0000-0000-000000000003';

-- ── Verify ────────────────────────────────────────────────────
SELECT
  a.id,
  p.first_name || ' ' || p.last_name AS patient,
  d.first_name || ' ' || d.last_name AS doctor,
  a.appointment_date,
  a.start_time,
  a.type,
  a.status,
  CASE
    WHEN a.appointment_date > CURRENT_DATE THEN 'UPCOMING'
    WHEN a.appointment_date = CURRENT_DATE THEN 'TODAY'
    ELSE 'PAST'
  END AS bucket
FROM appointment a
JOIN patient p ON p.id = a.patient_id
JOIN doctor d ON d.id = a.doctor_id
WHERE a.id LIKE 'f1000000%'
ORDER BY a.appointment_date, a.start_time;
