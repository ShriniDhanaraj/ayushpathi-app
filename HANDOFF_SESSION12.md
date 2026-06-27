# Ayushpathi — Session 12 Handoff

**Repo:** https://github.com/ShriniDhanaraj/ayushpathi-app  
**Live:** https://www.rasbros.com (Vercel auto-deploy)  
**PAT:** ghp_REDACTED_SEE_COWORK_PROJECT_FOLDER (valid until 31 Jul 2026)  
**Last commit:** `52ccbdc`

---

## What Was Built in Session 12

### 1. Receptionist Dashboard (`/dashboard/receptionist`) — Full Rewrite
**Was:** Static stub with 4 hardcoded link cards, no data.  
**Now:** Fully functional server component.

- Resolves receptionist record → hospital (via `getSupabaseAdmin`)
- 3 stat pills: Pending/Confirmed, In clinic (ARRIVED), Completed
- Live appointments table for today: time, patient name+mobile, doctor+spec, status badge
- Quick action sidebar: Register patient, Book appointment, Enter prescription, Attach results
- **GDPR 2-step patient lookup** (`GdprLookup` client component, `src/components/receptionist/GdprLookup.tsx`):
  - Step 1: first name + last name + mobile + DOB → `POST /api/receptionist/identify`
  - Step 2: Show masked address → receptionist asks caller → `POST /api/receptionist/identify/confirm`
  - Step 3: Shows confirmed profile; patient type shows "View patient record →" link

### 2. Hospital Admin Dashboard (`/dashboard/admin`) — Full Rewrite
**Was:** `'use client'` component using anon Supabase client (RLS blocked most queries).  
**Now:** Server component using `getSupabaseAdmin` — works for all 3 scopes.

- Detects scope (HOSPITAL / GROUP / GLOBAL) from `hospital_admin` table
- All stats are scoped: only counts appointments/doctors/receptionists for accessible hospitals
- Today's stats: total appointments, in clinic, completed, pending verifications
- Pending doctor verifications list with "Review →" link to `/hospital-admin/doctors/[id]`
- Quick links sidebar: Verify doctors, Today's appointments, Hospital info, Receptionists
- Hospital info panel (name, city, active status) — shown when ≤6 hospitals in scope
- Active doctors + receptionist count tiles

### 3. Doctor Consultation Flow — `/consultation/new`
**Was:** 404 (page didn't exist; "Write prescription" quick action on doctor dashboard was dead).  
**Now:** New page at `src/app/consultation/new/page.tsx`.

- Doctor sees today's appointments split into two lists:
  - "Waiting / Ready to start" — BOOKED/CONFIRMED/ARRIVED with no consultation record yet
  - "In progress / Resume" — appointments that already have a consultation row
- Color-coded left border by status (blue=BOOKED, brand=CONFIRMED, amber=ARRIVED, green=has-consult)
- Each row links to `/consultation/[appointmentId]` (the existing consultation form)
- Empty state when all today's appointments are done

### 4. Patient Individual View — `/patients/[id]`
**Was:** 404 ("View →" link in `/patients` page went nowhere).  
**Now:** New page at `src/app/patients/[id]/page.tsx`.

- **Consent-gated**: checks `patient_doctor_consent` for ACTIVE status before showing anything
  - No consent → locked screen with explanation (no data leaked)
- **Left panel**: patient basic info (name, age, gender, mobile, DOB, consent date), health profile (blood group, conditions, allergies, current meds — only if `share_full_history=true`), family history
- **Right panel**: consultation history with prescriptions inline
  - `share_full_history=true` → all consultations for this patient across all doctors
  - `share_full_history=false` → only this doctor's consultations
  - Each consultation shows: date, chief complaint, diagnosis, next visit badge, prescription items (dosage, frequency, duration, verification status)

---

## Files Changed (Session 12)

| File | Change |
|---|---|
| `apps/web/src/components/receptionist/GdprLookup.tsx` | **New** — GDPR 2-step lookup client component |
| `apps/web/src/app/dashboard/receptionist/page.tsx` | **Rewritten** — full server component with live data |
| `apps/web/src/app/dashboard/admin/page.tsx` | **Rewritten** — server component, scoped stats, all 3 admin scopes |
| `apps/web/src/app/consultation/new/page.tsx` | **New** — today's appointments picker for doctors |
| `apps/web/src/app/patients/[id]/page.tsx` | **New** — consent-gated patient detail + consultation history |

---

## Known Quick-Action Links That Still 404

From the receptionist dashboard quick actions:
- `/patients/new` — Register new patient (form not built yet)
- `/receptionist/prescriptions/new` — Enter prescription (not built, API exists at `POST /api/receptionist/prescription`)
- `/results/upload` — Attach test results (not built, API exists at `POST /api/test-results/upload`)

From the admin dashboard:
- `/hospital-admin/info` — Hospital info page (not built)
- `/hospital-admin/receptionists` — Receptionist management page (not built)

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

## What's NOT Built Yet — Session 13 Priorities

1. **SMS/OTP login** — replace email+password with Supabase phone OTP for patients
2. **Global admin web UI** — GLOBAL scope needs platform-wide management (hospitals, groups, global admins)
3. **Receptionist prescription entry UI** — `/receptionist/prescriptions/new` (API ready)
4. **Patient registration web page** — `/patients/new` (linked from receptionist dash)
5. **Test results upload page** — `/results/upload` (API ready)
6. **Real WhatsApp numbers** — replace dummy `9194440000xx` before go-live

---

## Git Workflow
```bash
cd /sessions/<session-id>/work/ && \
git clone https://github.com/ShriniDhanaraj/ayushpathi-app.git ayushpathi13
cd ayushpathi13
git config user.email "dhanaraj.srini@gmail.com"
git config user.name "Shri Raj"
# make changes, then:
git add -A && git commit -m "feat: ..." && \
git remote set-url origin https://ghp_REDACTED_SEE_COWORK_PROJECT_FOLDER@github.com/ShriniDhanaraj/ayushpathi-app.git && \
git push origin main && \
git remote set-url origin https://github.com/ShriniDhanaraj/ayushpathi-app.git
```
