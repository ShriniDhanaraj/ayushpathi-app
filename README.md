# Ayushpathi

> **Bringing Traditional Indian Medicine to the World**

Ayushpathi is an open-source, NGO-purpose healthcare platform for the AYUSH ecosystem — Ayurveda, Yoga & Naturopathy, Unani, Siddha, and Homeopathy.

---

## Stack

| Layer | Technology |
|---|---|
| Web App | Next.js 14 (App Router) + Tailwind CSS |
| Mobile App | React Native (Expo) |
| Database | Supabase (PostgreSQL + PostGIS) |
| Auth | Supabase Auth (RBAC) |
| File Storage | Supabase Storage |
| Address | Google Maps API |
| Notifications | Twilio WhatsApp Business API |
| CI/CD | GitHub Actions → Vercel |
| Domain | rasbros.com |

---

## Monorepo Structure

```
ayushpathi-app/
├── apps/
│   ├── web/          # Next.js web app
│   └── mobile/       # React Native (Expo) — Android + iOS
├── packages/
│   ├── db/           # Supabase schema migrations + generated types
│   ├── shared/       # Shared TypeScript types, constants, utilities
│   └── ui/           # Shared UI components (future)
├── docs/
│   ├── decisions/    # All architectural decisions (source of truth)
│   └── schema/       # ERD and schema diagrams
└── .github/
    └── workflows/    # CI/CD pipelines
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- pnpm 8+ (`npm install -g pnpm`)
- Supabase account (free tier)
- Vercel account (free tier)

### 1. Clone & install
```bash
git clone https://github.com/ShriniDhanaraj/ayushpathi-app.git
cd ayushpathi-app
pnpm install
```

### 2. Set up Supabase
1. Create a new project at [supabase.com](https://supabase.com)
2. Run the migration: paste `packages/db/migrations/001_initial_schema.sql` into the Supabase SQL editor
3. Copy your project URL and anon key

### 3. Configure environment
```bash
cp apps/web/.env.example apps/web/.env.local
# Fill in your Supabase URL, anon key, and Google Maps API key
```

### 4. Run locally
```bash
pnpm web      # starts Next.js at http://localhost:3000
pnpm mobile   # starts Expo (scan QR with Expo Go app)
```

---

## Architecture Decisions

All decisions are documented in [`docs/decisions/AYUSHPATHI_Decisions_Log.md`](docs/decisions/AYUSHPATHI_Decisions_Log.md).

Key principles:
- **Patient owns their data** — consent-gated access, revocable at any time
- **Full audit trail** — every medical record write is logged
- **Zero vendor lock-in** — standard PostgreSQL, exportable anytime
- **NGO-first cost model** — free tiers wherever possible

---

## Phases

| Phase | Scope | Status |
|---|---|---|
| 1 | Core entities, auth, appointments, consultation, web app | 🔨 In progress |
| 2 | Calendar, geosearch, dashboards, Android app, teleconsultation | Planned |
| 3 | Medicine catalog, inventory, payments, iOS app | Planned |
| 4 | ML/AI insights, international expansion | Future |

---

## Contributing

This is a one-team NGO project. Please raise issues for bugs or feature suggestions.

---

## Licence

MIT — free to use, modify, and distribute.
