# Ayushpathi — Session 8 Handoff

**Repo:** https://github.com/ShriniDhanaraj/ayushpathi-app  
**Vercel:** https://rasbros.com (auto-deploys on push to main)  
**PAT:** ghp_REDACTED_SEE_COWORK_PROJECT_FOLDER (valid until 16 Jul 2026)

---

## What Was Completed in Session 7 (This Chat)

### Feature: Multilingual Support (MANDATORY — fully agreed and implemented)

**DB Migrations — BOTH SUCCESSFULLY RUN IN SUPABASE:**
- `supabase/migrations/20260619_multilang.sql` ✅
- `supabase/migrations/20260619_multilang_seed.sql` ✅

**Schema additions:**
| Table | New Column | Type | Purpose |
|---|---|---|---|
| patient | `known_languages` | TEXT[] | Languages patient can read/speak (≥1 mandatory) |
| patient | `ui_language` | TEXT → lookup_language.code | App display language (exactly 1) |
| patient | `preferred_interaction_language` | TEXT → lookup_language.code | Language to consult doctor in (exactly 1) |
| doctor | `ui_language` | TEXT → lookup_language.code | App display language (exactly 1) |
| (new) | `lookup_language` | reference table | 14 languages: EN/HI/TA/TE/KN/ML/BN/GU/MR/PA/OR/AS/UR/SA |

**Note:** `doctor.languages_spoken TEXT[]` already existed from migration 001 — repurposed as doctor's "known consultation languages." No rename needed.

**Files written to repo (need to be committed to GitHub — see Git section below):**
```
packages/shared/constants/languages.ts        ← LANGUAGES[], LANGUAGE_MAP, PRIMARY_LANGUAGE_CODES
packages/shared/i18n/translations.ts          ← Full UI strings in EN/HI/TA/TE/KN/ML/BN/GU/MR
apps/web/src/components/forms/PatientRegisterForm.tsx  ← Now 4-step, Step 4 = language prefs
apps/web/src/components/forms/DoctorRegisterForm.tsx   ← Step 3 = languages + login (merged)
apps/web/src/app/auth/login/page.tsx          ← Language switcher, post-login lang derivation
apps/web/src/app/api/register/patient/route.ts ← Accepts known_languages, ui_language, preferred_interaction_language
apps/web/src/app/api/register/doctor/route.ts ← Accepts ui_language
apps/web/src/app/api/doctors/near-me/route.ts ← ?language= filter param
apps/web/src/app/doctors/near-me/page.tsx     ← Language filter dropdown + matched chips
apps/mobile/app/(auth)/register/patient.tsx   ← 4-step with language step + top bar switcher
apps/mobile/app/(auth)/login.tsx              ← Language switcher + AsyncStorage post-login
```

**Seeded demo data (all password `Ayush@2026!`):**

New patients from multilang seed:
| Email | Name | UI Lang | Consult Lang |
|---|---|---|---|
| kavitha.subramanian@demo.ayushpathi.in | Kavitha Subramanian | TA | TA |
| rajesh.gowda@demo.ayushpathi.in | Rajesh Gowda | KN | KN |
| priya.nair@demo.ayushpathi.in | Priya Nair | ML | ML |
| venkata.rao@demo.ayushpathi.in | Venkata Rao | TE | TE |
| sunita.patil@demo.ayushpathi.in | Sunita Patil | MR | MR |
| arnab.chatterjee@demo.ayushpathi.in | Arnab Chatterjee | BN | BN |
| hardik.shah@demo.ayushpathi.in | Hardik Shah | GU | GU |
| ritu.sharma@demo.ayushpathi.in | Ritu Sharma | EN | HI (UI=EN, consult=HI) |

New doctors from multilang seed (all APPROVED):
| Email | Name | Spec | Languages |
|---|---|---|---|
| dr.murugan@demo.ayushpathi.in | Dr. Murugan Arumugam | AYU | TA, EN |
| dr.meenakshi@demo.ayushpathi.in | Dr. Meenakshi Sundaram | SID | TA, EN, HI |
| dr.arun@demo.ayushpathi.in | Dr. Arun Krishnakumar | HOM | ML, EN, TA |
| dr.shivaprasad@demo.ayushpathi.in | Dr. Shivaprasad Hegde | AYU | KN, EN, TE |
| dr.naseem@demo.ayushpathi.in | Dr. Naseem Qureshi | UNA | UR, HI, MR, EN |
| dr.pooja@demo.ayushpathi.in | Dr. Pooja Aggarwal | YOG | HI, EN, PA |
| dr.padmavathi@demo.ayushpathi.in | Dr. Padmavathi Reddy | AYU | TE, HI, EN |
| dr.debabrata@demo.ayushpathi.in | Dr. Debabrata Sen | HOM | BN, EN, HI |

**i18n scope decision (agreed):**
- Registration + Login pages: fully translated (9 languages) ✅
- Rest of app (dashboards, prescription forms, records): English only for now. Expand per regional roll-out.

---

## All Migrations Applied to Supabase (cumulative)

| # | File | Status |
|---|---|---|
| 1 | `packages/db/migrations/001_initial_schema.sql` | ✅ |
| 2 | `supabase/migrations/20260619_hospital_push.sql` | ✅ |
| 3 | `supabase/migrations/20260619_receptionist.sql` | ✅ |
| 4 | `supabase/migrations/20260619_prescription_audit.sql` | ✅ |
| 5 | `supabase/migrations/20260619_hospital_admin.sql` | ✅ |
| 6 | `supabase/migrations/20260619_whatsapp_numbers.sql` | ✅ |
| 7 | `supabase/migrations/20260619_patient_identity.sql` | ✅ |
| 8 | `supabase/migrations/20260619_test_results.sql` | ✅ |
| 9 | `supabase/migrations/20260619_patient_family.sql` | ✅ |
| 10 | `supabase/migrations/20260619_multilang.sql` | ✅ Session 7 |
| 11 | `supabase/migrations/20260619_multilang_seed.sql` | ✅ Session 7 |

---

## Pending Items Carried Forward

### From Session 7 backlog (not yet done):

1. **Near-Me Search returns 0 doctors** — run the lat/lng address addendum at the bottom of `ayushpathi_seed.sql` in Supabase SQL Editor (links doctor.address_id with lat/lng so the PostGIS RPC finds them)

2. **Hospital Admin web UI** — `/hospital-admin` page exists but is a stub. API routes already live at `/api/hospital-admin/`. Need: doctor approval/reject UI, receptionist management, appointment overview.

3. **Doctor profile public page** — `/doctor/[id]` — specialization, languages spoken, availability calendar, Book button. Needed before patient booking flow is usable on web.

4. **Patient appointment booking (web)** — currently mobile-only. Web flow: search → doctor profile → select slot → confirm.

5. **Teleconsult join link** — generate/show video link for `TELECONSULT` type appointments.

6. **Populate WhatsApp numbers** — `hospital.whatsapp_number` and `hospital_group.whatsapp_number` columns exist but are NULL for seeded hospitals. Need real or dummy numbers entered.

7. **Push notifications** — `device_push_token` table exists. Expo push wiring not yet connected.

### New items from Session 7:

8. **Commit new files to GitHub** — the 11 new/updated files from Session 7 are in the local workspace but NOT yet pushed to GitHub. Run the git block below first thing in Session 8.

9. **`@react-native-picker/picker` + `@react-native-async-storage/async-storage`** — must be added to mobile package.json if not already present (`npx expo install @react-native-picker/picker @react-native-async-storage/async-storage`)

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

## Git Workflow (first thing in Session 8)

```bash
cd /tmp && git clone https://github.com/ShriniDhanaraj/ayushpathi-app.git ayushpathi8
cd ayushpathi8
git config user.email "dhanaraj.srini@gmail.com"
git config user.name "Shri Raj"
# Copy new/updated files from workspace into repo, then:
git add -A && git commit -m "feat: multilingual support — language prefs on patient/doctor, i18n registration+login, doctor search language filter" && \
git remote set-url origin https://ghp_REDACTED_SEE_COWORK_PROJECT_FOLDER@github.com/ShriniDhanaraj/ayushpathi-app.git && \
git push origin main && \
git remote set-url origin https://github.com/ShriniDhanaraj/ayushpathi-app.git
```
