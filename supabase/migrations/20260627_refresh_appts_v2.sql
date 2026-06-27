-- ============================================================
-- Refresh seed appointment dates — v2
-- Fixes FK constraint error from v1 (consultation references appts)
-- Run in Supabase SQL Editor
-- ============================================================

-- ── Step 1: Delete child records of non-seed test appointments
-- Cascade order: prescription → consultation → appointment

DELETE FROM prescription
WHERE consultation_id IN (
  SELECT id FROM consultation
  WHERE appointment_id NOT IN (
    'f1000000-0000-0000-0000-000000000001',
    'f1000000-0000-0000-0000-000000000002',
    'f1000000-0000-0000-0000-000000000003',
    'f1000000-0000-0000-0000-000000000004',
    'f1000000-0000-0000-0000-000000000005',
    'f1000000-0000-0000-0000-000000000006',
    'f1000000-0000-0000-0000-000000000007',
    'f1000000-0000-0000-0000-000000000008',
    'f1000000-0000-0000-0000-000000000009'
  )
);

DELETE FROM consultation
WHERE appointment_id NOT IN (
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

-- ── Step 2: Reset seed appointment dates to CURRENT_DATE offsets
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

-- ── Step 3: Refresh consultation next_visit_date badges
UPDATE consultation SET next_visit_date = CURRENT_DATE + 5
  WHERE id = 'ac000000-0000-0000-0000-000000000001';
UPDATE consultation SET next_visit_date = CURRENT_DATE + 2
  WHERE id = 'ac000000-0000-0000-0000-000000000002';
UPDATE consultation SET next_visit_date = CURRENT_DATE - 10
  WHERE id = 'ac000000-0000-0000-0000-000000000003';

-- ── Step 4: Deduplicate patient_family rows
-- Keep only the row with the lowest ctid per (patient_id, first_name, last_name)
DELETE FROM patient_family
WHERE ctid NOT IN (
  SELECT MIN(ctid)
  FROM patient_family
  GROUP BY patient_id, relation_type, first_name, last_name
);

-- ── Verify appointments
SELECT
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
ORDER BY a.appointment_date, a.start_time;

-- ── Verify family members (should show no duplicates)
SELECT patient_id, relation_type, first_name, last_name, COUNT(*) AS cnt
FROM patient_family
GROUP BY patient_id, relation_type, first_name, last_name
ORDER BY patient_id, relation_type;
