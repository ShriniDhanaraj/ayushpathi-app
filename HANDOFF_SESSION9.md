# Ayushpathi — Session 9 Handoff

**Repo:** https://github.com/ShriniDhanaraj/ayushpathi-app  
**Vercel:** https://www.rasbros.com (auto-deploys on push to main)  
**PAT:** ghp_REDACTED_SEE_COWORK_PROJECT_FOLDER (valid until 16 Jul 2026)

---

## What Was Completed in Session 8

### 1. Near-Me Search Fixed
- Migration: `supabase/migrations/20260619_fix_near_me.sql` ✅ Run
- Corrected RPC param names (`p_lat`, `p_lng`, `p_radius_km`)
- Fixed wrong column refs (`full_name` → `first_name`/`last_name`, `specialization` → `ayush_specialization`, `phone` → `mobile`)
- Seeded lat/lng coordinates for all 14 demo doctors

### 2. Doctor Public Profile Page
- `apps/web/src/app/doctors/[id]/page.tsx` — specialization, languages, availability, hospitals, Book button
- `apps/web/src/app/api/doctors/[id]/route.ts` — public GET, APPROVED doctors only

### 3. Web Appointment Booking — Doctor Pre-Select
- `apps/web/src/app/appointments/new/page.tsx` — `?doctor=[id]` param skips to slot picker
- "All AYUSH" tile added; specialization shown on doctor cards in Step 2
- Wrapped `useSearchParams` in `<Suspense>` to fix Next.js 14 build error (commit `d646a88`)

### 4. Hospital Admin Doctor Verification UI
- `apps/web/src/app/hospital-admin/doctors/page.tsx` — "Pending Verification" section with approve/reject
- `apps/web/src/app/api/hospital-admin/doctors/[id]/verify/route.ts` — PATCH APPROVE/REJECT
- `apps/web/src/app/api/hospital-admin/doctors/route.ts` — `?status=PENDING` filter

### 5. WhatsApp Numbers SQL
- Migration: `supabase/migrations/20260619_whatsapp_populate.sql` ✅ Run
- Dummy numbers for 4 hospitals + 2 groups (replace with real numbers before go-live)

### 6. Doctor Availability Seed
- Migration: `supabase/migrations/20260619_doctor_availability_seed.sql` ✅ Run
- Weekly availability seeded for all 14 demo doctors

### 7. Near-Me — Address/Pincode Fallback
- `apps/web/src/app/doctors/near-me/page.tsx` — dual entry: GPS or manual address/pincode
- Nominatim geocoding: `https://nominatim.openstreetmap.org/search?q={query},India&format=json&limit=1&countrycodes=in`

### 8. Forgot / Reset Password Flow
- `apps/web/src/app/auth/login/page.tsx` — "Forgot password?" link added
- `apps/web/src/app/auth/forgot-password/page.tsx` — email entry → Supabase reset email
- `apps/web/src/app/auth/reset-password/page.tsx` — PASSWORD_RECOVERY event → set new password
- Supabase Redirect URL `https://www.rasbros.com/auth/reset-password` ✅ Added in dashboard

---

## All Commits This Session (Session 8)
| Commit | Description |
|---|---|
| `98a3171` | fix: near-me search — correct RPC params, column refs, lat/lng seed |
| `38ae925` | feat: doctor profile page, web booking, hospital admin verify UI, WhatsApp SQL |
| `e012f2b` | fix: near-me address fallback + All AYUSH tile + spec labels |
| `469ccda` | fix: doctor availability seed — explicit ::TIME casts |
| `7e659db` | seed: doctor weekly availability for all 14 demo doctors |
| `49ef48d` | feat: forgot/reset password flow |
| `d646a88` | fix: wrap useSearchParams in Suspense — resolves build failure ✅ |

---

## All Migrations Applied to Supabase (cumulative)
| File | Location | Status |
|---|---|---|
| `001_initial_schema.sql` | `packages/db/migrations/` | ✅ |
| `002_rls_fixes.sql` | `packages/db/migrations/` | ✅ |
| `003_reenable_rls.sql` | `packages/db/migrations/` | ✅ |
| `20260619_hospital_push.sql` | `supabase/migrations/` | ✅ |
| `20260619_receptionist.sql` | `supabase/migrations/` | ✅ |
| `20260619_prescription_audit.sql` | `supabase/migrations/` | ✅ |
| `20260619_hospital_admin.sql` | `supabase/migrations/` | ✅ |
| `20260619_whatsapp_numbers.sql` | `supabase/migrations/` | ✅ |
| `20260619_patient_identity.sql` | `supabase/migrations/` | ✅ |
| `20260619_test_results.sql` | `supabase/migrations/` | ✅ |
| `20260619_patient_family.sql` | `supabase/migrations/` | ✅ |
| `20260619_doctor_address.sql` | `supabase/migrations/` | ✅ |
| `20260619_multilang.sql` | `supabase/migrations/` | ✅ Session 7 |
| `20260619_multilang_seed.sql` | `supabase/migrations/` | ✅ Session 7 |
| `20260619_fix_near_me.sql` | `supabase/migrations/` | ✅ Session 8 |
| `20260619_whatsapp_populate.sql` | `supabase/migrations/` | ✅ Session 8 |
| `20260619_doctor_availability_seed.sql` | `supabase/migrations/` | ✅ Session 8 |

---

## Pending Items → Session 9 Priorities

1. **Patient dashboard web page** (`/dashboard/patient`) — upcoming + past appointments list, cancel button, Book Again
2. **Doctor general listing page** (`/doctors`) — browsable list without GPS; filter by spec/language/city
3. **Teleconsult join link** — generate video URL (Whereby/Jitsi or wa.me), store on appointment row, show to patient + doctor
4. **Push notification wiring** — `device_push_token` table exists; save token on login, send reminders via Expo push
5. **SMS/OTP login** — Supabase phone OTP for patients (replace email+password)
6. **Global admin web UI** — `/hospital-admin?scope=GLOBAL` page for platform owner
7. **Real WhatsApp numbers** — replace dummy `9194440000xx` before go-live
8. **⚠️ Fix Supabase Site URL** — Change from `http://localhost:3000` → `https://www.rasbros.com` in Auth → URL Configuration

---

## Schema Never-Forget
- Doctor: `first_name` + `last_name` (NOT `full_name`)
- Hospital: `active` (NOT `is_active`) — hospital_group/receptionist/hospital_admin use `is_active`
- Prescription FK: `consultation_id` (NOT `appointment_id`)
- Appointment type: `'F2F'` | `'TELECONSULT'`
- `entry_method`: `'DOCTOR_DIRECT'` | `'RECEPTIONIST'` | `'SCANNED'` | `'IMPORTED'`
- Platform WhatsApp: `919361287432`
- Supabase URL: `https://urrccvyiibqcfqfjgedp.supabase.co`
- Anon key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVycmNjdnlpaWJxY2ZxZmpnZWRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3ODQ0MTUsImV4cCI6MjA5NzM2MDQxNX0.9QBFB174ZmbmpdnsR8c7pA_ZaE3Xt1bhDBNDbnlSc2s`

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
patient_1        = e1000000-0000-0000-0000-000000000001  Ravi Kumar
patient_2        = e1000000-0000-0000-0000-000000000002  Ananya Krishnan
patient_3        = e1000000-0000-0000-0000-000000000003  Mohan Pillai
```

## Git Workflow (use in Session 9)
```bash
cd /sessions/<new-session-id>/work/ && \
git clone https://github.com/ShriniDhanaraj/ayushpathi-app.git ayushpathi9
cd ayushpathi9
git config user.email "dhanaraj.srini@gmail.com"
git config user.name "Shri Raj"
# make changes, then:
git add -A && git commit -m "feat: ..." && \
git remote set-url origin https://ghp_REDACTED_SEE_COWORK_PROJECT_FOLDER@github.com/ShriniDhanaraj/ayushpathi-app.git && \
git push origin main && \
git remote set-url origin https://github.com/ShriniDhanaraj/ayushpathi-app.git
```
