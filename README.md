# Ayushpathi

> **Bringing Traditional Indian Medicine to the World**

Ayushpathi is an open-source, NGO-purpose healthcare platform for the AYUSH ecosystem — Ayurveda, Yoga & Naturopathy, Unani, Siddha, and Homeopathy.

---

## Stack

| Layer | Technology |
|---|---|
| Web App | Next.js 14 (App Router) + Tailwind CSS |
| Mobile App | React Native (Expo) — Phase 2 |
| Database | Supabase PostgreSQL + PostGIS (Mumbai `ap-south-1`) |
| Auth | Supabase Auth (RBAC) |
| File Storage | Supabase Storage |
| Address / Maps | MapMyIndia (Mappls) — India-first |
| Notifications | Gupshup (India-native WhatsApp Business API) |
| CI/CD | GitHub Actions → Vercel |
| Hosting | Vercel (frontend) + Supabase Mumbai (data) |
| Domain | rasbros.com |

---

## Monorepo Structure

```
ayushpathi-app/
├── apps/
│   ├── web/          # Next.js web app
│   └── mobile/       # React Native (Expo) — Android + iOS (Phase 2)
├── packages/
│   ├── db/           # Supabase schema migrations + generated types
│   ├── shared/       # Shared TypeScript types, constants, utilities
│   └── ui/           # Shared UI components (future)
├── docs/
│   ├── decisions/    # All architectural decisions (source of truth)
│   └── schema/       # ERD and schema diagrams
└── .github/
    └── workflows/    # CI/CD pipelines (SSH deploy — NOT Vercel)
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- pnpm 8+ (`npm install -g pnpm`)
- Supabase project in **`ap-south-1` (Mumbai)** — DPDP compliance
- India server: Mac Mini or DigitalOcean Bangalore `blr1`

### 1. Clone & install
```bash
git clone https://github.com/ShriniDhanaraj/ayushpathi-app.git
cd ayushpathi-app
pnpm install
```

### 2. Set up Supabase
1. Create a new project at [supabase.com](https://supabase.com) — **select `ap-south-1` (Mumbai)**
2. Run the migration: paste `packages/db/migrations/001_initial_schema.sql` into the Supabase SQL editor
3. Copy your project URL and anon key

### 3. Configure environment
```bash
cp apps/web/.env.example apps/web/.env.local
# Fill in Supabase URL, anon key, Mappls token
```

### 4. Run locally
```bash
pnpm web      # starts Next.js at http://localhost:3000
pnpm mobile   # starts Expo (scan QR with Expo Go app)
```

---

## India DPDP Act 2023 Compliance

All health data is classified as **Sensitive Personal Data** under India's DPDP Act 2023.

- Supabase hosted in **Mumbai (`ap-south-1`)** — zero data leaves India
- Mappls (MapMyIndia) — India-native, government-endorsed
- Gupshup — India-native WhatsApp provider
- Patient-owned consent model — revocable at any time
- Erasure, portability, audit trail baked into schema

---

## Architecture Decisions

All decisions documented in [`docs/decisions/AYUSHPATHI_Decisions_Log.md`](docs/decisions/AYUSHPATHI_Decisions_Log.md).

---

## Phases

| Phase | Scope | Status |
|---|---|---|
| 1 | Core entities, auth, appointments, consultation, consent, web app | 🔨 In progress |
| 2 | Calendar, geosearch, dashboards, Android app, teleconsultation | Planned |
| 3 | Medicine catalog, inventory, payments, iOS app | Planned |
| 4 | ML/AI insights, international expansion | Future |

---

## Licence

MIT — free to use, modify, and distribute.
