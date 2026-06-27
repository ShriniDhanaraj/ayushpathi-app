# Ayushpathi — Session 13 Handoff

**Repo:** https://github.com/ShriniDhanaraj/ayushpathi-app  
**Live:** https://www.rasbros.com (Vercel auto-deploy)  
**PAT:** ghp_REDACTED_SEE_COWORK_PROJECT_FOLDER (valid until 31 Jul 2026)  
**Last commit:** `f489929`

---

## What Was Built in Session 13

### 1. `/receptionist/prescriptions/new` — Appointment Picker
Receptionist dashboard quick action "Enter prescription" was 404. Now:
- Server component (auth-gated, receptionist only)
- Fetches today's non-cancelled appointments for the receptionist's hospital
- Renders a list — clicking an appointment redirects to the existing `/receptionist/prescription/[appointmentId]` form (which was already built)

### 2. `/api/receptionist/register-patient` — New API Route
`POST /api/register/patient` required an `auth_user_id` (the patient's own UID), which a receptionist can't supply. New route:
- Auth-gated: Bearer JWT must belong to an active receptionist or hospital_admin
- Step 1: creates Supabase auth user (`admin.auth.admin.createUser`) with temp password `Ayush@2026!` and `role: patient` in metadata
- Step 2: inserts address row, then patient row, with rollback on failure
- Returns `patient_id`, name, and a message to tell the patient to reset password

### 3. `/patients/new` — Patient Registration Form
Client component (needs session token for API call). Fields:
- Personal: first name, last name, DOB, gender; minor detection → shows guardian fields
- Contact: email, mobile
- Address (all fields — critical for GDPR 2-step lookup)
- Language preferences: multi-select known languages, ui_language, preferred_interaction_language
- On success: shows patient_id + "Register another" / "View patient record →" links
- Temp password displayed so receptionist can inform the patient

### 4. `/results/upload` — Test Result Upload
Client component. Flow:
- Loads today's appointments via `GET /api/receptionist/appointments` (session-authed)
- Receptionist selects an appointment from the list
- File picker (click-to-open): JPG/PNG/PDF/HEIC, max 50 MB
- Optional notes field
- POSTs `FormData` with `file`, `appointment_id`, `patient_id`, `uploaded_by_role=RECEPTIONIST` to `POST /api/test-results/upload`
- Success screen with file name + patient name confirmation

### 5. `/hospital-admin/info` — Hospital Information Page
Server component, scoped to admin access:
- HOSPITAL scope → shows their one hospital
- GROUP scope → shows all hospitals in the group
- GLOBAL scope → shows all hospitals
- Each hospital card: name, registration no., phone, email, WhatsApp link, website, address, AYUSH specializations (badges), Google Maps link (if lat/lng set)

---

## Files Changed (Session 13)

| File | Change |
|---|---|
| `apps/web/src/app/api/receptionist/register-patient/route.ts` | **New** — creates auth user + patient record in one call |
| `apps/web/src/app/receptionist/prescriptions/new/page.tsx` | **New** — today's appointment picker |
| `apps/web/src/app/patients/new/page.tsx` | **New** — receptionist patient registration form |
| `apps/web/src/app/results/upload/page.tsx` | **New** — test result file upload form |
| `apps/web/src/app/hospital-admin/info/page.tsx` | **New** — hospital info view (all scopes) |

---

## All Receptionist Dashboard Quick Actions — Status

| Label | Link | Status |
|---|---|---|
| ➕ Register new patient | `/patients/new` | ✅ Built S13 |
| 📅 Book appointment | `/appointments/new` | ⚠ Needs receptionist-specific flow |
| 💊 Enter prescription | `/receptionist/prescriptions/new` | ✅ Built S13 |
| 📎 Attach test results | `/results/upload` | ✅ Built S13 |

## All Admin Dashboard Quick Links — Status

| Label | Link | Status |
|---|---|---|
| 👨‍⚕️ Verify doctors | `/hospital-admin/doctors?status=PENDING` | ✅ Exists |
| 📅 Today's appointments | `/appointments/today` | ✅ Exists (doctor-scoped — may need admin view) |
| 🏥 Hospital info | `/hospital-admin/info` | ✅ Built S13 |
| 👤 Receptionists | `/hospital-admin/receptionists` | ✅ Exists |

---

## Schema Never-Forget
- Doctor: `first_name` + `last_name` (NOT `full_name`)
- Hospital: `active` (NOT `is_active`) — hospital_group/receptionist/hospital_admin use `is_active`
- Prescription FK: `consultation_id` (NOT `appointment_id`)
- Appointment type: `'F2F'` | `'TELECONSULT'`
- `entry_method`: `'DOCTOR_DIRECT'` | `'RECEPTIONIST'` | `'SCANNED'` | `'IMPORTED'`
- Platform WhatsApp: `919361287432`
- ROLE_DASHBOARD: `patient`→`/dashboard/patient`, `doctor`→`/dashboard/doctor`, `hospital_admin`→`/dashboard/admin`, `receptionist`→`/dashboard/receptionist`

---

## What's NOT Built Yet — Session 14 Priorities

1. **SMS/OTP login** — replace email+password with Supabase phone OTP for patients
2. **Global admin web UI** — GLOBAL scope needs platform-wide management (manage hospitals, groups, global admins)
3. **Real WhatsApp numbers** — replace dummy `9194440000xx` before go-live
4. **Appointment booking from receptionist** — `/appointments/new` needs to show a receptionist-specific flow (select patient via GDPR lookup, select doctor from hospital, pick slot)
5. **Admin appointments view** — `/appointments/today` is currently doctor-scoped; admin should see all appointments for their hospital

---

## Git Workflow
```bash
cd /sessions/<session-id>/work/ && \
git clone https://github.com/ShriniDhanaraj/ayushpathi-app.git ayushpathi14
cd ayushpathi14
git config user.email "dhanaraj.srini@gmail.com"
git config user.name "Shri Raj"
# make changes, then:
git add -A && git commit -m "feat: ..." && \
git remote set-url origin https://ghp_REDACTED_SEE_COWORK_PROJECT_FOLDER@github.com/ShriniDhanaraj/ayushpathi-app.git && \
git push origin main && \
git remote set-url origin https://github.com/ShriniDhanaraj/ayushpathi-app.git
```
