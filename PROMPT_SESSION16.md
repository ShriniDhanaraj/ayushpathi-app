# Ayushpathi — Session 16 Start Prompt

> Copy-paste this entire prompt to start the next Cowork chat session.

---

Read `HANDOFF_MASTER.md` and `PROJECT_INSTRUCTIONS.md` from the project folder first, then proceed with Session 16 priorities.

**Context:** Ayushpathi is an India-based AYUSH healthcare platform. Monorepo: Next.js 14 web (`apps/web/`) + React Native Expo 54 mobile (`apps/mobile/`). DB: Supabase. Repo: https://github.com/ShriniDhanaraj/ayushpathi-app. Live: https://www.rasbros.com. Last commit: `7874a25`.

**Completed in Session 15 (do NOT rebuild):**
- Receptionist GDPR Appointment Booking (`/receptionist/book`) — 5-step wizard: GDPR lookup → hospital doctor roster → slot picker → confirm → `POST /api/receptionist/appointments`
- New `GET /api/receptionist/hospital-doctors` API — hospital-scoped doctor list for receptionists
- Admin-Scoped Appointments View (`/hospital-admin/appointments`) — server component, all 3 scopes (HOSPITAL/GROUP/GLOBAL), date picker, status pills
- WhatsApp OTP Patient Login — Edge Function `send-otp-whatsapp` (MSG91 + per-language + email fallback), mobile login rewritten with phone+OTP patient mode + email+password staff mode toggle
- Test cases: 33 new tests added (RB-01..10, AA-01..10, OTP-01..13)

**Session 16 Priorities — build in this order:**

1. **Activate WhatsApp OTP** (requires Shri Raj to do manual steps first — see checklist in `supabase/migrations/20260627_otp_phone_auth.sql`): once MSG91 + Supabase Phone Auth is configured, verify end-to-end OTP flow works. If Shri Raj hasn't done the external setup yet, skip to Priority 2.

2. **Global Admin Web UI** — `/admin` or `/global-admin` page for GLOBAL scope only: manage hospitals (list/add/toggle active), manage hospital groups, promote/demote users to GROUP/GLOBAL admin roles. Use `getHospitalAdminContext()` + `getSupabaseAdmin()`. Gate page to `scope='GLOBAL'` only — redirect others to `/dashboard/admin`.

3. **PROMPT_SESSION16 says "couple more prompts ready"** — pass those next prompts now.

**Schema reminders:**
- Doctor: `first_name` + `last_name` (NOT `full_name`)
- Hospital: `active` (NOT `is_active`) — hospital_group/receptionist/hospital_admin use `is_active`
- Prescription FK: `consultation_id` (NOT `appointment_id`)
- PAT: in HANDOFF_MASTER.md — **never commit the real token to any markdown file**

After all work is done: update `HANDOFF_MASTER.md` (do NOT create a new HANDOFF_SESSION16.md), update `Ayushpathi_Test_Cases.xlsx` with new test cases, commit and push.
