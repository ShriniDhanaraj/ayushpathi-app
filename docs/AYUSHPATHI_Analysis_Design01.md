# Ayushpathi — Design 01 Analysis & Complexity Assessment

**Source:** AyushpathiHealthcareApp_Ver 1.0_20210616_Presented.pptx  
**Context:** NGO / Public Purpose — Multi-Platform App + Website  
**Deployment Target:** rasbros.com (Production) via GitHub  
**Date of Analysis:** June 2026  

---

## 1. What the PPT Defines

The presentation is a **conceptual design document** (not a technical spec) outlining a multi-platform healthcare application called *Ayushpathi*, purpose-built for the AYUSH ecosystem — Ayurveda, Yoga & Naturopathy, Unani, Siddha, and Homeopathy.

### Core Ambition
> "Build an innovative platform to bring all Doctors, Patients, Treatments, and Medicines together to make the Indian healthcare industry more transparent, and provide clinical evidence needed to help unpack the forgotten traditional Indian medicine."

This is essentially a **healthcare SaaS platform** for public/NGO use — comparable in scope to a stripped-down Practo or Healthifyme, but AYUSH-specific and fully custom-built.

---

## 2. Scope Inventory (from PPT)

### Master Data Entities (6 core)
| Entity | Notes |
|---|---|
| Address | Linked to all entities; lat/long + API integration planned |
| Patient | PII-sensitive; owner of own health history |
| Doctor | Linked to hospitals (M:M); degrees, specialization |
| Hospital | Multi-doctor, multi-patient |
| Store | Medicine retail point |
| Product (Medicine) | Linked to stores; UoM-aware |

### Key Relationships (complex)
- Hospital ↔ Doctor: Many-to-Many
- Hospital ↔ Patient: Many-to-One (mandatory)
- Doctor ↔ Patient: Optional relationship
- Patient ↔ Patient: Family linking (optional)
- Store ↔ Product: Many-to-Many

### Functional Modules (defined)
1. **Registration & Onboarding** — all 6 entities with relationship wiring
2. **Appointment Booking** — search by location, calendar integration, slot management
3. **Doctor-Patient Consultation** — health data capture, diagnosis, test results, prescription
4. **Dashboard & Reporting** — hospital-level, doctor-level, patient-level views
5. **Role-Based Access Control** — 5 roles across 2 tiers (hospital-level + patient-level)

### Functional Modules (TBC / Future)
6. **Digital Health History** — allergies, illnesses, symptoms, templates, scanner integration
7. **Inventory Management** — medicine stock
8. **Financial Transactions** — procurement payments
9. **ML/AI Analytics** — seasonal illness patterns, preventive insights
10. **Country-Specific Customization** — global rollout potential

---

## 3. Gaps in the Current Design

These are critical open items that must be resolved before any build starts:

| Gap | Slide Reference | Risk Level |
|---|---|---|
| Doctor & Patient data models are "TBC" | Slide 8 | **High** — schema undecided |
| Product/Medicine data model is "TBC" | Slide 8 | **High** |
| Doctor registration authentication process is "under discussion" | Slide 8 | **High** — regulatory & fraud risk |
| Dashboard metrics not finalized | Slide 10 | Medium |
| Roles & Authorization are "TBC" | Slide 11 | **High** — entire access model incomplete |
| No UI/UX wireframes included | — | **High** — design has zero screen mockups |
| No API design / integration specs | — | High |
| No database schema diagrams | — | Medium |
| Address API source not specified (country-specific) | Slide 9 | Medium |
| Calendar integration target unspecified (Google? custom?) | Slide 9 | Medium |
| Consent/communication preferences (SMS, WhatsApp, Email) — no implementation detail | Slide 7 | Medium |
| PII / Data security approach not specified | Slide 13 (mentioned) | **High** — legal/compliance critical |

---

## 4. Complexity Assessment

### Overall Verdict: **High Complexity — Enterprise-Grade Healthcare Platform**

This is not a simple website or brochure app. It is a full multi-tenant, multi-role, multi-module healthcare platform. Comparable projects (Practo, 1mg, eSanjeevani) had teams of 20–50 engineers and 18–36 months for MVP.

For a lean NGO team with the right tooling, a disciplined phased approach can reduce this — but complexity cannot be wished away.

---

### Complexity Breakdown by Dimension

#### 4.1 Data Model — **High**
- 6 master entities with cross-linked M:M relationships
- PII-sensitive data (patient health records) requires encryption at rest and in transit
- Address normalization + lat/long introduces a geocoding dependency
- Family linking (Patient-to-Patient) adds graph-like complexity to queries
- Medicine catalog with unit-of-measure variations is non-trivial

#### 4.2 Authentication & Authorization — **High**
- 5 distinct roles: Ayushpathi Admin, Hospital Admin, Receptionist, Doctor, Patient
- Multi-tenant: a user's permissions are scoped to their hospital context
- Patient is their own data owner — special access semantics
- Doctor registration needs verification (medical degree, license) — a compliance workflow, not just a form
- This alone is a 3–4 week build for a single developer

#### 4.3 Appointment & Calendar System — **Medium-High**
- Real-time availability: slot reservation, conflict prevention
- Calendar sync (Google Calendar / custom) adds an external API dependency
- "Near me" doctor search requires geospatial queries (PostGIS or equivalent)
- Concurrent booking conflicts (race conditions) need careful handling

#### 4.4 Prescription & Clinical Data — **High**
- Structured prescription format (tabular, repetitive medicine sets)
- Immutable audit trail (timestamp + user ID) — append-only records
- Attach test results (file upload, scanner integration is future scope)
- This is regulated data in India under the IT Act and MoHFW guidelines

#### 4.5 Dashboard & Reporting — **Medium**
- 3 dashboard types (hospital, doctor, patient)
- Aggregations across time periods (daily, weekly, monthly, quarterly, annual)
- Performance tables (top doctors, top hospitals) imply ranked queries
- Finance module gates some reports — phased reveal needed

#### 4.6 Mobile App — **Medium-High** (additional to website)
- "Multi-platform" implies iOS + Android + Web
- Recommended approach: React Native or Flutter for shared codebase
- Push notifications (appointment reminders, prescription updates)
- Offline capability for rural/low-connectivity areas (not mentioned but critical for India)

#### 4.7 ML/AI Layer — **Very High** (future scope)
- Seasonal illness prediction requires labelled clinical data at scale
- This is a Phase 3+ deliverable — cannot be meaningfully scoped until data accumulates
- Not a build concern right now; flag it as a future phase

---

## 5. Technical Architecture (Recommended Approach)

Given NGO context, open-source stack, and rasbros.com deployment:

### Suggested Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Frontend Web** | React (Next.js) | SSR for SEO, strong ecosystem, deployable anywhere |
| **Mobile App** | React Native | Code sharing with React web, single JS team |
| **Backend API** | Node.js (Express/Fastify) or Python (FastAPI) | REST + WebSocket for real-time features |
| **Database** | PostgreSQL + PostGIS | Relational + geospatial for "near me" search |
| **Auth** | Auth0 (free tier) or Supabase Auth | RBAC, multi-tenant, HIPAA-ready options |
| **File Storage** | Cloudinary or AWS S3 (free tier) | Test results, profile photos |
| **Calendar** | Google Calendar API | Doctor availability sync |
| **Address API** | India Post API / MapMyIndia | Country-specific address validation |
| **CI/CD** | GitHub Actions | Auto-deploy to rasbros.com on merge |
| **Hosting** | rasbros.com (VPS / cPanel) | Production; Node.js app + PostgreSQL |

### Deployment Architecture (rasbros.com)
```
GitHub (source) 
    → GitHub Actions (CI/CD pipeline)
        → Build & test
        → Deploy to rasbros.com via SSH/FTP
            → Web app (Next.js / Node.js)
            → PostgreSQL database
            → File storage (local or S3)
```

For mobile:
- Android: Google Play Store (free for NGO)
- iOS: Apple Developer Program ($99/yr — consider NGO waiver)

---

## 6. Phased Build Recommendation

Given the scale, a phased delivery is essential. Do not try to build everything at once.

### Phase 1 — Foundation (Months 1–4) — MVP
- [ ] Core data model: Address, Patient, Doctor, Hospital
- [ ] User registration & authentication (all 5 roles)
- [ ] Doctor-Hospital relationship management
- [ ] Patient registration & profile
- [ ] Basic appointment booking (no calendar sync yet)
- [ ] Doctor consultation: health capture + basic prescription
- [ ] Web app only (mobile deferred)
- **Deliverable:** Working web app on rasbros.com (staging)

### Phase 2 — Enrichment (Months 5–8)
- [ ] Calendar integration (Google Calendar sync)
- [ ] "Near me" doctor search (geospatial)
- [ ] Full RBAC enforcement
- [ ] Patient health history (allergies, illnesses, symptoms)
- [ ] Hospital & Doctor dashboards
- [ ] Patient dashboard
- [ ] React Native mobile app (Android first)
- **Deliverable:** Public beta on rasbros.com + Android app

### Phase 3 — Advanced (Months 9–14)
- [ ] Store & Medicine catalog
- [ ] Inventory management
- [ ] Financial transactions
- [ ] Scanner/file attachment for test results
- [ ] iOS app
- [ ] SMS/WhatsApp/Email notification system
- **Deliverable:** Full feature parity, production launch

### Phase 4 — Intelligence (Month 15+)
- [ ] Data analytics pipeline
- [ ] ML/AI seasonal illness insights
- [ ] Country-specific customization framework
- **Deliverable:** Insights platform, international expansion readiness

---

## 7. Key Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Doctor verification / credential fraud | Critical | Partner with NMC/AYUSH Ministry API or manual review process |
| Patient PII & health data breach | Critical | Encryption at rest + in transit, DPDP Act (India 2023) compliance |
| Data model TBCs delay everything | High | Workshop to finalize schemas before any code |
| No UI/UX wireframes | High | Design sprint (Figma) before frontend build |
| Calendar sync conflicts | Medium | Optimistic locking + idempotent booking APIs |
| Low-connectivity users in rural India | Medium | PWA offline mode + lightweight data payloads |
| Single developer bottleneck | High | Modular architecture so contributors can work in parallel |
| rasbros.com hosting limitations | Medium | Confirm VPS specs (RAM, storage, DB support) before build starts |

---

## 8. What's Good About This Design

- **Vision is clear and differentiated** — AYUSH-specific, not generic healthcare
- **Entity-relationship thinking is solid** — the core 6-entity model is clean and extensible
- **Roles are well-scoped** — 5 roles covering all user types without over-complication
- **Phased thinking already present** — "TBC" items and "After workshops" language shows awareness of iterative delivery
- **Patient data ownership is explicitly stated** — good privacy-first principle
- **Geospatial search included** — "near me" is critical for India's healthcare access problem
- **Agile delivery mindset** — "List will grow after workshops with doctors" shows openness to discovery

---

## 9. Immediate Next Steps (Pre-Build)

Before any code is written, these must be completed:

1. **Data Model Workshop** — finalize Patient, Doctor, Product schemas (the 3 TBC models)
2. **UI/UX Wireframes** — at minimum: Registration, Appointment Booking, Consultation, and Dashboard screens
3. **Role & Permission Matrix** — document exactly what each role can read/write/delete
4. **Doctor Verification Flow** — decide: manual review, government API, or document upload
5. **DPDP Act compliance check** — India's Digital Personal Data Protection Act 2023 applies to health data
6. **rasbros.com infrastructure audit** — confirm hosting can support Node.js + PostgreSQL + file storage
7. **GitHub repository setup** — monorepo (web + mobile + backend) with branching strategy

---

## 10. Summary

| Dimension | Assessment |
|---|---|
| **Vision** | Excellent — clear, purposeful, differentiated |
| **Design Completeness** | ~40% — significant TBCs remain |
| **Technical Complexity** | High — enterprise healthcare platform |
| **Realistic MVP Timeline** | 4–6 months with a 2–3 person team |
| **Full Build Timeline** | 12–18 months to Phase 3 completion |
| **Team Size Needed** | Minimum: 1 backend, 1 frontend/mobile, 1 UX/design |
| **Deployment Feasibility on rasbros.com** | Yes — with VPS-level hosting confirmed |
| **NGO Viability** | Yes — open-source stack keeps costs near zero (infra + domain only) |

This is a **worthy, well-conceived project** that will genuinely serve the AYUSH community. The path forward is clear: resolve the TBCs, wireframe the key journeys, then build in disciplined phases. Don't attempt to build everything at once — Phase 1 alone will deliver immediate public value.
