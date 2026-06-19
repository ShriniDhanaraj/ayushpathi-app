-- ─────────────────────────────────────────────────────────────────────────────
-- Doctor Availability Seed
-- Sets realistic weekly schedules for all 14 demo doctors.
-- Uses ON CONFLICT DO UPDATE so it's safe to run multiple times.
-- ─────────────────────────────────────────────────────────────────────────────

-- Helper: resolve doctor UUID by email
-- Original 6 doctors have known UUIDs; multilang 8 are looked up by email.

-- ── Original 6 seeded doctors ────────────────────────────────────────────────

-- Dr. Arjun Sharma (AYU) — Chennai C1 — Mon–Sat, morning clinic
INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, slot_duration, active)
SELECT id, d.day, '09:00', '13:00', 20, TRUE
FROM doctor, (VALUES ('MON'),('TUE'),('WED'),('THU'),('FRI'),('SAT')) AS d(day)
WHERE doctor.id = 'd1000000-0000-0000-0000-000000000001'
ON CONFLICT (doctor_id, day_of_week) DO UPDATE
  SET start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time,
      slot_duration = EXCLUDED.slot_duration, active = EXCLUDED.active;

-- Dr. Priya Nair (HOM) — Chennai C2 — Tue–Sun, afternoon clinic
INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, slot_duration, active)
SELECT id, d.day, '14:00', '18:00', 30, TRUE
FROM doctor, (VALUES ('TUE'),('WED'),('THU'),('FRI'),('SAT'),('SUN')) AS d(day)
WHERE doctor.id = 'd1000000-0000-0000-0000-000000000002'
ON CONFLICT (doctor_id, day_of_week) DO UPDATE
  SET start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time,
      slot_duration = EXCLUDED.slot_duration, active = EXCLUDED.active;

-- Dr. Venkat Rao (SID) — Group C1+C2 — Mon/Wed/Fri morning + Tue/Thu afternoon
INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, slot_duration, active)
SELECT id, d.day, d.st, d.et, 15, TRUE
FROM doctor,
(VALUES
  ('MON','09:00','12:00'), ('WED','09:00','12:00'), ('FRI','09:00','12:00'),
  ('TUE','15:00','18:00'), ('THU','15:00','18:00')
) AS d(day, st, et)
WHERE doctor.id = 'd1000000-0000-0000-0000-000000000003'
ON CONFLICT (doctor_id, day_of_week) DO UPDATE
  SET start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time,
      slot_duration = EXCLUDED.slot_duration, active = EXCLUDED.active;

-- Dr. Meena Pillai (YOG) — Kochi C3 — Mon–Fri, 7–9 AM yoga sessions
INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, slot_duration, active)
SELECT id, d.day, '07:00', '09:00', 60, TRUE
FROM doctor, (VALUES ('MON'),('TUE'),('WED'),('THU'),('FRI')) AS d(day)
WHERE doctor.id = 'd1000000-0000-0000-0000-000000000004'
ON CONFLICT (doctor_id, day_of_week) DO UPDATE
  SET start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time,
      slot_duration = EXCLUDED.slot_duration, active = EXCLUDED.active;

-- Dr. Suresh Kumar (UNA) — Independent — Mon–Sat, split morning+evening
INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, slot_duration, active)
SELECT id, d.day, '10:00', '13:00', 20, TRUE
FROM doctor, (VALUES ('MON'),('TUE'),('WED'),('THU'),('FRI'),('SAT')) AS d(day)
WHERE doctor.id = 'd1000000-0000-0000-0000-000000000005'
ON CONFLICT (doctor_id, day_of_week) DO UPDATE
  SET start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time,
      slot_duration = EXCLUDED.slot_duration, active = EXCLUDED.active;

-- Dr. Kavitha Menon (AYU) — Independent Kochi — Tue–Sat, afternoon
INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, slot_duration, active)
SELECT id, d.day, '11:00', '17:00', 30, TRUE
FROM doctor, (VALUES ('TUE'),('WED'),('THU'),('FRI'),('SAT')) AS d(day)
WHERE doctor.id = 'd1000000-0000-0000-0000-000000000006'
ON CONFLICT (doctor_id, day_of_week) DO UPDATE
  SET start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time,
      slot_duration = EXCLUDED.slot_duration, active = EXCLUDED.active;


-- ── Multilang 8 demo doctors (looked up by email) ────────────────────────────

-- Dr. Murugan Arumugam (AYU, Chennai) — Mon–Sat 8–12
INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, slot_duration, active)
SELECT d.id, slot.day, '08:00', '12:00', 20, TRUE
FROM doctor d, (VALUES ('MON'),('TUE'),('WED'),('THU'),('FRI'),('SAT')) AS slot(day)
WHERE d.email = 'dr.murugan@demo.ayushpathi.in'
ON CONFLICT (doctor_id, day_of_week) DO UPDATE
  SET start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time,
      slot_duration = EXCLUDED.slot_duration, active = EXCLUDED.active;

-- Dr. Meenakshi Sundaram (SID, Chennai) — Mon–Fri 10–14
INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, slot_duration, active)
SELECT d.id, slot.day, '10:00', '14:00', 20, TRUE
FROM doctor d, (VALUES ('MON'),('TUE'),('WED'),('THU'),('FRI')) AS slot(day)
WHERE d.email = 'dr.meenakshi@demo.ayushpathi.in'
ON CONFLICT (doctor_id, day_of_week) DO UPDATE
  SET start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time,
      slot_duration = EXCLUDED.slot_duration, active = EXCLUDED.active;

-- Dr. Arun Krishnakumar (HOM, Thiruvananthapuram) — Mon/Wed/Fri/Sat 9–13
INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, slot_duration, active)
SELECT d.id, slot.day, '09:00', '13:00', 30, TRUE
FROM doctor d, (VALUES ('MON'),('WED'),('FRI'),('SAT')) AS slot(day)
WHERE d.email = 'dr.arun@demo.ayushpathi.in'
ON CONFLICT (doctor_id, day_of_week) DO UPDATE
  SET start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time,
      slot_duration = EXCLUDED.slot_duration, active = EXCLUDED.active;

-- Dr. Shivaprasad Hegde (AYU, Bengaluru) — Mon–Sat 9–17 (busy clinic)
INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, slot_duration, active)
SELECT d.id, slot.day, '09:00', '17:00', 30, TRUE
FROM doctor d, (VALUES ('MON'),('TUE'),('WED'),('THU'),('FRI'),('SAT')) AS slot(day)
WHERE d.email = 'dr.shivaprasad@demo.ayushpathi.in'
ON CONFLICT (doctor_id, day_of_week) DO UPDATE
  SET start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time,
      slot_duration = EXCLUDED.slot_duration, active = EXCLUDED.active;

-- Dr. Naseem Qureshi (UNA, Mumbai) — Tue–Sun 11–15 (Friday closed)
INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, slot_duration, active)
SELECT d.id, slot.day, '11:00', '15:00', 20, TRUE
FROM doctor d, (VALUES ('TUE'),('WED'),('THU'),('SAT'),('SUN')) AS slot(day)
WHERE d.email = 'dr.naseem@demo.ayushpathi.in'
ON CONFLICT (doctor_id, day_of_week) DO UPDATE
  SET start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time,
      slot_duration = EXCLUDED.slot_duration, active = EXCLUDED.active;

-- Dr. Pooja Aggarwal (YOG, Delhi) — Mon–Sat, two sessions 6–8 AM and 5–7 PM
-- Storing as two separate rows isn't supported (unique on day) — use longer window
INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, slot_duration, active)
SELECT d.id, slot.day, '06:00', '08:00', 60, TRUE
FROM doctor d, (VALUES ('MON'),('TUE'),('WED'),('THU'),('FRI'),('SAT')) AS slot(day)
WHERE d.email = 'dr.pooja@demo.ayushpathi.in'
ON CONFLICT (doctor_id, day_of_week) DO UPDATE
  SET start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time,
      slot_duration = EXCLUDED.slot_duration, active = EXCLUDED.active;

-- Dr. Padmavathi Reddy (AYU, Hyderabad) — Mon–Fri 10–18
INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, slot_duration, active)
SELECT d.id, slot.day, '10:00', '18:00', 20, TRUE
FROM doctor d, (VALUES ('MON'),('TUE'),('WED'),('THU'),('FRI')) AS slot(day)
WHERE d.email = 'dr.padmavathi@demo.ayushpathi.in'
ON CONFLICT (doctor_id, day_of_week) DO UPDATE
  SET start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time,
      slot_duration = EXCLUDED.slot_duration, active = EXCLUDED.active;

-- Dr. Debabrata Sen (HOM, Kolkata) — Mon/Tue/Thu/Sat 12–17
INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, slot_duration, active)
SELECT d.id, slot.day, '12:00', '17:00', 30, TRUE
FROM doctor d, (VALUES ('MON'),('TUE'),('THU'),('SAT')) AS slot(day)
WHERE d.email = 'dr.debabrata@demo.ayushpathi.in'
ON CONFLICT (doctor_id, day_of_week) DO UPDATE
  SET start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time,
      slot_duration = EXCLUDED.slot_duration, active = EXCLUDED.active;


-- ── Verify ────────────────────────────────────────────────────────────────────
-- SELECT d.first_name, d.last_name, da.day_of_week, da.start_time, da.end_time, da.slot_duration
-- FROM doctor_availability da JOIN doctor d ON d.id = da.doctor_id
-- ORDER BY d.last_name, da.day_of_week;
