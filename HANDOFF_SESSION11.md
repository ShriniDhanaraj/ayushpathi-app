# Ayushpathi — Session 11 Handoff

**Repo:** https://github.com/ShriniDhanaraj/ayushpathi-app  
**Live:** https://www.rasbros.com (Vercel auto-deploy)  
**PAT:** ghp_REDACTED_SEE_COWORK_PROJECT_FOLDER (valid until 31 Jul 2026)  
**Last commit:** `a431a61`

---

## What Was Fixed in Session 11

### 1. Role Routing Bug — Every Role Landed on Patient Portal
**Root cause:** All test users were created via SQL seed which never set `user_metadata.role` in Supabase Auth. So `meta.role` was `undefined` → defaulted to `'patient'` → everyone went to patient dashboard.

**Fix 1 — SQL migration** (`20260627_backfill_user_roles.sql` ✅ Applied):
```sql
UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || '{"role":"doctor"}'::jsonb
WHERE id IN (SELECT auth_user_id FROM doctor ...);
-- + hospital_admin, receptionist, patient
```

**Fix 2 — Code fallback** (`apps/web/src/app/auth/login/page.tsx`):
- When `meta.role` is missing after login, queries doctor/hospital_admin/receptionist tables in parallel
- Detects actual role and persists via `supabase.auth.updateUser({ data: { role } })`
- Future logins skip DB lookup

### 2. Missing Supabase Auth Accounts for Test Users
**Root cause:** The seed SQL only inserted rows in `doctor`, `patient`, `hospital_admin`, `receptionist` tables with hardcoded UUIDs — but never created actual auth accounts in `auth.users`. Only `doctor_01`, `doctor_02`, and the admin accounts existed.

**Fix** (`20260627_create_auth_users.sql` ✅ Applied):
- Created all 17 test users in `auth.users` with their exact seeded UUIDs
- Password: `Ayush@2026!` for all
- Roles set in `raw_user_meta_data` at creation time
- Missing users: `doctor_h01`, `doctor_h02`, `doctor_grp01`, `doctor_grp02`, all 4 receptionists, all 3 patients

### 3. Doctor Dashboard — "Upcoming (2)" Clicked → Showed 0
**Root cause:** All 3 stat cards (`Today's patients`, `Upcoming`, `Active patients`) linked to `/appointments/today`. Clicking "Upcoming" showed today's schedule (0 for Saturday).

**Fix:**
- `Upcoming` card → `/appointments/upcoming` (new page, next 30 days grouped by date)
- `Active patients` card → `/patients` (consented patients list)
- Created `apps/web/src/app/appointments/upcoming/page.tsx`

### 4. Doctor Dashboard Quick Actions → 404
**Pages built:**
- `apps/web/src/app/profile/doctor/page.tsx` — doctor's own profile (name, spec, degrees, languages, fee, hospital affiliations, availability shortcut)
- `apps/web/src/app/patients/page.tsx` — active/revoked consented patients list

### 5. Seed Appointment Dates Expired
**Root cause:** Seed used `CURRENT_DATE` at run time (~19 Jun). By 27 Jun all "upcoming" appointments were in the past. Every patient's Upcoming tab showed empty.

**Fix** (`20260627_refresh_appts_v2.sql` ✅ Applied):
- Deleted test appointments created during UI testing (with FK cascade: prescription → consultation → appointment)
- Reset all 9 seed appointments to `CURRENT_DATE` offsets relative to today
- Refreshed consultation `next_visit_date` badges

### 6. Duplicate Family Members in Health Records
**Root cause:** `patient_family` seed was run twice. Gopal Pillai (Grandparent) and Kamala Pillai (Mother) each appeared twice for Mohan Pillai.

**Fix** (included in `20260627_refresh_appts_v2.sql`):
```sql
DELETE FROM patient_family WHERE ctid NOT IN (
  SELECT MIN(ctid) FROM patient_family
  GROUP BY patient_id, relation_type, first_name, last_name
);
```

---

## All Commits This Session (Session 11)

| Commit | Description |
|---|---|
| `dac5edf` | fix: role routing — backfill user_metadata.role + code fallback detection |
| `a622537` | seed: create missing auth users in auth.users with correct UUIDs and roles |
| `360ae69` | fix: doctor dashboard stat cards link correctly |
| `47d4919` | feat: build /profile/doctor and /patients pages (404 fix) |
| `7621344` | fix: refresh seed appointment dates relative to today (2026-06-27) |
| `a431a61` | fix: appointment refresh v2 — cascade delete + deduplicate patient_family |

---

## All Migrations Applied to Supabase (cumulative, Session 11 additions)

| File | Location | Session |
|---|---|---|
| `001_initial_schema.sql` | `packages/db/migrations/` | S1 |
| `002_rls_fixes.sql` | `packages/db/migrations/` | S2 |
| `003_reenable_rls.sql` | `packages/db/migrations/` | S3 |
| `20260619_hospital_push.sql` | `supabase/migrations/` | S4 |
| `20260619_receptionist.sql` | `supabase/migrations/` | S4 |
| `20260619_prescription_audit.sql` | `supabase/migrations/` | S4 |
| `20260619_hospital_admin.sql` | `supabase/migrations/` | S4 |
| `20260619_whatsapp_numbers.sql` | `supabase/migrations/` | S4 |
| `20260619_patient_identity.sql` | `supabase/migrations/` | S5 |
| `20260619_test_results.sql` | `supabase/migrations/` | S5 |
| `20260619_patient_family.sql` | `supabase/migrations/` | S5 |
| `20260619_doctor_address.sql` | `supabase/migrations/` | S6 |
| `20260619_multilang.sql` | `supabase/migrations/` | S7 |
| `20260619_multilang_seed.sql` | `supabase/migrations/` | S7 |
| `20260619_fix_near_me.sql` | `supabase/migrations/` | S8 |
| `20260619_whatsapp_populate.sql` | `supabase/migrations/` | S8 |
| `20260619_doctor_availability_seed.sql` | `supabase/migrations/` | S8 |
| `20260626_teleconsult_url.sql` | `supabase/migrations/` | S10 ✅ |
| `20260627_enable_rls_missing_tables.sql` | `supabase/migrations/` | S10 ✅ |
| `20260627_backfill_user_roles.sql` | `supabase/migrations/` | S11 ✅ |
| `20260627_create_auth_users.sql` | `supabase/migrations/` | S11 ✅ |
| `20260627_refresh_appointment_dates.sql` | `supabase/migrations/` | S11 ⚠ SKIP — use v2 |
| `20260627_refresh_appts_v2.sql` | `supabase/migrations/` | S11 ✅ |

---

## Test Users (ALL now have auth accounts — password: `Ayush@2026!`)

| Email | Role | Name | Auth Account | Web Login Route |
|---|---|---|---|---|
| patient01@gmail.com | Patient | Ravi Kumar | ✅ Created S11 SQL | /dashboard/patient |
| patient02@gmail.com | Patient | Ananya Krishnan | ✅ Created S11 SQL | /dashboard/patient |
| patient03@gmail.com | Patient | Mohan Pillai | ✅ Created S11 SQL | /dashboard/patient |
| doctor_h01@gmail.com | Doctor AYU | Dr. Arjun Sharma | ✅ Created S11 SQL | /dashboard/doctor |
| doctor_h02@gmail.com | Doctor HOM | Dr. Priya Nair | ✅ Created S11 SQL | /dashboard/doctor |
| doctor_grp01@gmail.com | Doctor SID | Dr. Venkat Rao | ✅ Created S11 SQL | /dashboard/doctor |
| doctor_grp02@gmail.com | Doctor YOG | Dr. Meena Pillai | ✅ Created S11 SQL | /dashboard/doctor |
| doctor_01@gmail.com | Doctor UNA | Dr. Suresh Kumar | ✅ Existed | /dashboard/doctor |
| doctor_02@gmail.com | Doctor AYU | Dr. Kavitha Menon | ✅ Existed | /dashboard/doctor |
| admin_h01@gmail.com | Hospital Admin (HOSPITAL) | Rajesh Iyer → C1 | ✅ Existed | /dashboard/admin |
| admin_h02@gmail.com | Hospital Admin (HOSPITAL) | Sunita Verma → C2 | ✅ Existed | /dashboard/admin |
| admin_grp01@gmail.com | Group Admin (GROUP) | Prakash Nair → SunHealth | ✅ Existed | /dashboard/admin |
| admin_grp02@gmail.com | Group Admin (GROUP) | Deepa Menon → WestCoast | ✅ Existed | /dashboard/admin |
| recep_h01@gmail.com | Receptionist | Lakshmi Devi → C1 | ✅ Created S11 SQL | /dashboard/receptionist |
| recep_h02@gmail.com | Receptionist | Karthik Rajan → C2 | ✅ Created S11 SQL | /dashboard/receptionist |
| recep_grp01@gmail.com | Receptionist | Parvathi Srinivasan → C1 | ✅ Created S11 SQL | /dashboard/receptionist |
| recep_grp02@gmail.com | Receptionist | Murugan Pillai → C3 | ✅ Created S11 SQL | /dashboard/receptionist |

---

## Current Seed Appointment State (after v2 refresh)

| ID | Patient | Doctor | Date | Status | Bucket |
|---|---|---|---|---|---|
| f001 | Ravi Kumar | Dr. Arjun Sharma | TODAY | ARRIVED | TODAY |
| f002 | Ananya Krishnan | Dr. Arjun Sharma | TODAY | BOOKED | TODAY |
| f003 | Mohan Pillai | Dr. Priya Nair | TODAY | CONFIRMED TELECONSULT | TODAY |
| f004 | Ravi Kumar | Dr. Venkat Rao | TODAY | BOOKED (walk-in) | TODAY |
| f005 | Ananya Krishnan | Dr. Arjun Sharma | TODAY+3 | BOOKED | UPCOMING |
| f006 | Mohan Pillai | Dr. Meena Pillai | TODAY+7 | BOOKED | UPCOMING |
| f007 | Ravi Kumar | Dr. Arjun Sharma | TODAY-30 | COMPLETED | PAST |
| f008 | Ananya Krishnan | Dr. Priya Nair | TODAY-15 | COMPLETED | PAST |
| f009 | Mohan Pillai | Dr. Venkat Rao | TODAY-45 | COMPLETED | PAST |

---

## Schema Never-Forget
- Doctor: `first_name` + `last_name` (NOT `full_name`)
- Hospital: `active` (NOT `is_active`) — hospital_group/receptionist/hospital_admin use `is_active`
- Prescription FK: `consultation_id` (NOT `appointment_id`)
- Appointment type: `'F2F'` | `'TELECONSULT'`
- `entry_method`: `'DOCTOR_DIRECT'` | `'RECEPTIONIST'` | `'SCANNED'` | `'IMPORTED'`
- Platform WhatsApp: `919361287432`
- ROLE_DASHBOARD keys: `patient`, `doctor`, `receptionist`, `hospital_admin`, `ayushpathi_admin`
- Web login routes: patient→`/dashboard/patient`, doctor→`/dashboard/doctor`, admin→`/dashboard/admin`, receptionist→`/dashboard/receptionist`

---

## What's NOT Built Yet — Session 12 Priorities

1. **Receptionist dashboard web page** (`/dashboard/receptionist`) — currently 404 after login
2. **Hospital admin dashboard web page** (`/dashboard/admin`) — currently 404 after login
3. **Doctor consultation flow** — `/consultation/new` and `/consultation/[id]` pages (Write prescription quick action links here)
4. **Patient individual view** (`/patients/[id]`) — "View →" link in patients page goes here; needs consent check
5. **SMS/OTP login** — Replace email+password with Supabase phone OTP for patients
6. **Global admin web UI** — dedicated page for GLOBAL scope admins
7. **Real WhatsApp numbers** — replace dummy `9194440000xx` before go-live

## API Bugs Fixed (do not re-introduce)
- `/api/appointments/[id]/cancel` — join patient table for auth_user_id (not patient_auth_id)
- `/api/test-results` GET — ownership check required before querying
- `/api/patient-family` GET+POST — resolveAccess() helper enforces patient ownership or staff role
- `/api/doctor/prescription/verify` — uses consultation_id FK (not appointment_id)

---

## Git Workflow
```bash
cd /sessions/<session-id>/work/ && \
git clone https://github.com/ShriniDhanaraj/ayushpathi-app.git ayushpathi12
cd ayushpathi12
git config user.email "dhanaraj.srini@gmail.com"
git config user.name "Shri Raj"
# make changes, then:
git add -A && git commit -m "feat: ..." && \
git remote set-url origin https://ghp_REDACTED_SEE_COWORK_PROJECT_FOLDER@github.com/ShriniDhanaraj/ayushpathi-app.git && \
git push origin main && \
git remote set-url origin https://github.com/ShriniDhanaraj/ayushpathi-app.git
```
