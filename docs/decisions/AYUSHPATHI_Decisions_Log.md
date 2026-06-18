# Ayushpathi — Decisions Log
**Status:** Living document — updated as decisions are made  
**Last Updated:** June 2026  

---

## Core Principles (Non-Negotiable)

1. **Patient-Owned Data** — Patient is the legal owner of all their health data
2. **Consent-Gated Access** — No doctor accesses patient data without explicit patient consent
3. **Full Audit Trail** — Every write/update to medical records is logged (who, what, when)
4. **Zero Vendor Lock-in** — All data must be exportable with standard tools at any time
5. **NGO-First Cost Model** — Architecture must stay within free/low-cost tiers; worst case self-hosted on Mac Mini

---

## Decision 1 — Patient Data Model ✅

**Progressive collection across visits — not a wall-of-fields form.**

### Visit 1 (Registration) — Mandatory
| Field | Type | Notes |
|---|---|---|
| first_name | text | |
| last_name | text | |
| date_of_birth | date | |
| gender | lookup | Male / Female / Undisclosed |
| profile_photo | file | optional |
| email | text | unique |
| mobile | text | primary contact |
| phone | text | landline, optional |
| whatsapp_enabled | boolean | on mobile number |
| social_media | JSON | handles (optional) |
| communication_consent | lookup[] | SMS / WhatsApp / Email |
| **Address** | FK → Address table | India: door, street, area, city, district, state, pincode, lat, long |

### Visit 2–3 (Pre-Consultation) — Collected before first doctor interaction
| Field | Type | Notes |
|---|---|---|
| known_conditions | text[] | diabetes, hypertension, etc. |
| allergies | text[] | food, medicine, environmental |
| current_medications | JSON[] | {name, dosage, frequency, since} |
| past_surgeries | JSON[] | {procedure, year, hospital} |
| family_history | JSON[] | {relation, condition} |

**UI Principle:** Conversational step-by-step wizard. No single screen with >4–5 fields visible at once.

---

## Decision 2 — Doctor Data Model ✅

**Standard aligned with eSanjeevani (India). Tight, no loopholes.**

### Identity
| Field | Type | Notes |
|---|---|---|
| first_name | text | |
| last_name | text | |
| date_of_birth | date | |
| gender | lookup | |
| profile_photo | file | |
| email | text | unique, used for login |
| mobile | text | |
| whatsapp_enabled | boolean | |

### Professional
| Field | Type | Notes |
|---|---|---|
| registration_number | text | MCI or State Medical Council |
| registration_council | text | e.g. Tamil Nadu Medical Council |
| degrees | lookup[] | MBBS, BSMS, MS, MD, etc. |
| ayush_specialization | lookup | Ayurveda / Yoga & Naturopathy / Unani / Siddha / Homeopathy |
| years_of_experience | integer | |
| languages_spoken | text[] | for patient matching |

### Practice
| Field | Type | Notes |
|---|---|---|
| hospital_id(s) | FK[] → Hospital | M:M — doctor can be at multiple hospitals |
| consultation_days | lookup[] | Mon–Sun |
| consultation_hours | JSON | {start, end} per day |

### Verification
| Field | Type | Notes |
|---|---|---|
| degree_certificate | file | upload |
| registration_certificate | file | upload |
| verification_status | enum | pending / approved / rejected |
| verified_by | FK → Ayushpathi Admin | |
| verified_at | timestamp | |
| rejection_reason | text | if rejected |

**Rule:** Doctor account is inactive until verification_status = approved.

---

## Decision 3 — Medicine/Product Model
**DEFERRED — to be decided after holidays.**

---

## Decision 4 — Doctor Verification Flow ✅

```
Doctor registers → uploads degree certificate + registration certificate
    → Ayushpathi Admin reviews documents
        → Approved: account activated, doctor visible to patients
        → Rejected: reason logged, doctor notified, can re-upload
```

No doctor is searchable or bookable until manually approved by Ayushpathi Admin.

---

## Decision 5 — Roles & Consent Model ✅

### Roles (5 total)

| Role | Scope | Description |
|---|---|---|
| **Ayushpathi Admin** | Platform-wide | Super user — verifies doctors, manages platform, sees all reports |
| **Hospital Admin** | Hospital-level | Manages hospital profile, doctors at that hospital, hospital reports |
| **Receptionist** | Hospital-level | Patient registration, appointment booking, attaches test results — NO medical record access |
| **Doctor** | Consent-scoped | Reads/writes medical records only for consented patients |
| **Patient** | Own data only | Owns all their data, grants/revokes consent |

### Consent Rules (Core — Non-Negotiable)

1. **Patient owns data.** No doctor accesses patient data without a live, active consent record.
2. **Consent = explicit action by patient.** Patient searches for doctor, selects them, consents.
3. **Consent revocation = immediate.** When patient revokes, Doctor loses all access instantly. No grace period.
4. **Multiple concurrent consents allowed.** Patient can give consent to Doctor A + Doctor B simultaneously.
5. **Doctor access is scoped.** Doctor only sees records created during their consent window (TBD: or all history? — default: patient chooses at consent time).
6. **Patient downloads their own data.** Only patient can export full health record.
7. **Patient flags corrections.** Patient cannot directly edit (preserves record integrity) but can flag inaccuracies → admin reviews.
8. **Audit trail on every write.** Any insert/update by a Doctor is logged: {user_id, role, action, timestamp, old_value, new_value}.
9. **Only registered platform users can write medical data.** No external API writes, no unverified accounts.

### Consent State Machine
```
Patient searches doctor
    → Patient consents → Relationship: ACTIVE
        → Doctor has READ + WRITE (logged)
    → Patient revokes → Relationship: REVOKED
        → Doctor access: NONE (immediate)
    → Patient re-consents → Relationship: ACTIVE again
```

### Permission Matrix

| Action | Patient | Doctor (consented) | Doctor (no consent) | Receptionist | Hospital Admin | Ayushpathi Admin |
|---|---|---|---|---|---|---|
| View own profile | ✅ | ✅ | ❌ | ✅ (basic) | ❌ | ✅ |
| Edit own profile | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| View medical records | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Write consultation notes | ❌ | ✅ (logged) | ❌ | ❌ | ❌ | ❌ |
| Write prescription | ❌ | ✅ (logged) | ❌ | ❌ | ❌ | ❌ |
| Download own records | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Book appointment | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ |
| Verify doctor | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| View hospital reports | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |

---

## Decision 6 — Hosting Stack ✅ FINAL — NOT CHANGING

| Service | Purpose | Cost | Lock-in Risk |
|---|---|---|---|
| **Supabase** | PostgreSQL DB + Auth + File Storage | Free tier → $25/mo Pro | Zero — standard PostgreSQL |
| **Vercel** | Next.js frontend hosting | Free tier → $20/mo Pro | Low — standard Node.js app |
| **rasbros.com** | Production domain (Google Domains) | Already owned | N/A |
| **GitHub** | Source code + CI/CD | Free | N/A |

### Data Portability Guarantee
- Supabase = standard PostgreSQL. Export: `pg_dump -U postgres ayushpathi > backup.sql`
- Vercel = standard Next.js. Deploy anywhere Node.js runs.
- Files = standard S3-compatible storage. Migratable to any S3 provider or local disk.

### Mac Mini Self-Hosted Fallback (if cloud cost becomes a concern)
- Supabase has an official Docker self-hosted image
- Next.js runs on Node.js natively
- Entire stack: `docker-compose up` on Mac Mini
- DNS: rasbros.com → home IP (with DDNS) or a cheap VPS reverse proxy ($5/mo DigitalOcean)
- **Architecture is identical** — no code changes needed to switch from cloud to self-hosted

---

## Decision 7 — App Name & Branding ✅

**Product name: Ayushpathi** (confirmed — distinct from Government of India "Ministry of AYUSH" trademark)

- "AYUSH" alone risks trademark conflict with Ministry of AYUSH (GoI)
- "Ayushpathi" is distinct, already used in the PPT, and safe
- Tagline option: *"Bringing Traditional Indian Medicine to the World"*
- Long-term vision: Global platform — architecture supports multi-country, multi-language from day one
- Domain path: rasbros.com (current), future: ayushpathi.com or similar (optional)

---

## Decision 8 — ABHA Integration ✅

**ABHA = Ayushman Bharat Health Account** — Government of India's national health ID (14-digit).  
Issued by NHA (National Health Authority). API is publicly available.

### Why it matters
- Patients already registered with ABHA carry a verified national health identity
- Links Ayushpathi records to India's national health stack — adds credibility and interoperability
- Avoids creating a parallel identity when one already exists
- Signals seriousness to government bodies, hospitals, and practitioners

### Implementation
- Patient registration: optional field — "Do you have an ABHA ID?" → link if yes, skip if no
- On linking: fetch existing ABHA profile (name, DOB, gender) to pre-fill registration
- Patient's Ayushpathi health records can be tagged with ABHA ID for future national health record portability
- **Phase:** Phase 1 (registration flow) — low effort, high credibility

### API
- NHA Health ID APIs: `https://healthidsbx.abdm.gov.in` (sandbox) / `https://healthid.ndhm.gov.in` (production)
- Auth: OAuth 2.0 with Aadhaar OTP or mobile OTP verification

---

## Decision 9 — Teleconsultation ✅

**F2F consultation remains primary for AYUSH diagnosis.** Teleconsultation is an additive channel for two specific, justified use cases only.

### Use Case 1 — International / Diaspora
Patients abroad (UK, US, Middle East, Southeast Asia) connecting to verified AYUSH doctors in India. No F2F alternative exists for them.

### Use Case 2 — Follow-up / Patient Under Observation
- Patient already diagnosed F2F
- Under active treatment, needs a check-in without travelling
- Emergency check-in during rural travel or when physical visit isn't possible

### What it is NOT
- Not a replacement for first-time diagnosis
- Not for new patients presenting unknown symptoms
- Doctors may decline teleconsultation and require F2F — that's their right

### Implementation
- In-app video/audio call: **Daily.co** or **Jitsi (self-hosted)** — both WebRTC-based, free tier available
- Jitsi is open-source and self-hostable (aligns with NGO/zero-cost principle)
- Consultation notes + prescription can still be captured post-call, same as F2F
- Teleconsultation sessions are logged (date, duration, doctor, patient) for audit
- **Phase:** Phase 2

### Doctor Controls
- Doctor can mark themselves as "available for teleconsultation" — opt-in, not default
- Doctor can decline any teleconsultation request and redirect to F2F

---

## Decision 10 — Payment Gateway ✅

**Triggered only by teleconsultation. F2F consultations remain free (NGO).**

### Principle
- The platform does not charge any fee — it is a pass-through only
- Doctor sets their own teleconsultation fee (can be zero for NGO-aligned doctors)
- Platform facilitates payment; platform takes no cut

### Payment Methods (India-first, then international)
| Provider | Supports | Use Case |
|---|---|---|
| **Razorpay** | UPI, GPay, PhonePe, Cards, Net Banking, Wallets | India patients — primary |
| **Stripe** | Cards, Apple Pay, Google Pay (international) | Diaspora / international patients |

### Flow
```
Patient books teleconsultation
    → Doctor's fee displayed (can be ₹0)
    → If fee > 0: Razorpay (India) or Stripe (international) payment
    → Payment confirmed → appointment confirmed
    → If fee = 0: appointment confirmed directly (no payment step)
```

### Refund Policy
- Full refund if doctor cancels
- Full refund if technical failure during session (< 5 minutes connected)
- No refund after session completed

### **Phase:** Phase 2 (alongside teleconsultation — they ship together)

---

## Decision 11 — Address API ✅

**Google Maps API — FINAL**

- Free tier: $200/month credit (~40,000 geocoding requests) — sufficient for NGO scale
- Global coverage — ready for international expansion without API swap
- Services used: Geocoding (address → lat/long), Places Autocomplete (address search UX)
- MapMyIndia rejected: India-only, would need replacing at global expansion

---

## Decision 12 — Calendar / Availability System ✅

**Custom availability system — no Google Calendar integration**

- Doctor sets: available days (Mon–Sun), hours per day ({start, end}), slot duration (e.g. 15/30 mins)
- System auto-generates bookable slots from these rules
- Simpler, free, zero external dependency, no Google account required for doctors
- Google Calendar sync can be added as a future enhancement if doctors request it

---

## Decision 13 — Notifications ✅

**WhatsApp via Twilio — primary channel. SMS deferred.**

- Provider: Twilio WhatsApp Business API
- Free trial available; production: ~₹0.50–1 per conversation (negligible at NGO scale)
- Use cases: appointment confirmation, appointment reminder (24hr + 1hr before), prescription ready, teleconsultation link
- SMS: skipped for now, architecture allows adding later with minimal effort
- Email: Supabase built-in transactional email covers basic notifications at no cost

---

## Open Items (Post-Holiday — ~3 weeks from 21 June 2026)

- [ ] **Medicine/Product data model** — to be co-designed with a Pharmacy owner/practitioner. Do not start without domain input.
- [ ] **UI wireframes / design system** (Figma)

---

## Build Start Checklist (Ready when you return)

- [x] Patient data model — closed
- [x] Doctor data model — closed
- [x] Doctor verification flow — closed
- [x] Roles & consent model — closed
- [x] Hosting stack — closed
- [x] App name — closed
- [x] ABHA integration — closed
- [x] Teleconsultation scope — closed
- [x] Payment gateway — closed
- [ ] Medicine model — post-holiday
- [ ] Wireframes — post-holiday (can start build without, add UI later)
- [ ] GitHub repo setup — first task on return
