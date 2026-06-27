# Ayushpathi — Master Handoff (Sessions 1–14)

> **For new sessions: read this file only. Individual HANDOFF_SESSION*.md files are kept as historical archive.**  
> **After each new session, update this file — do NOT create another HANDOFF_SESSION*.md.**

---

## Quick Reference

| Item | Value |
|---|---|
| **Repo** | https://github.com/ShriniDhanaraj/ayushpathi-app |
| **Live URL** | https://www.rasbros.com (Vercel, auto-deploys on push to main) |
| **Supabase URL** | https://urrccvyiibqcfqfjgedp.supabase.co |
| **Supabase Anon Key** | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVycmNjdnlpaWJxY2ZxZmpnZWRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3ODQ0MTUsImV4cCI6MjA5NzM2MDQxNX0.9QBFB174ZmbmpdnsR8c7pA_ZaE3Xt1bhDBNDbnlSc2s` |
| **PAT** | ghp_REDACTED_SEE_COWORK_PROJECT_FOLDER (valid until 31 Jul 2026) |
| **Last Commit** | `TBD` — seed: S16 doctor dashboard rich test data (005) |
| **Platform WhatsApp** | `919361287432` |
| **Default password** | `Ayush@2026!` (all test users + receptionist-registered patients) |

---

## Schema — Never Get These Wrong

- Doctor: `first_name` + `last_name` — **NOT** `full_name`
- Hospital: `active` column — **NOT** `is_active` (hospital_group / receptionist / hospital_admin use `is_active`)
- Prescription FK: `consultation_id` — **NOT** `appointment_id`
- Appointment type: `'F2F'` | `'TELECONSULT'` — **NOT** `'IN_PERSON'`
- Appointment: `booked_by_role` is NOT NULL
- `entry_method`: `'DOCTOR_DIRECT'` | `'RECEPTIONIST'` | `'SCANNED'` | `'IMPORTED'`
- Patient language fields: `known_languages TEXT[]` (≥1), `ui_language TEXT` (exactly 1), `preferred_interaction_language TEXT` (exactly 1)
- Doctor language fields: `languages_spoken TEXT[]` (≥1), `ui_language TEXT` (exactly 1)
- Language codes: always 2-letter uppercase from `lookup_language` table: EN TA HI TE KN ML BN GU MR PA OR AS UR SA
- `patient_doctor_consent` status: `'ACTIVE'` | `'REVOKED'`

---

## User Roles & Routing

| Role | Mobile Route | Web Route |
|---|---|---|
| `patient` | `/(tabs)/` | `/dashboard/patient` |
| `doctor` (approved) | `/doctor-dashboard` | `/dashboard/doctor` |
| `doctor` (pending) | `/pending-approval` | — |
| `receptionist` | `/(receptionist)/` | `/dashboard/receptionist` |
| `hospital_admin` (HOSPITAL/GROUP) | `/(hospital-admin)/` | `/dashboard/admin` |
| `GLOBAL` admin | web only | `/dashboard/admin` |

**Role detection order in `apps/mobile/app/_layout.tsx`:**  
`hospital_admin` table → `receptionist` table → `doctor` table → `patient` table → metadata fallback

**Admin scopes (`hospital_admin.scope`):**
- `HOSPITAL` → `hospital_id` set, manages one hospital
- `GROUP` → `hospital_group_id` set, manages all hospitals in group
- `GLOBAL` → platform owner, sees all. Auth helper: `apps/web/src/lib/auth-context.ts` → `getHospitalAdminContext(req)` returns `accessible_hospital_ids[]`

---

## Code Conventions

- All API routes: service role Supabase client (`getSupabaseAdmin()`), JWT via `supabase.auth.getUser(token)`
- RLS on all tables; service role bypasses RLS for admin routes
- All key tables have: `created_at`, `updated_at`, `created_by`, `updated_by`
- Mobile: relative imports (`./lib/supabase`) | Web: `@/` alias
- All SQL (migrations + seeds) committed to GitHub — never saved locally only
- New test users must have `raw_user_meta_data.role` set in `auth.users` at creation time
- Never re-run old seeds without `ON CONFLICT DO NOTHING`

---

## Test Users (all password: `Ayush@2026!`)

| Email | Role | Name | Notes |
|---|---|---|---|
| patient01@gmail.com | Patient | Ravi Kumar | 1 ACTIVE (Dr. Priya Nair, full history) + 2 REVOKED doctors |
| patient02@gmail.com | Patient | Ananya Krishnan | 1 ACTIVE (Dr. Meena Pillai, full history) + 1 REVOKED |
| patient03@gmail.com | Patient | Mohan Pillai | 2 ACTIVE: Dr. Venkat Rao (full hist) + Dr. Suresh Kumar (partial) |
| doctor_h01@gmail.com | Doctor AYU | Dr. Arjun Sharma | Hospital C1. Ravi Kumar consent REVOKED |
| doctor_h02@gmail.com | Doctor HOM | Dr. Priya Nair | Hospital C2. Ravi Kumar ACTIVE + full history |
| doctor_grp01@gmail.com | Doctor SID | Dr. Venkat Rao | Hospitals C1+C2. Ananya REVOKED, Mohan ACTIVE |
| doctor_grp02@gmail.com | Doctor YOG | Dr. Meena Pillai | Hospital C3. Ananya ACTIVE + full history |
| doctor_01@gmail.com | Doctor UNA | Dr. Suresh Kumar | Independent. Mohan ACTIVE (partial history) |
| doctor_02@gmail.com | Doctor AYU | Dr. Kavitha Menon | Independent |
| admin_h01@gmail.com | Hospital Admin | Rajesh Iyer | HOSPITAL scope → C1 |
| admin_h02@gmail.com | Hospital Admin | Sunita Verma | HOSPITAL scope → C2 |
| admin_grp01@gmail.com | Group Admin | Prakash Nair | GROUP scope → SunHealth |
| admin_grp02@gmail.com | Group Admin | Deepa Menon | GROUP scope → WestCoast |
| recep_h01@gmail.com | Receptionist | Lakshmi Devi | Hospital C1 |
| recep_h02@gmail.com | Receptionist | Karthik Rajan | Hospital C2 |
| recep_grp01@gmail.com | Receptionist | Parvathi Srinivasan | Hospital C1 |
| recep_grp02@gmail.com | Receptionist | Murugan Pillai | Hospital C3 |

**Multilingual demo users** (seed `20260619_multilang_seed.sql`, same password):  
`kavitha.subramanian@demo.ayushpathi.in` (TA), `rajesh.gowda@demo.ayushpathi.in` (KN), `priya.nair@demo.ayushpathi.in` (ML), `venkata.rao@demo.ayushpathi.in` (TE), `sunita.patil@demo.ayushpathi.in` (MR), `arnab.chatterjee@demo.ayushpathi.in` (BN), `hardik.shah@demo.ayushpathi.in` (GU), `ritu.sharma@demo.ayushpathi.in` (EN/HI)  
Multilingual doctors: `dr.murugan`, `dr.meenakshi`, `dr.arun`, `dr.shivaprasad`, `dr.naseem`, `dr.pooja`, `dr.padmavathi`, `dr.debabrata` @ `demo.ayushpathi.in`

---

## Key Seeded UUIDs

```
hospital_group_1 = b1000000-0000-0000-0000-000000000001  SunHealth AYUSH Group
hospital_group_2 = b1000000-0000-0000-0000-000000000002  WestCoast Wellness Group
hospital_c1      = c1000000-0000-0000-0000-000000000001  Apollo Ayurveda Chennai
hospital_c2      = c1000000-0000-0000-0000-000000000002  Sri Dhanvantri Chennai
hospital_c3      = c1000000-0000-0000-0000-000000000003  Kerala Ayur Center Kochi
hospital_c4      = c1000000-0000-0000-0000-000000000004  Harmony Homeopathy Bengaluru
doctor_1         = d1000000-0000-0000-0000-000000000001  Dr. Arjun Sharma (AYU)
doctor_2         = d1000000-0000-0000-0000-000000000002  Dr. Priya Nair (HOM)
doctor_3         = d1000000-0000-0000-0000-000000000003  Dr. Venkat Rao (SID)
doctor_4         = d1000000-0000-0000-0000-000000000004  Dr. Meena Pillai (YOG)
doctor_5         = d1000000-0000-0000-0000-000000000005  Dr. Suresh Kumar (UNA)
doctor_6         = d1000000-0000-0000-0000-000000000006  Dr. Kavitha Menon (AYU)
patient_1        = e1000000-0000-0000-0000-000000000001  Ravi Kumar
patient_2        = e1000000-0000-0000-0000-000000000002  Ananya Krishnan
patient_3        = e1000000-0000-0000-0000-000000000003  Mohan Pillai
```

---

## All Migrations Applied to Production (cumulative)

| File | Location | Session |
|---|---|---|
| `001_initial_schema.sql` | `packages/db/migrations/` | S1 |
| `002_rls_fixes.sql` | `packages/db/migrations/` | S2 |
| `003_reenable_rls.sql` | `packages/db/migrations/` | S3 |
| `20260619_hospital_push.sql` | `supabase/migrations/` | S3 |
| `20260619_receptionist.sql` | `supabase/migrations/` | S3 |
| `20260619_prescription_audit.sql` | `supabase/migrations/` | S3 |
| `20260619_hospital_admin.sql` | `supabase/migrations/` | S3 |
| `20260619_whatsapp_numbers.sql` | `supabase/migrations/` | S3 |
| `20260619_patient_identity.sql` | `supabase/migrations/` | S3 |
| `20260619_test_results.sql` | `supabase/migrations/` | S6 |
| `20260619_patient_family.sql` | `supabase/migrations/` | S6 |
| `20260619_doctor_address.sql` | `supabase/migrations/` | S6 |
| `20260619_multilang.sql` | `supabase/migrations/` | S7 |
| `20260619_multilang_seed.sql` | `supabase/migrations/` | S7 |
| `20260619_fix_near_me.sql` | `supabase/migrations/` | S8 |
| `20260619_whatsapp_populate.sql` | `supabase/migrations/` | S8 |
| `20260619_doctor_availability_seed.sql` | `supabase/migrations/` | S8 |
| `20260626_teleconsult_url.sql` | `supabase/migrations/` | S10 |
| `20260627_enable_rls_missing_tables.sql` | `supabase/migrations/` | S10 |
| `20260627_backfill_user_roles.sql` | `supabase/migrations/` | S11 |
| `20260627_create_auth_users.sql` | `supabase/migrations/` | S11 |
| `20260627_refresh_appts_v2.sql` | `supabase/migrations/` | S11 |
| `20260627_consent_rls.sql` | `supabase/migrations/` | S14 — RLS policies on patient_doctor_consent |

## All Seeds Applied to Production

| File | Location | Session |
|---|---|---|
| `001_test_data.sql` | `supabase/seeds/` | S1 |
| `002_prescription_audit.sql` | `supabase/seeds/` | S6 |
| `20260619_multilang_seed.sql` | `supabase/migrations/` | S7 |
| `003_rich_patient_history.sql` | `supabase/seeds/` | S14 — Ravi/Ananya/Mohan rich consent + Rx history |
| `004_mydoctors_test_scenarios.sql` | `supabase/seeds/` | S14 — Mohan 2nd ACTIVE doctor (partial history) |

---

## What's Built — Session by Session

### Sessions 1–3: Foundation
- All 5 AYUSH roles (auth + routing + RLS)
- Patient and doctor registration flows
- Hospital admin (HOSPITAL/GROUP/GLOBAL scope) + `getHospitalAdminContext()`
- Receptionist role + GDPR 2-step identity (`POST /api/receptionist/identify` + `/confirm`)
- WhatsApp hierarchy (per-hospital WA, fallback to platform `919361287432`) + `GET /api/support/whatsapp`
- Book appointment (patient + receptionist), doctor availability management
- All API routes: `/api/receptionist/appointments`, `/api/receptionist/book`, `/api/receptionist/prescription`, `/api/hospital-admin/doctors`, `/api/hospital-admin/receptionists`

### Sessions 4–5: Prescription + Consultation
- Doctor ConsultationModal (notes, diagnosis, inline)
- Receptionist OCR prescription scan (`POST /api/receptionist/prescription/scan` — Google Vision API, multi-language, Indian shorthand OD/BD/TDS)
- Doctor prescription sign-off (`PATCH /api/doctor/prescription/verify`)
- Patient appointment cancellation
- Push notifications on status changes (ARRIVED→doctor, COMPLETED→patient, CANCELLED→both)
- GROUP/GLOBAL admin dashboard (`/admin`)

### Session 6: Records, Family, Test Results
- `test_result` table + Supabase Storage bucket `test-results`
- `POST /api/test-results/upload`, `GET /api/test-results`
- Patient web records page `/records` (health profile, family, consultations, test result links, next visit banner)
- Next visit prominence: mobile home card (red=overdue, orange=≤7d), "Book Again" shortcut
- `patient_family` table + mobile Family tab + doctor consultation family panel
- **API bugs fixed:** cancel auth_user_id, test-results ownership, patient-family resolveAccess(), prescription verify consultation_id FK

### Session 7: Multilingual
- `lookup_language` table (14 languages), `known_languages[]`, `ui_language`, `preferred_interaction_language` on patient; `ui_language` on doctor
- Registration + login pages translated into 9 languages (EN/HI/TA/TE/KN/ML/BN/GU/MR)
- Doctor search language filter
- 8 multilingual demo patients + 8 multilingual demo doctors seeded

### Session 8: Near-Me, Doctor Profile, Admin Tools, Password Reset
- Near-me search fixed (RPC params, column names, lat/lng seeded for all 14 doctors)
- Doctor public profile page `/doctors/[id]`
- Web appointment booking with doctor pre-select (`?doctor=[id]`)
- Hospital admin doctor verification UI (approve/reject with reason)
- WhatsApp dummy numbers populated in DB
- Doctor availability seeded for all 14 doctors
- Nominatim address/pincode fallback for near-me
- Forgot / reset password flow (`/auth/forgot-password`, `/auth/reset-password`)
- CI fix: `useSearchParams` in `<Suspense>`

### Sessions 9–10: Teleconsult, Patient Dashboard, Doctor Browse, Push
- Patient dashboard `/dashboard/patient` — upcoming/past appointments, cancel, Book Again, teleconsult join banner
- Doctor browse page `/doctors/browse` — name/spec/language/city filters
- Teleconsult join link: `POST /api/appointments/teleconsult` → Jitsi Meet URL auto-generated
- Doctor dashboard: upcoming video consultations card
- Push notification wiring: token registered on login, Vercel Cron daily reminder at 18:00 IST
- `20260627_enable_rls_missing_tables.sql` applied

### Session 11: Role Routing Bug Fixes + Seed Refresh
- Role routing bug fixed: all SQL-seeded users lacked `raw_user_meta_data.role` → everyone routed to patient dashboard
- Applied `20260627_backfill_user_roles.sql` + code fallback detection in login page
- Created 17 missing auth accounts (`20260627_create_auth_users.sql`)
- Doctor dashboard stat cards fixed (Upcoming → `/appointments/upcoming`, Active patients → `/patients`)
- Built `/appointments/upcoming` and `/profile/doctor` and `/patients` pages
- Refreshed all seed appointment dates to `CURRENT_DATE` offsets (`20260627_refresh_appts_v2.sql`)
- Deduplicated `patient_family` rows

### Session 12: Dashboards + Doctor Views
- Receptionist dashboard `/dashboard/receptionist` — fully rewritten as server component. Live appointments + GDPR lookup (`GdprLookup.tsx` client component embedded)
- Hospital admin dashboard `/dashboard/admin` — rewritten as server component using `getSupabaseAdmin()`. All 3 scopes work. Pending doctor list with review links
- Doctor consultation flow `/consultation/new` — today's appointments picker (waiting vs in-progress)
- Patient individual view `/patients/[id]` — consent-gated, left panel (basic info + health profile), right panel (consultation history + inline Rx). Respects `share_full_history` flag

### Session 13: Receptionist Tools + Hospital Info
- `/receptionist/prescriptions/new` — today's appointment picker → links to existing prescription form
- `POST /api/receptionist/register-patient` — creates auth user + patient in one call (temp password `Ayush@2026!`)
- `/patients/new` — full patient registration form (personal + minor detection + address + language prefs). Shows temp password on success
- `/results/upload` — file upload form (JPG/PNG/PDF/HEIC, max 50MB) linking to today's appointments
- `/hospital-admin/info` — scoped hospital info cards (HOSPITAL/GROUP/GLOBAL)

### Session 14: Mobile Nav Fix + WhatsApp OTP Research + My Doctors RLS
- **Mobile profile.tsx fix:** "Prescriptions & Consultations" and "My Doctors" Quick Access buttons now navigate correctly (`/(tabs)/records` and `/(tabs)/doctors`)
- **RLS fix (`20260627_consent_rls.sql`):** `patient_doctor_consent` had RLS enabled but no policies — patient queries returned empty, revoke/re-grant updates silently failed. Added 4 policies: patient SELECT + UPDATE own rows, doctor SELECT own rows, staff SELECT
- **Seeds applied:** `003_rich_patient_history.sql` (Ravi/Ananya/Mohan rich consent history) + `004_mydoctors_test_scenarios.sql` (Mohan 2nd ACTIVE doctor with partial history)
- **WhatsApp OTP research** (`docs/whatsapp-otp-research.md`): recommends MSG91 + Supabase Send SMS Hook. ₹0.20/OTP, ~₹2,500/month for 10k OTPs. Architecture documented. Decisions needed before build (see below)

### Session 15: WhatsApp OTP Login + Receptionist GDPR Booking + Admin Appointments (commits `296d316`, `ee24fc3`)
- **NEW `GET /api/receptionist/hospital-doctors`** — returns APPROVED doctors from `hospital_doctor` junction for the calling receptionist's hospital; requires Bearer token
- **REWRITE `/receptionist/book`** — full 5-step wizard: (1) GDPR patient search via `/api/receptionist/identify` with Bearer token, (2) address confirmation via `/api/receptionist/identify/confirm`, (3) hospital-scoped doctor selection, (4) date + availability slot picker (same slot generator as patient booking), (5) walk-in flag + notes + type → `POST /api/receptionist/appointments` with `booked_by_role='RECEPTIONIST'` and `hospital_id`
- **NEW `/hospital-admin/appointments`** — server component admin appointments view; all 3 scopes work: HOSPITAL sees own hospital, GROUP sees all group hospitals, GLOBAL sees all. Includes date picker, status count pills, hospital column for GROUP/GLOBAL, walk-in + teleconsult badges, booked-by-receptionist tag
- **FIX `/dashboard/admin`** quick link: "Today's appointments" now → `/hospital-admin/appointments` (was incorrectly linking to doctor-scoped `/appointments/today`)
- **FIX `/dashboard/receptionist`** quick link: "Book appointment" now → `/receptionist/book` (GDPR flow)
- **NEW `supabase/functions/send-otp-whatsapp/index.ts`** — Supabase Auth "Send SMS" hook; looks up `patient.ui_language` by `user_id`, sends per-language OTP via MSG91 WhatsApp from `919361287432`; 9 language message bodies (EN/HI/TA/TE/KN/ML/BN/GU/MR); email fallback via Resend if WA fails + patient has email; always returns `{}` so Supabase never blocks auth on delivery failure
- **REWRITE `apps/mobile/app/(auth)/login.tsx`** — two modes: Patient mode (default, phone+OTP via `signInWithOtp`/`verifyOtp`), Staff mode (toggle, email+password for doctors/receptionists/admins); 60-second resend timer; Change number escape hatch; UI strings in all 9 languages; language preference persisted to AsyncStorage on success
- **NEW `supabase/migrations/20260627_otp_phone_auth.sql`** — activation checklist: enable Phone Auth, deploy function, register hook, set MSG91/Resend secrets, Meta template approval steps; 9 template secret names `MSG91_WA_TEMPLATE_ID_EN`..`_MR`
- **Decisions:** WA number = `919361287432`, Fallback = email (if shared), Language = per `ui_language`

---

## Patient Consent (My Doctors) — Current State

The `patient_doctor_consent` table is fully functional after S14 RLS fix.

**Screen:** `apps/mobile/app/(tabs)/doctors.tsx` — "My Doctors" tab + "Find Near Me" tab

| Patient | ACTIVE doctors | REVOKED doctors |
|---|---|---|
| Ravi Kumar | Dr. Priya Nair (HOM, full history) | Dr. Arjun Sharma (AYU) + Dr. Meena Pillai (YOG) |
| Ananya Krishnan | Dr. Meena Pillai (YOG, full history) | Dr. Venkat Rao (SID) |
| Mohan Pillai | Dr. Venkat Rao (SID, full history) + Dr. Suresh Kumar (UNA, partial) | — |

Patient can Revoke (with confirmation dialog) and Re-grant (direct, no dialog). Revoke/re-grant are instant — card moves section, tab count updates.  
SQL reset script: see `docs/mydoctors-test-scenarios.md` → "Quick SQL to Reset Test Data"

---

## WhatsApp Architecture

- `wa.me` deep links only in UI (no third-party API for messaging)
- Hierarchy: Patient/Doctor → Hospital WA → Group WA → Platform WA `919361287432`
- Resolution: `GET /api/support/whatsapp` (JWT-aware)
- Dummy numbers in DB: `9194440000xx` — **replace with real numbers before go-live**

---

## WhatsApp OTP Login — Research Complete, Build Pending

Full analysis: `docs/whatsapp-otp-research.md`

**Recommendation:** MSG91 + Supabase Send SMS Hook  
**Flow:** `signInWithOtp({ phone })` → Supabase generates OTP → Send SMS Hook → Edge Function `send-otp-whatsapp` → MSG91 WhatsApp API → patient gets WA message → enters OTP → `verifyOtp()` → session  
**Cost:** ₹0.20/OTP, ~₹2,500/month for 10k OTPs  
**Estimated build time:** 1.5 days

**Three decisions needed before build:**
1. Which WhatsApp number? Platform `919361287432` or dedicated auth number?
2. SMS fallback on WhatsApp failure — yes or no?
3. OTP message language — English only or multi-language per `ui_language`?

---

### Session 16: Doctor Dashboard Rich Test Data (seed 005)
- **NEW `supabase/seeds/005_doctor_rich_history.sql`** — fixes "0 records" for both doctor accounts. Adds:
  - 4 new `patient_doctor_consent` rows: Ananya Krishnan + Mohan Pillai → Dr. Priya Nair (ACTIVE); Ananya Krishnan + Mohan Pillai → Dr. Arjun Sharma (ACTIVE). Previously only Ravi Kumar had ACTIVE consent with Dr. Priya; Dr. Arjun had zero active patients.
  - 17 new appointments: 3 today (Dr. Priya) + 4 today (Dr. Arjun, incl. existing) + upcoming for both + COMPLETED history + 1 CANCELLED + 1 NO_SHOW
  - 8 consultations (for all COMPLETED past appointments) with realistic AYUSH clinical notes
  - 8 prescriptions (mix DOCTOR_DIRECT + RECEPTIONIST entry, all verified) — HOM medicines for Dr. Priya (Calc Fluor, Rhus Tox, Natrum Mur, Arsenicum Album, Ledum Pal), AYU medicines for Dr. Arjun (Vasa Avaleha, Maharasnadi Kwath, Shallaki, Sitopaladi Churna)
- **Test cases: "Doctor Dashboard — S16"** (DD-01..12) — login, today's queue, upcoming, active patients, consultation history, prescription detail, CANCELLED/NO_SHOW display, stat cards

---

## What's NOT Built Yet — Session 16 Priorities

1. **Activate WhatsApp OTP** (Shri Raj action required) — code is built; need: (a) MSG91 account + `919361287432` registered as WA Business number, (b) 9 Meta-approved OTP templates, (c) set secrets in Supabase, (d) enable Phone Auth + register Send SMS hook, (e) deploy edge function. Full checklist in `supabase/migrations/20260627_otp_phone_auth.sql`.

2. **Global admin web UI** — GLOBAL scope needs platform-wide management (hospitals, groups, global admins)

3. **Real WhatsApp numbers** — replace dummy `9194440000xx` before go-live

---

## Test Artifacts

| File | Purpose |
|---|---|
| `Ayushpathi_Test_Cases.xlsx` | Master test tracker (Login Table, API Tests, Browser Tests, Mobile Tests, Scenario Tests, My Doctors Scenarios, Prescription Audit) |
| `docs/whatsapp-otp-research.md` | WhatsApp OTP feasibility analysis + architecture + cost |
| `docs/mydoctors-test-scenarios.md` | My Doctors screen detailed test matrix + SQL reset script |
| `supabase/seeds/003_rich_patient_history.sql` | Rich consent + Rx history for Ravi/Ananya/Mohan |
| `supabase/seeds/004_mydoctors_test_scenarios.sql` | Edge-case consents for My Doctors testing |
| `supabase/seeds/005_doctor_rich_history.sql` | Rich test data for doctor_h01 + doctor_h02 — fixes "0 records" on all doctor dashboard buttons |

---

## API Bugs Fixed — Do Not Re-introduce

- `/api/appointments/[id]/cancel` — join `patient` table for `auth_user_id` (not `patient_auth_id`)
- `/api/test-results` GET — ownership check required before querying
- `/api/patient-family` GET+POST — `resolveAccess()` helper enforces patient ownership or staff role
- `/api/doctor/prescription/verify` — uses `consultation_id` FK (not `appointment_id`)
- `/dashboard/admin` — must be server component using `getSupabaseAdmin()`, not anon client (RLS blocks)

---

## Git Workflow

```bash
cd /sessions/<session-id>/work/ && \
git clone https://github.com/ShriniDhanaraj/ayushpathi-app.git ayushpathi15
cd ayushpathi15
git config user.email "dhanaraj.srini@gmail.com"
git config user.name "Shri Raj"

# make changes, then:
git add -A && git commit -m "feat: ..." && \
git remote set-url origin https://ghp_REDACTED_SEE_COWORK_PROJECT_FOLDER@github.com/ShriniDhanaraj/ayushpathi-app.git && \
git push origin main && \
git remote set-url origin https://github.com/ShriniDhanaraj/ayushpathi-app.git
```

**⚠️ NEVER commit the real PAT to any markdown file.** Always use `ghp_REDACTED_SEE_COWORK_PROJECT_FOLDER`. Real PAT is in older HANDOFF_SESSION files in the Cowork project folder. GitHub push protection will block any commit containing the real token.

---

## Environment Variables (Vercel + `apps/web/.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=https://urrccvyiibqcfqfjgedp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key above>
SUPABASE_SERVICE_ROLE_KEY=<service role key — in Vercel, never in repo>
NEXT_PUBLIC_SITE_URL=https://www.rasbros.com
GOOGLE_CLOUD_VISION_API_KEY=<for OCR prescription scan>
CRON_SECRET=<any strong random string — for push notification cron auth>
```

---

## Shared Package Paths

```
packages/shared/constants/languages.ts   ← LANGUAGES[], LANGUAGE_MAP, PRIMARY_LANGUAGE_CODES
packages/shared/i18n/translations.ts     ← getTranslations(lang), t(key, lang), tStep(n, total, lang)
```

Import in web: `@ayushpathi/shared/constants/languages`  
Import in mobile: `../../packages/shared/constants/languages` (relative)
