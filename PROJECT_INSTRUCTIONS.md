# Ayushpathi — Project Instructions

## What We're Building
Ayushpathi: India-based AYUSH (Ayurveda, Yoga, Unani, Siddha, Homeopathy) healthcare platform.
- **Web:** Next.js 14 App Router (`apps/web/src/`)
- **Mobile:** React Native Expo SDK 54 (`apps/mobile/`)
- **DB:** Supabase (Postgres + RLS). Admin writes use service role key. Mobile reads use anon client.
- **Monorepo:** pnpm workspaces
- **Repo:** https://github.com/ShriniDhanaraj/ayushpathi-app
- **Live URL:** https://www.rasbros.com (Vercel, auto-deploys on push to main)
- **WhatsApp:** wa.me deep links only — NO third-party API

## Current State — Session 8 Starting Point
**Last commit:** `240e8a8` — multilang files written to workspace but NOT yet pushed to GitHub (first task of Session 8)  
**PAT:** ghp_REDACTED_SEE_COWORK_PROJECT_FOLDER (valid until 16 Jul 2026)  
**Supabase URL:** https://urrccvyiibqcfqfjgedp.supabase.co  
**Anon key:** eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVycmNjdnlpaWJxY2ZxZmpnZWRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3ODQ0MTUsImV4cCI6MjA5NzM2MDQxNX0.9QBFB174ZmbmpdnsR8c7pA_ZaE3Xt1bhDBNDbnlSc2s

## Schema Rules — Never Get These Wrong
- Doctor: `first_name` + `last_name` (NOT `full_name`)
- Hospital: `active` (NOT `is_active`) — hospital_group/receptionist/hospital_admin use `is_active`
- Prescription FK: `consultation_id` (NOT `appointment_id`)
- Appointment type: `'F2F'` | `'TELECONSULT'` (NOT `'IN_PERSON'`)
- Appointment: `booked_by_role` is NOT NULL
- `entry_method`: `'DOCTOR_DIRECT'` | `'RECEPTIONIST'` | `'SCANNED'` | `'IMPORTED'`
- Platform WhatsApp: `919361287432` (per-hospital WA, fallback to platform)
- Doctor `address_id` column exists (added `20260619_doctor_address.sql`)
- Language codes: always 2-letter uppercase from `lookup_language` table (EN, TA, HI, TE, KN, ML, BN, GU, MR, PA, OR, AS, UR, SA)
- Patient language fields: `known_languages TEXT[]` (≥1), `ui_language TEXT` (exactly 1), `preferred_interaction_language TEXT` (exactly 1)
- Doctor language fields: `languages_spoken TEXT[]` (consultation languages, ≥1), `ui_language TEXT` (exactly 1)
- i18n scope: registration + login pages translated (9 languages). All other UI stays English until regional roll-out.

## User Roles
- `patient` → `/(tabs)/` (mobile)
- `doctor-approved` → `/doctor-dashboard` (mobile)
- `doctor-pending` → `/pending-approval` (mobile)
- `receptionist` → `/(receptionist)/` (mobile) + `/receptionist` (web)
- `hospital-admin` → `/(hospital-admin)/` (mobile) + `/hospital-admin` (web)
- `GROUP` / `GLOBAL` admin → web only (hospital_admin table with scope CHECK constraint)

## Admin Scope (hospital_admin table)
- `HOSPITAL` scope: manages one hospital (`hospital_id` set)
- `GROUP` scope: manages all hospitals in a `hospital_group` (`hospital_group_id` set)
- `GLOBAL` scope: Ayushpathi platform owner, sees all
- Auth helper: `apps/web/src/lib/auth-context.ts` → `getHospitalAdminContext(req)`

## WhatsApp Hierarchy
Patient/Doctor → Hospital WA → Group WA → Platform WA `919361287432`
Resolution: `GET /api/support/whatsapp` (JWT-aware)

## Patient Identity / GDPR
`POST /api/receptionist/identify` → returns `record_id` + masked address  
`POST /api/receptionist/identify/confirm` → body: `{record_id, type, address_input}`

## Prescription Audit Trail
Fields: `entered_by`, `entered_by_role`, `entry_method`, `verified_by_doctor`, `verified_by_doctor_id`
Doctor-entered → `verified_by_doctor = TRUE` automatically.

## Code Conventions
- All API routes: service role Supabase client, JWT via `supabase.auth.getUser(token)`
- RLS on all tables; service role bypasses RLS for admin routes
- All key tables: `created_at`, `updated_at`, `created_by`, `updated_by`
- Mobile: relative imports (`./lib/supabase`) | Web: `@/` alias
- All SQL (migrations + seeds) committed to GitHub — never saved locally only

## All Migrations Applied to Production
| File | Location |
|---|---|
| `001_initial_schema.sql` | `packages/db/migrations/` |
| `002_rls_fixes.sql` | `packages/db/migrations/` |
| `003_reenable_rls.sql` | `packages/db/migrations/` |
| `20260619_hospital_push.sql` | `supabase/migrations/` |
| `20260619_receptionist.sql` | `supabase/migrations/` |
| `20260619_prescription_audit.sql` | `supabase/migrations/` |
| `20260619_hospital_admin.sql` | `supabase/migrations/` |
| `20260619_whatsapp_numbers.sql` | `supabase/migrations/` |
| `20260619_patient_identity.sql` | `supabase/migrations/` |
| `20260619_test_results.sql` | `supabase/migrations/` |
| `20260619_patient_family.sql` | `supabase/migrations/` |
| `20260619_doctor_address.sql` | `supabase/migrations/` |
| `20260619_multilang.sql` | `supabase/migrations/` | ✅ Session 7 |

## Seed Data Applied to Production
| File | Location | Status |
|---|---|---|
| `001_test_data.sql` | `supabase/seeds/` | ✅ Run |
| `002_prescription_audit.sql` | `supabase/seeds/` | ✅ Run |
| `20260619_multilang_seed.sql` | `supabase/migrations/` | ✅ Run Session 7 |

## Test Users (password: `Ayush@2026!`)
| Email | Role | Name |
|---|---|---|
| patient01@gmail.com | Patient | Ravi Kumar |
| patient02@gmail.com | Patient | Ananya Krishnan |
| patient03@gmail.com | Patient | Mohan Pillai |
| doctor_h01@gmail.com | Doctor AYU | Dr. Arjun Sharma → Hospital C1 |
| doctor_h02@gmail.com | Doctor HOM | Dr. Priya Nair → Hospital C2 |
| doctor_grp01@gmail.com | Doctor SID | Dr. Venkat Rao → Hospitals C1+C2 |
| doctor_grp02@gmail.com | Doctor YOG | Dr. Meena Pillai → Hospital C3 |
| doctor_01@gmail.com | Doctor UNA | Dr. Suresh Kumar (independent) |
| doctor_02@gmail.com | Doctor AYU | Dr. Kavitha Menon (independent) |
| admin_h01@gmail.com | Hospital Admin | Rajesh Iyer → HOSPITAL scope C1 |
| admin_h02@gmail.com | Hospital Admin | Sunita Verma → HOSPITAL scope C2 |
| admin_grp01@gmail.com | Group Admin | Prakash Nair → GROUP scope SunHealth |
| admin_grp02@gmail.com | Group Admin | Deepa Menon → GROUP scope WestCoast |
| recep_h01@gmail.com | Receptionist | Lakshmi Devi → Hospital C1 |
| recep_h02@gmail.com | Receptionist | Karthik Rajan → Hospital C2 |
| recep_grp01@gmail.com | Receptionist | Parvathi Srinivasan → Hospital C1 |
| recep_grp02@gmail.com | Receptionist | Murugan Pillai → Hospital C3 |

## Key Seeded UUIDs
```
hospital_group_1 = b1000000-0000-0000-0000-000000000001  SunHealth AYUSH Group
hospital_group_2 = b1000000-0000-0000-0000-000000000002  WestCoast Wellness Group
hospital_c1      = c1000000-0000-0000-0000-000000000001  Apollo Ayurveda Chennai
hospital_c2      = c1000000-0000-0000-0000-000000000002  Sri Dhanvantri Chennai
hospital_c3      = c1000000-0000-0000-0000-000000000003  Kerala Ayur Center Kochi
hospital_c4      = c1000000-0000-0000-0000-000000000004  Harmony Homeopathy Bengaluru
doctor_1         = d1000000-0000-0000-0000-000000000001  Dr. Arjun Sharma
doctor_2         = d1000000-0000-0000-0000-000000000002  Dr. Priya Nair
patient_1        = e1000000-0000-0000-0000-000000000001  Ravi Kumar
patient_2        = e1000000-0000-0000-0000-000000000002  Ananya Krishnan
patient_3        = e1000000-0000-0000-0000-000000000003  Mohan Pillai
```

## What's Built (Sessions 1–7)
✅ All 5 AYUSH roles (auth + routing)
✅ Patient registration + doctor registration + verification flow
✅ Hospital admin (HOSPITAL/GROUP/GLOBAL scope)
✅ Receptionist role + GDPR 2-step identity
✅ Book appointment (patient + receptionist)
✅ Doctor availability management
✅ Near-me doctor search (RPC with lat/lng) + language filter
✅ Consultation modal (doctor) — 2-step: form → attach results
✅ Prescription entry (receptionist) + OCR scan
✅ Prescription audit trail (entry_method, verified_by_doctor)
✅ Doctor prescription sign-off (`PATCH /api/doctor/prescription/verify`)
✅ Patient appointment cancellation
✅ WhatsApp hierarchy (`GET /api/support/whatsapp`)
✅ Test result attachment (Supabase Storage bucket `test-results`)
✅ Patient web records page (`/records`) — health profile, family, consultations, next visit
✅ Next visit prominence (mobile home card + records badge + Book Again)
✅ Patient family relationship (`patient_family` table, mobile tab, doctor view)
✅ Push notification scaffolding (device_push_token table)
✅ **Multilingual support** (Session 7) — 14 languages, patient 3-field language prefs, doctor ui_language, i18n registration+login (9 languages), doctor search language filter, 8 demo patients + 8 demo doctors with regional language profiles

## Multilingual Demo Users (Session 7 seed, password `Ayush@2026!`)
| Email | Name | UI Lang | Consult Lang |
|---|---|---|---|
| kavitha.subramanian@demo.ayushpathi.in | Kavitha Subramanian | TA | TA |
| rajesh.gowda@demo.ayushpathi.in | Rajesh Gowda | KN | KN |
| priya.nair@demo.ayushpathi.in | Priya Nair | ML | ML |
| venkata.rao@demo.ayushpathi.in | Venkata Rao | TE | TE |
| sunita.patil@demo.ayushpathi.in | Sunita Patil | MR | MR |
| arnab.chatterjee@demo.ayushpathi.in | Arnab Chatterjee | BN | BN |
| hardik.shah@demo.ayushpathi.in | Hardik Shah | GU | GU |
| ritu.sharma@demo.ayushpathi.in | Ritu Sharma (Delhi) | EN | HI |
| dr.murugan@demo.ayushpathi.in | Dr. Murugan Arumugam (AYU) | TA | speaks TA, EN |
| dr.meenakshi@demo.ayushpathi.in | Dr. Meenakshi Sundaram (SID) | TA | speaks TA, EN, HI |
| dr.arun@demo.ayushpathi.in | Dr. Arun Krishnakumar (HOM) | ML | speaks ML, EN, TA |
| dr.shivaprasad@demo.ayushpathi.in | Dr. Shivaprasad Hegde (AYU) | KN | speaks KN, EN, TE |
| dr.naseem@demo.ayushpathi.in | Dr. Naseem Qureshi (UNA) | EN | speaks UR, HI, MR, EN |
| dr.pooja@demo.ayushpathi.in | Dr. Pooja Aggarwal (YOG) | HI | speaks HI, EN, PA |
| dr.padmavathi@demo.ayushpathi.in | Dr. Padmavathi Reddy (AYU) | TE | speaks TE, HI, EN |
| dr.debabrata@demo.ayushpathi.in | Dr. Debabrata Sen (HOM) | BN | speaks BN, EN, HI |

## What's NOT Built Yet — Session 8 Priorities
1. **Commit Session 7 files to GitHub** — 11 new/updated files in workspace, not yet pushed
2. **Fix Near-Me search (0 doctors)** — run lat/lng address addendum in `ayushpathi_seed.sql`
3. **Doctor profile public page** (`/doctor/[id]`) — specialization, languages, availability, book button
4. **Web appointment booking** — currently mobile-only
5. **Hospital admin doctor verification UI** — approve/reject pending doctors (API exists, UI missing)
6. **Teleconsult join link** — video URL for TELECONSULT appointments
7. **Populate WhatsApp numbers** — hospital + hospital_group rows have NULL whatsapp_number
8. **Push notification wiring** — next-visit reminders, status change triggers
9. **SMS/OTP login** — replace email with mobile OTP
10. **OCR prescription pipeline** — image upload → parse → prefill form
11. **Mobile: install picker deps** — `npx expo install @react-native-picker/picker @react-native-async-storage/async-storage`

## API Bugs Fixed (do not re-introduce)
- `/api/appointments/[id]/cancel` — join patient table for auth_user_id (not patient_auth_id)
- `/api/test-results` GET — ownership check required before querying
- `/api/patient-family` GET+POST — resolveAccess() helper enforces patient ownership or staff role
- `/api/doctor/prescription/verify` — uses consultation_id FK (not appointment_id)

## Git Workflow
```bash
cd /tmp && git clone https://github.com/ShriniDhanaraj/ayushpathi-app.git ayushpathi7
cd ayushpathi7
git config user.email "dhanaraj.srini@gmail.com"
git config user.name "Shri Raj"
# make changes, then:
git add -A && git commit -m "feat: ..." && \
git remote set-url origin https://ghp_REDACTED_SEE_COWORK_PROJECT_FOLDER@github.com/ShriniDhanaraj/ayushpathi-app.git && \
git push origin main && \
git remote set-url origin https://github.com/ShriniDhanaraj/ayushpathi-app.git
```

## Shared Package Paths
```
packages/shared/constants/languages.ts   ← LANGUAGES[], LANGUAGE_MAP, PRIMARY_LANGUAGE_CODES
packages/shared/i18n/translations.ts     ← getTranslations(lang), t(key, lang), tStep(n, total, lang)
```
Import in web: `@ayushpathi/shared/constants/languages`  
Import in mobile: `../../packages/shared/constants/languages` (relative)
