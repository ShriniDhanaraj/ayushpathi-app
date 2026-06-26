# Ayushpathi — Session 10 Handoff

**Repo:** https://github.com/ShriniDhanaraj/ayushpathi-app  
**Vercel:** https://www.rasbros.com (auto-deploys on push to main)  
**PAT:** ghp_REDACTED_SEE_COWORK_PROJECT_FOLDER (valid until 16 Jul 2026)

---

## ⚠️ ACTION REQUIRED — Run Migration in Supabase

Go to: https://supabase.com/dashboard/project/urrccvyiibqcfqfjgedp/sql/new

Paste and run this SQL:

```sql
ALTER TABLE appointment
  ADD COLUMN IF NOT EXISTS teleconsult_url TEXT;

COMMENT ON COLUMN appointment.teleconsult_url IS
  'Jitsi Meet URL auto-generated when appointment type is TELECONSULT';
```

Also set this environment variable in Vercel (for cron auth):
- Key: `CRON_SECRET`
- Value: any strong random string (e.g. `openssl rand -hex 32`)

---

## What Was Completed in Session 10

### 1. Patient Dashboard — Full Appointments List
**File:** `apps/web/src/app/dashboard/patient/page.tsx` (rewritten)  
**API:** `apps/web/src/app/api/appointments/mine/route.ts` (new)

- Upcoming + past appointments fetched via `GET /api/appointments/mine?view=upcoming|past`
- Each row shows: doctor name, specialization, hospital, date/time, status badge
- **Cancel button** — calls `PATCH /api/appointments/[id]/cancel` with JWT
- **Book Again** shortcut — links to `/appointments/new?doctor=[id]`
- **View Doctor** link to public profile
- Teleconsult join banner (purple, "Join Now") shown inline when `teleconsult_url` is set
- Booking success banner on `?booked=1`
- Quick-action cards at top: Book Appointment, Browse Doctors, Health Records, Family Members

### 2. Doctor General Listing Page
**File:** `apps/web/src/app/doctors/browse/page.tsx` (new)  
**API:** `apps/web/src/app/api/doctors/route.ts` (updated)

- Browsable at `/doctors/browse` — no GPS required
- Filters: name search, AYUSH specialization dropdown, language dropdown (all 14 codes), city/state text
- "Show doctors near me" shortcut links to `/doctors/near-me`
- Result cards: avatar, name, specialization badge, experience, location, languages, View Profile + Book buttons
- Skeleton loading states, clear-filters button
- `useSearchParams` wrapped in `<Suspense>` (build-safe)
- API additions: `language` filter uses `contains()` on `languages_spoken[]`; `city` filter applied in-memory on joined `address` (city/state)

### 3. Teleconsult Join Link
**Migration:** `supabase/migrations/20260626_teleconsult_url.sql` — adds `teleconsult_url TEXT` to `appointment`  
**API:** `apps/web/src/app/api/appointments/teleconsult/route.ts` (new)  
**Wired into:** `apps/web/src/app/appointments/new/page.tsx`, `apps/web/src/app/dashboard/doctor/page.tsx`

- `POST /api/appointments/teleconsult` — generates Jitsi Meet URL (`https://meet.jit.si/ayushpathi-{8chars}-{6hex}`), stores on row, idempotent (returns existing if already set)
- On patient booking: if type = `TELECONSULT`, auto-calls the endpoint after insert
- **Patient dashboard**: shows purple "Join Now" banner on upcoming teleconsult appointments
- **Doctor dashboard**: new "Upcoming Video Consultations" card showing next 7 days of TELECONSULT appointments with Join Now buttons

### 4. Push Notification Wiring
**Mobile:** `apps/mobile/app/(auth)/login.tsx` — added `registerPushToken()` called after successful login  
**API:** `apps/web/src/app/api/notifications/remind/route.ts` (new)  
**Cron:** `vercel.json` — Vercel Cron at 12:30 UTC (18:00 IST) calls `GET /api/notifications/remind`

- `registerPushToken()`: requests permission, gets Expo push token, POSTs to `/api/push/register` (uses `Device.isDevice` guard — skips emulator)
- Reminder route: finds all tomorrow's BOOKED/CONFIRMED appointments, looks up `device_push_token` for both patient and doctor, sends batched Expo push messages (100/batch)
- Cron auth: Vercel passes `Authorization: Bearer <CRON_SECRET>` automatically
- Push token table: `device_push_token(user_id, token, platform)` — already existed

---

## All Commits This Session (Session 10)

| Commit | Description |
|---|---|
| `6f34005` | feat(session10): patient dashboard appointments, doctor browse page, teleconsult join links, push notifications |

---

## What's NOT Built Yet — Session 11 Priorities

1. **⚠️ Run migration** — `ALTER TABLE appointment ADD COLUMN teleconsult_url TEXT` (see above)
2. **⚠️ Set CRON_SECRET** in Vercel env vars for reminder cron auth
3. **SMS/OTP login** — Supabase phone OTP for patients (replace email+password on mobile)
4. **Global admin web UI** — dedicated `/hospital-admin` view for GLOBAL scope (platform owner sees all hospitals)
5. **Doctor dashboard — Today's appointments list** — `/appointments/today` currently exists but is basic; wire teleconsult join links there too
6. **Teleconsult — status-change push** — notify patient when doctor confirms a TELECONSULT (status BOOKED → CONFIRMED)
7. **Real WhatsApp numbers** — replace dummy `9194440000xx` before go-live
8. **Supabase Site URL** — ✅ Already fixed to `https://www.rasbros.com`

---

## New Files This Session

```
apps/web/src/app/api/appointments/mine/route.ts     ← GET patient's own appointments
apps/web/src/app/api/appointments/teleconsult/route.ts ← POST generate+store Jitsi URL
apps/web/src/app/api/notifications/remind/route.ts  ← GET daily cron reminder
apps/web/src/app/doctors/browse/page.tsx            ← /doctors/browse browsable listing
supabase/migrations/20260626_teleconsult_url.sql    ← teleconsult_url column (APPLY THIS)
vercel.json                                          ← Vercel Cron config
```

## Modified Files This Session

```
apps/web/src/app/dashboard/patient/page.tsx         ← full appointments list + actions
apps/web/src/app/dashboard/doctor/page.tsx          ← teleconsult section
apps/web/src/app/api/doctors/route.ts               ← language + city filters
apps/web/src/app/appointments/new/page.tsx          ← auto-generate teleconsult URL on booking
apps/mobile/app/(auth)/login.tsx                    ← registerPushToken on login
```

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
| `20260626_teleconsult_url.sql` | `supabase/migrations/` | ⏳ **APPLY NOW** |

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

## Git Workflow (use in Session 11)
```bash
cd /sessions/<new-session-id>/work/ && \
git clone https://github.com/ShriniDhanaraj/ayushpathi-app.git ayushpathi11
cd ayushpathi11
git config user.email "dhanaraj.srini@gmail.com"
git config user.name "Shri Raj"
# make changes, then:
git add -A && git commit -m "feat: ..." && \
git remote set-url origin https://ghp_REDACTED_SEE_COWORK_PROJECT_FOLDER@github.com/ShriniDhanaraj/ayushpathi-app.git && \
git push origin main && \
git remote set-url origin https://github.com/ShriniDhanaraj/ayushpathi-app.git
```
