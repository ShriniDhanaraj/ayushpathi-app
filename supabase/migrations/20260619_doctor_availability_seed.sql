-- ─────────────────────────────────────────────────────────────────────────────
-- Doctor Availability Seed — explicit ::TIME casts throughout
-- ON CONFLICT DO UPDATE → safe to re-run
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Original 6 doctors (known UUIDs) ─────────────────────────────────────────

-- Dr. Arjun Sharma (AYU, Chennai C1) — Mon–Sat 09:00–13:00, 20 min slots
INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, slot_duration, active)
SELECT d.id, s.day, '09:00'::TIME, '13:00'::TIME, 20, TRUE
FROM doctor d
CROSS JOIN (VALUES ('MON'),('TUE'),('WED'),('THU'),('FRI'),('SAT')) AS s(day)
WHERE d.id = 'd1000000-0000-0000-0000-000000000001'
ON CONFLICT (doctor_id, day_of_week) DO UPDATE
  SET start_time=EXCLUDED.start_time, end_time=EXCLUDED.end_time,
      slot_duration=EXCLUDED.slot_duration, active=EXCLUDED.active;

-- Dr. Priya Nair (HOM, Chennai C2) — Tue–Sun 14:00–18:00, 30 min slots
INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, slot_duration, active)
SELECT d.id, s.day, '14:00'::TIME, '18:00'::TIME, 30, TRUE
FROM doctor d
CROSS JOIN (VALUES ('TUE'),('WED'),('THU'),('FRI'),('SAT'),('SUN')) AS s(day)
WHERE d.id = 'd1000000-0000-0000-0000-000000000002'
ON CONFLICT (doctor_id, day_of_week) DO UPDATE
  SET start_time=EXCLUDED.start_time, end_time=EXCLUDED.end_time,
      slot_duration=EXCLUDED.slot_duration, active=EXCLUDED.active;

-- Dr. Venkat Rao (SID, Group C1+C2) — different times per day
INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, slot_duration, active)
SELECT d.id, s.day, s.st::TIME, s.et::TIME, 15, TRUE
FROM doctor d
CROSS JOIN (VALUES
  ('MON','09:00','12:00'),
  ('TUE','15:00','18:00'),
  ('WED','09:00','12:00'),
  ('THU','15:00','18:00'),
  ('FRI','09:00','12:00')
) AS s(day, st, et)
WHERE d.id = 'd1000000-0000-0000-0000-000000000003'
ON CONFLICT (doctor_id, day_of_week) DO UPDATE
  SET start_time=EXCLUDED.start_time, end_time=EXCLUDED.end_time,
      slot_duration=EXCLUDED.slot_duration, active=EXCLUDED.active;

-- Dr. Meena Pillai (YOG, Kochi C3) — Mon–Fri 07:00–09:00, 60 min yoga sessions
INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, slot_duration, active)
SELECT d.id, s.day, '07:00'::TIME, '09:00'::TIME, 60, TRUE
FROM doctor d
CROSS JOIN (VALUES ('MON'),('TUE'),('WED'),('THU'),('FRI')) AS s(day)
WHERE d.id = 'd1000000-0000-0000-0000-000000000004'
ON CONFLICT (doctor_id, day_of_week) DO UPDATE
  SET start_time=EXCLUDED.start_time, end_time=EXCLUDED.end_time,
      slot_duration=EXCLUDED.slot_duration, active=EXCLUDED.active;

-- Dr. Suresh Kumar (UNA, Independent) — Mon–Sat 10:00–13:00, 20 min slots
INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, slot_duration, active)
SELECT d.id, s.day, '10:00'::TIME, '13:00'::TIME, 20, TRUE
FROM doctor d
CROSS JOIN (VALUES ('MON'),('TUE'),('WED'),('THU'),('FRI'),('SAT')) AS s(day)
WHERE d.id = 'd1000000-0000-0000-0000-000000000005'
ON CONFLICT (doctor_id, day_of_week) DO UPDATE
  SET start_time=EXCLUDED.start_time, end_time=EXCLUDED.end_time,
      slot_duration=EXCLUDED.slot_duration, active=EXCLUDED.active;

-- Dr. Kavitha Menon (AYU, Independent Kochi) — Tue–Sat 11:00–17:00, 30 min slots
INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, slot_duration, active)
SELECT d.id, s.day, '11:00'::TIME, '17:00'::TIME, 30, TRUE
FROM doctor d
CROSS JOIN (VALUES ('TUE'),('WED'),('THU'),('FRI'),('SAT')) AS s(day)
WHERE d.id = 'd1000000-0000-0000-0000-000000000006'
ON CONFLICT (doctor_id, day_of_week) DO UPDATE
  SET start_time=EXCLUDED.start_time, end_time=EXCLUDED.end_time,
      slot_duration=EXCLUDED.slot_duration, active=EXCLUDED.active;


-- ── Multilang 8 doctors (looked up by email) ──────────────────────────────────

-- Dr. Murugan Arumugam (AYU, Chennai) — Mon–Sat 08:00–12:00, 20 min
INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, slot_duration, active)
SELECT d.id, s.day, '08:00'::TIME, '12:00'::TIME, 20, TRUE
FROM doctor d
CROSS JOIN (VALUES ('MON'),('TUE'),('WED'),('THU'),('FRI'),('SAT')) AS s(day)
WHERE d.email = 'dr.murugan@demo.ayushpathi.in'
ON CONFLICT (doctor_id, day_of_week) DO UPDATE
  SET start_time=EXCLUDED.start_time, end_time=EXCLUDED.end_time,
      slot_duration=EXCLUDED.slot_duration, active=EXCLUDED.active;

-- Dr. Meenakshi Sundaram (SID, Chennai) — Mon–Fri 10:00–14:00, 20 min
INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, slot_duration, active)
SELECT d.id, s.day, '10:00'::TIME, '14:00'::TIME, 20, TRUE
FROM doctor d
CROSS JOIN (VALUES ('MON'),('TUE'),('WED'),('THU'),('FRI')) AS s(day)
WHERE d.email = 'dr.meenakshi@demo.ayushpathi.in'
ON CONFLICT (doctor_id, day_of_week) DO UPDATE
  SET start_time=EXCLUDED.start_time, end_time=EXCLUDED.end_time,
      slot_duration=EXCLUDED.slot_duration, active=EXCLUDED.active;

-- Dr. Arun Krishnakumar (HOM, Thiruvananthapuram) — Mon/Wed/Fri/Sat 09:00–13:00, 30 min
INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, slot_duration, active)
SELECT d.id, s.day, '09:00'::TIME, '13:00'::TIME, 30, TRUE
FROM doctor d
CROSS JOIN (VALUES ('MON'),('WED'),('FRI'),('SAT')) AS s(day)
WHERE d.email = 'dr.arun@demo.ayushpathi.in'
ON CONFLICT (doctor_id, day_of_week) DO UPDATE
  SET start_time=EXCLUDED.start_time, end_time=EXCLUDED.end_time,
      slot_duration=EXCLUDED.slot_duration, active=EXCLUDED.active;

-- Dr. Shivaprasad Hegde (AYU, Bengaluru) — Mon–Sat 09:00–17:00, 30 min
INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, slot_duration, active)
SELECT d.id, s.day, '09:00'::TIME, '17:00'::TIME, 30, TRUE
FROM doctor d
CROSS JOIN (VALUES ('MON'),('TUE'),('WED'),('THU'),('FRI'),('SAT')) AS s(day)
WHERE d.email = 'dr.shivaprasad@demo.ayushpathi.in'
ON CONFLICT (doctor_id, day_of_week) DO UPDATE
  SET start_time=EXCLUDED.start_time, end_time=EXCLUDED.end_time,
      slot_duration=EXCLUDED.slot_duration, active=EXCLUDED.active;

-- Dr. Naseem Qureshi (UNA, Mumbai) — Tue/Wed/Thu/Sat/Sun 11:00–15:00, 20 min
INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, slot_duration, active)
SELECT d.id, s.day, '11:00'::TIME, '15:00'::TIME, 20, TRUE
FROM doctor d
CROSS JOIN (VALUES ('TUE'),('WED'),('THU'),('SAT'),('SUN')) AS s(day)
WHERE d.email = 'dr.naseem@demo.ayushpathi.in'
ON CONFLICT (doctor_id, day_of_week) DO UPDATE
  SET start_time=EXCLUDED.start_time, end_time=EXCLUDED.end_time,
      slot_duration=EXCLUDED.slot_duration, active=EXCLUDED.active;

-- Dr. Pooja Aggarwal (YOG, Delhi) — Mon–Sat 06:00–08:00, 60 min yoga
INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, slot_duration, active)
SELECT d.id, s.day, '06:00'::TIME, '08:00'::TIME, 60, TRUE
FROM doctor d
CROSS JOIN (VALUES ('MON'),('TUE'),('WED'),('THU'),('FRI'),('SAT')) AS s(day)
WHERE d.email = 'dr.pooja@demo.ayushpathi.in'
ON CONFLICT (doctor_id, day_of_week) DO UPDATE
  SET start_time=EXCLUDED.start_time, end_time=EXCLUDED.end_time,
      slot_duration=EXCLUDED.slot_duration, active=EXCLUDED.active;

-- Dr. Padmavathi Reddy (AYU, Hyderabad) — Mon–Fri 10:00–18:00, 20 min
INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, slot_duration, active)
SELECT d.id, s.day, '10:00'::TIME, '18:00'::TIME, 20, TRUE
FROM doctor d
CROSS JOIN (VALUES ('MON'),('TUE'),('WED'),('THU'),('FRI')) AS s(day)
WHERE d.email = 'dr.padmavathi@demo.ayushpathi.in'
ON CONFLICT (doctor_id, day_of_week) DO UPDATE
  SET start_time=EXCLUDED.start_time, end_time=EXCLUDED.end_time,
      slot_duration=EXCLUDED.slot_duration, active=EXCLUDED.active;

-- Dr. Debabrata Sen (HOM, Kolkata) — Mon/Tue/Thu/Sat 12:00–17:00, 30 min
INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, slot_duration, active)
SELECT d.id, s.day, '12:00'::TIME, '17:00'::TIME, 30, TRUE
FROM doctor d
CROSS JOIN (VALUES ('MON'),('TUE'),('THU'),('SAT')) AS s(day)
WHERE d.email = 'dr.debabrata@demo.ayushpathi.in'
ON CONFLICT (doctor_id, day_of_week) DO UPDATE
  SET start_time=EXCLUDED.start_time, end_time=EXCLUDED.end_time,
      slot_duration=EXCLUDED.slot_duration, active=EXCLUDED.active;

-- ── Verify ────────────────────────────────────────────────────────────────────
-- SELECT d.first_name, d.last_name, da.day_of_week, da.start_time, da.end_time, da.slot_duration
-- FROM doctor_availability da JOIN doctor d ON d.id = da.doctor_id
-- ORDER BY d.last_name, da.day_of_week;
