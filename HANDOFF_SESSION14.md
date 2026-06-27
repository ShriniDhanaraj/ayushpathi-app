# Ayushpathi — Session 14 Handoff

**Repo:** https://github.com/ShriniDhanaraj/ayushpathi-app  
**Live:** https://www.rasbros.com (Vercel auto-deploy)  
**PAT:** ghp_REDACTED_SEE_COWORK_PROJECT_FOLDER (valid until 31 Jul 2026)  
**Last commit:** `cdcd37f`

---

## What Was Done in Session 14

### 1. Mobile Quick Access Navigation Fix
**Problem:** Two buttons on the mobile Profile tab ("Prescriptions & Consultations" and "My Doctors") were visible but did nothing when tapped — they lacked `onPress` handlers.

**Root cause:** These buttons were added by the user in a local build but never committed to the repo. The running app had them, the repo did not.

**Fix:** `apps/mobile/app/(tabs)/profile.tsx`
- Added `useRouter` import from `expo-router`
- Added a "Quick Access" card section at the TOP of the scroll view (above Personal Information)
- Two `TouchableOpacity` rows:
  - "Prescriptions & Consultations" → `router.push('/(tabs)/records')`
  - "My Doctors" → `router.push('/(tabs)/doctors')`
- New styles: `navRow`, `navIcon`, `navEmoji`, `navContent`, `navTitle`, `navSub`, `navDivider`

### 2. WhatsApp OTP Research (docs/whatsapp-otp-research.md)
User requested: delay SMS/OTP login, research WhatsApp OTP instead. Full research completed.

**Key findings:**
- `wa.me` deep links **cannot** deliver OTP — they pre-fill a message draft that the user must tap "Send" on. Completely unsuitable for auth.
- Supabase has a **Send SMS Hook** that intercepts OTP delivery and routes to any custom provider.
- **MSG91** (India HQ) is the recommended provider:
  - ₹0.20/OTP (authentication template, Meta's official rate, no markup)
  - ₹500/month subscription per number (waived first 2 months)
  - ~₹2,500/month total for 10,000 OTPs
  - Well-documented Supabase Edge Function integration
  - Same account can fall back to SMS if WhatsApp fails

**Proposed architecture:**
```
Patient enters mobile → signInWithOtp({ phone }) →
Supabase generates OTP → Send SMS Hook fires →
Edge Function (send-otp-whatsapp) → MSG91 WhatsApp API →
Patient gets WhatsApp message → enters OTP →
verifyOtp() → session created
```

**Decisions needed before build** (documented in the research doc):
1. Which WhatsApp number to use? (Platform `919361287432` or dedicated auth number?)
2. SMS fallback? (Yes/No)
3. OTP template in English only, or multi-language?

---

## Files Changed (Session 14)

| File | Change |
|---|---|
| `apps/mobile/app/(tabs)/profile.tsx` | Modified — added Quick Access nav card with two working buttons |
| `docs/whatsapp-otp-research.md` | New — WhatsApp OTP feasibility analysis + recommendation |

---

## What's NOT Built Yet — Session 15 Priorities

### Priority 1: WhatsApp OTP Patient Login
**Research complete — ready to build once decisions made.**

Steps:
1. Create MSG91 account, register WhatsApp Business number (`919361287432`), submit OTP template to Meta
2. Write Supabase Edge Function `send-otp-whatsapp`
3. Configure Supabase Auth → Send SMS Hook
4. Rewrite mobile login screen: phone number → OTP entry flow
5. Remove email+password from patient login (keep for staff roles)

Estimated: ~1.5 days. Full details in `docs/whatsapp-otp-research.md`.

### Priority 2: Receptionist Appointment Booking
`/appointments/new` exists but is patient-scoped. Need receptionist flow:
- Patient lookup via GDPR 2-step (phone → name → address confirm)
- Doctor selection from hospital roster
- Date/slot picker from doctor availability
- Book on patient's behalf (`booked_by_role = 'RECEPTIONIST'`)

### Priority 3: Admin-Scoped Appointments View
`/appointments/today` is doctor-scoped. Admin should see all today's appointments for their hospital(s). Use `getHospitalAdminContext()` for scope, `getSupabaseAdmin()` for query.

### Priority 4: Global Admin Web UI
GLOBAL scope admins need a management page: list all hospitals/groups, manage other admins.

---

## Schema Never-Forget
- Doctor: `first_name` + `last_name` (NOT `full_name`)
- Hospital: `active` (NOT `is_active`)
- Prescription FK: `consultation_id` (NOT `appointment_id`)
- Appointment type: `'F2F'` | `'TELECONSULT'`
- `entry_method`: `'DOCTOR_DIRECT'` | `'RECEPTIONIST'` | `'SCANNED'` | `'IMPORTED'`
- Platform WhatsApp: `919361287432`
- ROLE_DASHBOARD: `patient`→`/dashboard/patient`, `doctor`→`/dashboard/doctor`, `hospital_admin`→`/dashboard/admin`, `receptionist`→`/dashboard/receptionist`

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
