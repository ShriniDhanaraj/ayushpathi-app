# Ayushpathi — Session 9 Handoff

**Repo:** https://github.com/ShriniDhanaraj/ayushpathi-app  
**Vercel:** https://rasbros.com (auto-deploys on push to main)  
**PAT:** ghp_REDACTED_SEE_COWORK_PROJECT_FOLDER (valid until 16 Jul 2026)  
**Last commit:** `38ae925`

---

## What Was Completed in Session 8

### 1. Near-Me Search Fixed (`supabase/migrations/20260619_fix_near_me.sql`)
Three bugs were causing 0 results:
- **RPC param mismatch** — API called `p_lat/p_lng/p_radius_km` but function used `lat/lng/radius_km`
- **Wrong column refs** — RPC used `d.full_name`, `d.specialization`, `d.phone` (none exist)
- **No lat/lng data** — address rows for all 14 doctors had NULL coordinates

Fix: rewrote the RPC with correct params + column names + added `languages_spoken` to output. Seeded lat/lng for original 6 doctors (Chennai/Kochi) and multilang 8 doctors (Chennai, Thiruvananthapuram, Bengaluru, Mumbai, Delhi, Hyderabad, Kolkata).

**⚠️ MUST RUN IN SUPABASE:** `supabase/migrations/20260619_fix_near_me.sql`

### 2. Doctor Public Profile Page (`/doctor/[id]`)
- **API:** `GET /api/doctors/[id]` — returns specialization, languages, availability, hospital affiliations
- **Page:** `/app/doctors/[id]/page.tsx` — avatar, AYUSH spec badge, language chips, weekly availability grid, hospital list, registration details, Book Appointment button
- Book button → `/appointments/new?doctor=[id]`

### 3. Web Appointment Booking — Doctor Pre-selection
- `/appointments/new/page.tsx` now reads `?doctor=` query param
- When arriving from a doctor's profile page, step 2 (slot picker) is shown immediately with that doctor pre-selected

### 4. Hospital Admin Doctor Verification UI
- **API:** `PATCH /api/hospital-admin/doctors/[id]/verify` — accepts `{ action: 'APPROVE' | 'REJECT', rejection_reason? }`; scoped to admin's hospitals
- **API:** `GET /api/hospital-admin/doctors?status=PENDING` — returns pending doctors scoped to admin's hospitals
- **Page:** `/hospital-admin/doctors/page.tsx` — new "Pending Verification" section at top with amber badge count, Approve/Reject buttons, inline rejection reason textarea

### 5. WhatsApp Numbers Populated (`supabase/migrations/20260619_whatsapp_populate.sql`)
Dummy E.164 numbers (91xxxxxxxxxx) set for 4 hospitals and 2 hospital groups. Replace with real numbers before go-live.

**⚠️ MUST RUN IN SUPABASE:** `supabase/migrations/20260619_whatsapp_populate.sql`

### 6. Fixed `/api/doctors/route.ts`
Was referencing `full_name`, `specialization`, `phone`, `bio` — none exist. Fixed to `first_name`, `last_name`, `ayush_specialization`, `mobile`.

---

## Migrations to Run in Supabase (Session 8)

Run these two in Supabase SQL Editor in order:

```sql
-- 1. Fix near-me search + seed lat/lng for all 14 doctors
-- paste contents of: supabase/migrations/20260619_fix_near_me.sql

-- 2. Populate WhatsApp numbers
-- paste contents of: supabase/migrations/20260619_whatsapp_populate.sql
```

---

## What's NOT Built Yet — Session 9 Priorities

1. **Teleconsult join link** — `TELECONSULT` appointments have no video URL. Need to generate/store a join link (e.g. Jitsi deep link or Zoom URL) on booking and display it to patient + doctor.

2. **Push notification wiring** — `device_push_token` table exists, Expo push scaffold in `apps/mobile/lib/push-notifications.ts`. Need:
   - Save token on login (mobile)
   - Send reminders for upcoming appointments (next-visit card)
   - Send status-change alerts (APPROVED, CANCELLED)

3. **SMS/OTP login** — replace email+password auth with mobile OTP for patients. Supabase supports phone OTP natively.

4. **OCR prescription pipeline** — `entry_method = 'SCANNED'` column exists. Need: image upload → OCR parse → prefill prescription form.

5. **Patient dashboard web page** (`/dashboard/patient`) — the booking flow redirects here after confirming but it may need a proper appointments list view.

6. **Doctor public listing page** (`/doctors`) — currently `/doctors/near-me` exists but there's no general listing/search page for when user doesn't share location.

7. **Global admin web UI** — GLOBAL scope admins can see all hospitals/groups but have no dedicated UI page beyond `/hospital-admin`.

8. **Real WhatsApp numbers** — replace dummy `9194440000xx` numbers with real clinic WhatsApp numbers.

---

## Schema Never-Forget

- Doctor: `first_name` + `last_name` (NOT `full_name`)
- Hospital: `active` (NOT `is_active`)
- Hospital_group, receptionist, hospital_admin: `is_active`
- Prescription FK: `consultation_id` (NOT `appointment_id`)
- Appointment type: `'F2F'` | `'TELECONSULT'`
- `entry_method`: `'DOCTOR_DIRECT'` | `'RECEPTIONIST'` | `'SCANNED'` | `'IMPORTED'`
- Platform WhatsApp: `919361287432`
- Language codes: always 2-letter uppercase from lookup_language (EN, TA, HI etc.)
- Supabase URL: `https://urrccvyiibqcfqfjgedp.supabase.co`
- Anon key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVycmNjdnlpaWJxY2ZxZmpnZWRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3ODQ0MTUsImV4cCI6MjA5NzM2MDQxNX0.9QBFB174ZmbmpdnsR8c7pA_ZaE3Xt1bhDBNDbnlSc2s`

## Key Seeded UUIDs

```
hospital_group_1 = b1000000-0000-0000-0000-000000000001  (SunHealth AYUSH Group)
hospital_group_2 = b1000000-0000-0000-0000-000000000002  (WestCoast Wellness Group)
hospital_c1      = c1000000-0000-0000-0000-000000000001  (Apollo Ayurveda Chennai)
hospital_c2      = c1000000-0000-0000-0000-000000000002  (Sri Dhanvantri Chennai)
hospital_c3      = c1000000-0000-0000-0000-000000000003  (Kerala Ayur Center Kochi)
hospital_c4      = c1000000-0000-0000-0000-000000000004  (Harmony Homeopathy Bengaluru)
doctor_1         = d1000000-0000-0000-0000-000000000001  (Dr. Arjun Sharma, AYU)
doctor_2         = d1000000-0000-0000-0000-000000000002  (Dr. Priya Nair, HOM)
patient_1        = e1000000-0000-0000-0000-000000000001  (Ravi Kumar)
patient_2        = e1000000-0000-0000-0000-000000000002  (Ananya Krishnan)
patient_3        = e1000000-0000-0000-0000-000000000003  (Mohan Pillai)
```

## Git Workflow

```bash
cd /sessions/<new-session>/work && \
git clone https://ghp_REDACTED_SEE_COWORK_PROJECT_FOLDER@github.com/ShriniDhanaraj/ayushpathi-app.git ayushpathi9
cd ayushpathi9
git config user.email "dhanaraj.srini@gmail.com"
git config user.name "Shri Raj"
# work, then:
git add -A && git commit -m "feat: ..." && \
git remote set-url origin https://ghp_REDACTED_SEE_COWORK_PROJECT_FOLDER@github.com/ShriniDhanaraj/ayushpathi-app.git && \
git push origin main && \
git remote set-url origin https://github.com/ShriniDhanaraj/ayushpathi-app.git
```
