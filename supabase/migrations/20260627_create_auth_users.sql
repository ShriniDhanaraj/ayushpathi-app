-- ============================================================
-- Create all test auth users in auth.users
-- Seed SQL only inserted rows in doctor/patient/etc tables
-- but never created the corresponding Supabase Auth accounts.
-- Password for ALL users: Ayush@2026!
-- Safe to run multiple times (ON CONFLICT DO NOTHING)
-- ============================================================

-- Patients
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_user_meta_data, raw_app_meta_data,
  created_at, updated_at
) VALUES
  (
    'd9cbe42b-2170-4e8d-ae80-822dd371aa69',
    '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'patient01@gmail.com', crypt('Ayush@2026!', gen_salt('bf')),
    now(), '{"role":"patient"}', '{"provider":"email","providers":["email"]}',
    now(), now()
  ),
  (
    'f87e6956-a7a7-44bd-a5ce-7d4a5ae787f3',
    '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'patient02@gmail.com', crypt('Ayush@2026!', gen_salt('bf')),
    now(), '{"role":"patient"}', '{"provider":"email","providers":["email"]}',
    now(), now()
  ),
  (
    '2768e970-73d6-4bde-851b-663f4da9aac3',
    '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'patient03@gmail.com', crypt('Ayush@2026!', gen_salt('bf')),
    now(), '{"role":"patient"}', '{"provider":"email","providers":["email"]}',
    now(), now()
  )
ON CONFLICT (id) DO NOTHING;

-- Doctors (h01, h02, grp01, grp02 — likely missing; 01+02 already exist)
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_user_meta_data, raw_app_meta_data,
  created_at, updated_at
) VALUES
  (
    'aff25416-f9fe-4c1b-9fdc-ce0d31c078fc',
    '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'doctor_h01@gmail.com', crypt('Ayush@2026!', gen_salt('bf')),
    now(), '{"role":"doctor"}', '{"provider":"email","providers":["email"]}',
    now(), now()
  ),
  (
    '7fe14587-5185-484f-89cf-8a1000a8282b',
    '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'doctor_h02@gmail.com', crypt('Ayush@2026!', gen_salt('bf')),
    now(), '{"role":"doctor"}', '{"provider":"email","providers":["email"]}',
    now(), now()
  ),
  (
    '0b13effe-67af-4710-bdc7-77762ab4ba9d',
    '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'doctor_grp01@gmail.com', crypt('Ayush@2026!', gen_salt('bf')),
    now(), '{"role":"doctor"}', '{"provider":"email","providers":["email"]}',
    now(), now()
  ),
  (
    '46b3a587-eb27-4904-8cca-6ae0c8fbd3ca',
    '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'doctor_grp02@gmail.com', crypt('Ayush@2026!', gen_salt('bf')),
    now(), '{"role":"doctor"}', '{"provider":"email","providers":["email"]}',
    now(), now()
  ),
  (
    '59534387-2830-40e9-b599-a6df527d4926',
    '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'doctor_01@gmail.com', crypt('Ayush@2026!', gen_salt('bf')),
    now(), '{"role":"doctor"}', '{"provider":"email","providers":["email"]}',
    now(), now()
  ),
  (
    'c5a1b4aa-2307-47cf-9fcd-a4e10f972435',
    '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'doctor_02@gmail.com', crypt('Ayush@2026!', gen_salt('bf')),
    now(), '{"role":"doctor"}', '{"provider":"email","providers":["email"]}',
    now(), now()
  )
ON CONFLICT (id) DO NOTHING;

-- Hospital Admins
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_user_meta_data, raw_app_meta_data,
  created_at, updated_at
) VALUES
  (
    '56339dd1-6b67-40f0-8b62-44bc83ece7bd',
    '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'admin_h01@gmail.com', crypt('Ayush@2026!', gen_salt('bf')),
    now(), '{"role":"hospital_admin"}', '{"provider":"email","providers":["email"]}',
    now(), now()
  ),
  (
    '6285a10f-8116-45d5-b35e-75bfa8bf7c50',
    '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'admin_h02@gmail.com', crypt('Ayush@2026!', gen_salt('bf')),
    now(), '{"role":"hospital_admin"}', '{"provider":"email","providers":["email"]}',
    now(), now()
  ),
  (
    '9c7caad7-3e97-4523-8fd5-443621e02e3d',
    '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'admin_grp01@gmail.com', crypt('Ayush@2026!', gen_salt('bf')),
    now(), '{"role":"hospital_admin"}', '{"provider":"email","providers":["email"]}',
    now(), now()
  ),
  (
    'b6a2dab2-5fc4-41df-87b3-58380c0d7f1e',
    '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'admin_grp02@gmail.com', crypt('Ayush@2026!', gen_salt('bf')),
    now(), '{"role":"hospital_admin"}', '{"provider":"email","providers":["email"]}',
    now(), now()
  )
ON CONFLICT (id) DO NOTHING;

-- Receptionists
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_user_meta_data, raw_app_meta_data,
  created_at, updated_at
) VALUES
  (
    '4d375329-1c14-41ca-88ca-d8b1a0e84865',
    '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'recep_h01@gmail.com', crypt('Ayush@2026!', gen_salt('bf')),
    now(), '{"role":"receptionist"}', '{"provider":"email","providers":["email"]}',
    now(), now()
  ),
  (
    '6e595fd1-db2e-4252-989d-8712d2c5de89',
    '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'recep_h02@gmail.com', crypt('Ayush@2026!', gen_salt('bf')),
    now(), '{"role":"receptionist"}', '{"provider":"email","providers":["email"]}',
    now(), now()
  ),
  (
    '73835b7f-e1ef-4f91-b41b-2614aaa6c9b6',
    '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'recep_grp01@gmail.com', crypt('Ayush@2026!', gen_salt('bf')),
    now(), '{"role":"receptionist"}', '{"provider":"email","providers":["email"]}',
    now(), now()
  ),
  (
    '8c2378e6-08c8-49b0-9be6-3b9f6f031e95',
    '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'recep_grp02@gmail.com', crypt('Ayush@2026!', gen_salt('bf')),
    now(), '{"role":"receptionist"}', '{"provider":"email","providers":["email"]}',
    now(), now()
  )
ON CONFLICT (id) DO NOTHING;

-- Verify: show all test users and their roles
SELECT email, raw_user_meta_data->>'role' AS role
FROM auth.users
WHERE email LIKE '%@gmail.com'
   OR email LIKE '%ayushpathi.in'
ORDER BY role, email;
