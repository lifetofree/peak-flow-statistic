# PeakFlowStat — Project Context

## Project Overview

PeakFlowStat is a **mobile-first** web application for asthma patients to track peak flow measurements. Users access their personal dashboard via a unique short link — no login required. The interface is in Thai (Buddhist Era dates). Administrative features are accessible at `/admin` (no authentication — open-access by design) to manage users and audit all data changes.

### Key Features

- **Patient Dashboard:** Shows user name and recent entries. Supports **card view** (10 entries/page) and **list view** (80 entries/page). Charts and zone badges are NOT rendered — entry cards show raw readings only.
- **Date Filtering:** User dashboard and admin user detail support `from`/`to` date range filtering. CSV export respects date filters.
- **Easy Entry Form:** Records 3 peak flow readings, SpO₂, medication timing (`before`/`after`), and period (`morning`/`evening`). Toggle buttons with gray background. SpO₂ and medication timing are on the same row (mobile-optimised).
- **Rich Text Notes:** Patient entry notes and admin notes use a WYSIWYG editor (`RichTextEditor.tsx`, powered by `react-quill`). HTML content sanitised with DOMPurify before rendering.
- **Admin Panel:** Directly accessible at `/admin`. Create/edit users, set personal best, edit/delete entries. Create user form includes a cancel button.
- **Data Export:** CSV export per user (admin side) and per user token (patient side). Optional date filter.
- **Audit Logging:** All CREATE/UPDATE/DELETE operations on `User` and `Entry` write an append-only `AuditLog` record inline in the route handler.
- **Short Links:** Each user has an 8-char cryptographically random `shortCode` (4 random bytes → hex via `crypto.getRandomValues`). `/s/:code` on the worker performs a 302 redirect to the absolute frontend URL and increments `clickCount`. Click counts stored in DB but **not displayed** in the UI.
- **Share Link UI:** Admin can view/copy the short URL and see a QR code in the user detail view. Copy button per row in the user list. Native share button removed.
- **Localisation:** Thai only (`th.json`). All UI strings via `useTranslation`. No raw Thai text in source files.

### Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 (TypeScript), Vite, React Router v6, TanStack Query v5, Tailwind CSS v3 |
| Frontend extras | react-i18next, react-quill, react-markdown, DOMPurify, qrcode.react, recharts, lucide-react |
| Backend | Hono.js on Cloudflare Workers |
| Database | Cloudflare D1 (SQLite) via `DatabaseClient` wrapper |
| Validation | Zod + `@hono/zod-validator` |
| Testing | Vitest (frontend + backend) |
| Deployment | Cloudflare Pages (frontend) + Cloudflare Workers (backend) |

> ⚠️ There is **no Docker Compose**, **no MongoDB**, and **no Express/Node.js server** in this project. The stack is entirely Cloudflare.

---

## File & Folder Structure

```
PeakFlowStat/
├── frontend/
│   ├── public/
│   │   └── _redirects              # Forwards /s/* to worker
│   └── src/
│       ├── __tests__/
│       │   ├── date.test.ts
│       │   ├── types.test.ts
│       │   └── zone.test.ts
│       ├── api/
│       │   ├── admin.tsx            # Admin API functions
│       │   ├── client.ts            # Base fetch wrapper + authHeaders()
│       │   └── user.ts              # User-facing API functions
│       ├── components/
│       │   ├── admin/
│       │   │   ├── NoteModal.tsx
│       │   │   ├── UserAdminNote.tsx
│       │   │   ├── UserEntriesTable.tsx
│       │   │   ├── UserProfile.tsx
│       │   │   └── UserShareLink.tsx
│       │   ├── user/
│       │   │   ├── EntriesCardView.tsx
│       │   │   ├── EntriesListView.tsx
│       │   │   ├── UserNoteModal.tsx
│       │   │   └── ViewModeToggle.tsx
│       │   ├── DateFilter.tsx
│       │   ├── EntryCard.tsx        # Entry card with 60-char note preview + show more/less
│       │   ├── EntryForm.tsx        # New entry form
│       │   ├── PeakFlowChart.tsx    # Exists but NOT rendered
│       │   ├── PeakFlowTable.tsx    # Shared table used by admin and user list view
│       │   ├── RichTextEditor.tsx   # WYSIWYG editor (react-quill)
│       │   ├── ShareLinkCard.tsx    # QR + copy link (admin user detail)
│       │   ├── SpO2Chart.tsx        # Exists but NOT rendered
│       │   ├── TimeRangeSelector.tsx# Exists but NOT rendered
│       │   └── ZoneBadge.tsx        # Exists but NOT rendered
│       ├── constants/
│       │   └── validation.ts        # PEAK_FLOW_MIN/MAX, SPO2_MIN/MAX, PERSONAL_BEST_MIN/MAX, PAGE_SIZE
│       ├── i18n/
│       │   ├── index.ts
│       │   └── th.json
│       ├── pages/
│       │   ├── AdminAuditLog.tsx
│       │   ├── AdminDashboard.tsx
│       │   ├── AdminLogin.tsx       # Exists but login is bypassed (open-access)
│       │   ├── AdminUserDetail.tsx
│       │   ├── EntryHistory.tsx
│       │   ├── NewEntry.tsx
│       │   └── UserDashboard.tsx
│       ├── types/
│       │   ├── index.ts
│       │   └── rehype-sanitize.d.ts
│       ├── utils/
│       │   ├── date.ts              # Thai B.E. date formatting
│       │   ├── entryGrouping.ts     # Groups entries by date x period x medication
│       │   └── zone.ts              # Zone calculation (mirrors worker/src/routes/zone.ts)
│       └── App.tsx
├── worker/
│   ├── migrations/
│   │   ├── 0001_schema.sql          # Full schema (users, entries, audit_logs)
│   │   ├── 0002_seed.sql
│   │   └── 0003_add_medication_time.sql
│   └── src/
│       ├── __tests__/
│       │   ├── database-validation.test.ts
│       │   ├── schemas.test.ts
│       │   └── zone.test.ts
│       ├── index.ts                 # Hono app entry, CORS, route mounting
│       ├── lib/
│       │   └── database.ts          # DatabaseClient with SQL-injection allowlists
│       └── routes/
│           ├── admin/
│           │   ├── audit.ts         # GET /api/admin/audit
│           │   ├── entries.ts       # GET/PATCH/DELETE /api/admin/entries[/:id]
│           │   ├── index.ts         # Aggregates users + entries + audit routes
│           │   ├── types.ts         # DatabaseRecord, UserRecord, EntryRecord, AuditLogRecord, Formatted* types
│           │   └── users.ts         # CRUD /api/admin/users[/:id[/note|/export]]
│           ├── admin.ts             # Re-exports admin/index (legacy shim)
│           ├── health.ts            # GET /api/health
│           ├── jwt.ts               # JWT utilities (reserved, not enforced)
│           ├── redirect.ts          # GET /s/:code -> 302
│           ├── user.ts              # GET/POST /api/u/:token[/entries|/export]
│           └── zone.ts              # calculateZone(), getBestReading()
├── AGENTS.md
├── BACKLOGS.md
├── CHANGELOGS.md
├── ENVIRONMENTS.md
├── GIT_COMMIT_REVIEW.md
└── ISSUETOFIX.md
```

---

## Frontend Routes (React Router v6)

| Path | Component | Description |
|------|-----------|-------------|
| `/` | — | Redirects to `/admin` |
| `/u/:token` | `UserDashboard` | User name + card/list view entries + add button |
| `/u/:token/new` | `NewEntry` | Entry form |
| `/u/:token/entries` | `EntryHistory` | Full paginated entry history |
| `/admin` | `AdminDashboard` | User list + search + create user (with cancel) + copy link per row |
| `/admin/users/:id` | `AdminUserDetail` | Entries (editable), admin note, QR share card, export |
| `/admin/audit` | `AdminAuditLog` | Paginated audit log |
| `*` | — | 404 not found |

> `/s/:code` is **not** a React route. `frontend/public/_redirects` forwards `/s/*` to `https://api.peakflowstat.allergyclinic.cc/s/:splat 302`, which looks up the user and redirects to `https://peakflowstat.allergyclinic.cc/u/:shortToken`.

---

## Data Models (D1 / SQLite)

### `users` table

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT (UUID v4) | Primary key |
| `first_name` | TEXT | |
| `last_name` | TEXT | |
| `nickname` | TEXT | |
| `short_token` | TEXT (UUID v4) | Unique — used in `/u/:token` dashboard URL |
| `short_code` | TEXT (8-char hex) | Unique — `crypto.getRandomValues`, used in `/s/:code` |
| `click_count` | INTEGER | Incremented on each `/s/:code` hit; not shown in UI |
| `personal_best` | INTEGER or NULL | L/min, set by admin |
| `admin_note` | TEXT | Rich-text HTML |
| `deleted_at` | TEXT or NULL | ISO timestamp; NULL = active (soft-delete only) |
| `created_at` / `updated_at` | TEXT | ISO 8601 timestamps |

### `entries` table

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT (UUID v4) | Primary key |
| `user_id` | TEXT | FK -> users.id (CASCADE DELETE) |
| `date` | TEXT | `YYYY-MM-DD` |
| `period` | TEXT | `'morning'` or `'evening'` |
| `peak_flow_readings` | TEXT | JSON array `[n, n, n]` |
| `peak_flow` | INTEGER | `max(peak_flow_readings)` — derived, stored for fast queries |
| `spo2` | INTEGER | 70–100 |
| `medication_timing` | TEXT | `'before'` or `'after'` |
| `note` | TEXT | Rich-text HTML |
| `created_at` / `updated_at` | TEXT | ISO 8601 timestamps |

### `audit_logs` table — append-only

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT (UUID v4) | Primary key |
| `admin_id` | TEXT | Hardcoded `'admin'` (no real auth) |
| `target_id` | TEXT | Affected User or Entry id |
| `target_model` | TEXT | `'User'` or `'Entry'` |
| `action` | TEXT | `'CREATE'`, `'UPDATE'`, or `'DELETE'` |
| `diff` | TEXT | JSON string `{ before, after }` |
| `timestamp` | TEXT | ISO 8601 timestamp |

> **Never UPDATE or DELETE audit_log rows.**

---

## API Endpoints

### Short-link redirect (not under `/api`)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/s/:code` | Find user by `shortCode`, increment `clickCount`, `302` to `$FRONTEND_URL/u/:shortToken`. Unknown code -> `302 /`. |

### Health

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | `{ status: 'ok', db: 'connected' }` |

### User routes — require valid `shortToken` via `validateShortLink` middleware

| Method | Path | Query params | Description |
|--------|------|-------------|-------------|
| `GET` | `/api/u/:token` | — | Profile: `_id`, `firstName`, `lastName`, `nickname`, `personalBest` |
| `GET` | `/api/u/:token/entries` | `page`, `pageSize` (0=all), `from`, `to` | Paginated entries with zone |
| `POST` | `/api/u/:token/entries` | — | Create entry (Zod validated) |
| `GET` | `/api/u/:token/export` | `from`, `to` | CSV download |

### Admin — User management

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/users` | List users, `?q=` search, 20/page |
| `POST` | `/api/admin/users` | Create user + generate `shortToken` + `shortCode` + write AuditLog |
| `GET` | `/api/admin/users/:id` | Single user |
| `PATCH` | `/api/admin/users/:id` | Edit `firstName`, `lastName`, `nickname`, `personalBest` + AuditLog |
| `DELETE` | `/api/admin/users/:id` | Soft-delete (set `deleted_at`) + AuditLog |
| `PATCH` | `/api/admin/users/:id/note` | Update `adminNote` (Zod: max 5000 chars) + AuditLog |
| `POST` | `/api/admin/users/:id/rotate-token` | Regenerate `shortToken` — **endpoint exists, UI button removed** |
| `GET` | `/api/admin/users/:id/export` | CSV download, `?from=&to=` |

### Admin — Entry management

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/entries` | Paginated, `?userId=&from=&to=&page=&pageSize=` |
| `PATCH` | `/api/admin/entries/:id` | Edit entry fields + AuditLog |
| `DELETE` | `/api/admin/entries/:id` | Hard-delete entry + AuditLog |

### Admin — Audit log

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/audit` | Paginated, `?userId=&action=&page=` (20/page) |

---

## Entry API Response Shape

Both user and admin entry endpoints return entries wrapped with zone:

```json
{
  "entries": [
    {
      "entry": {
        "_id": "...",
        "userId": "...",
        "date": "2026-04-13",
        "peakFlowReadings": [420, 430, 425],
        "spO2": 98,
        "medicationTiming": "before",
        "period": "morning",
        "note": "<p>...</p>",
        "createdAt": "...",
        "updatedAt": "..."
      },
      "zone": { "zone": "green", "percentage": 94 }
    }
  ],
  "total": 42,
  "page": 1,
  "pageSize": 20
}
```

`zone` is `null` when the user has no `personalBest` set.

---

## Input Validation

Constants in `frontend/src/constants/validation.ts` and Zod schemas in worker routes — **must stay in sync**.

| Field | Min | Max | Unit | Notes |
|-------|-----|-----|------|-------|
| Peak Flow (each reading) | 50 | 900 | L/min | 3 readings, each `.int().min(50).max(900)` |
| SpO2 | 70 | 100 | % | Integer only |
| Personal Best | 50 | 900 | L/min | Admin-only |
| Date | — | today | — | No future dates |
| Period | — | — | — | Enum: `'morning'` or `'evening'` |
| Medication timing | — | — | — | Enum: `'before'` or `'after'` |
| Admin note | — | 5000 chars | — | Zod `.string().max(5000)` |

> Validation constants are intentionally duplicated between frontend and backend (no shared package). Keep both in sync when updating.

---

## Peak Flow Zones

Calculated from `max(peakFlowReadings)` vs user's `personalBest`. Logic in `frontend/src/utils/zone.ts` and `worker/src/routes/zone.ts` — must stay in sync.

| Zone | Range | Colour |
|------|-------|--------|
| Green | >= 80% of personal best | `#22c55e` |
| Yellow | 50–79% | `#eab308` |
| Red | < 50% | `#ef4444` |

- Zone data is **returned by the API** but **not displayed** in the current UI (`ZoneBadge` exists and is unused).
- If `personalBest` is `null`, zone is `null` and a notice is shown to contact their doctor.

---

## Pagination

All list endpoints use backend pagination. **Never fetch all records and paginate client-side.**

| View | Endpoint | Default pageSize |
|------|----------|-----------------|
| User Dashboard — Card View | `/api/u/:token/entries` | 10 |
| User Dashboard — List View | `/api/u/:token/entries` | 80 |
| Entry History page | `/api/u/:token/entries` | 20 |
| Admin User Detail | `/api/admin/entries` | 80 |
| Admin Entries list | `/api/admin/entries` | 20 |
| Admin User list | `/api/admin/users` | 20 |
| Admin Audit Log | `/api/admin/audit` | 20 |

`pageSize=0` fetches all records (no LIMIT/OFFSET applied).

---

## DatabaseClient (`worker/src/lib/database.ts`)

Thin wrapper around D1 with SQL-injection prevention via allowlists.

- **`ALLOWED_TABLES`**: `users`, `entries`, `audit_logs`
- **`ALLOWED_COLUMNS`**: all schema columns
- **`ALLOWED_ORDER_COLUMNS`**: safe subset for ORDER BY
- **Filter operators**: exact match, `IS NULL`, `$gte`/`$lte` range, `IN (...)`, `LIKE`
- Methods: `find`, `findOne`, `count`, `insertOne`, `updateOne`, `deleteOne`

---

## Security

| Concern | Status |
|---------|--------|
| Admin authentication | **None by design** — open-access. `authHeaders()` in `client.ts` sends a token but no backend middleware validates it. |
| User authentication | Token-based via `shortToken` (UUID v4). `validateShortLink` middleware rejects unknown/soft-deleted tokens with 404. |
| Rich text rendering | All HTML sanitised with DOMPurify before display. |
| SQL injection | Prevented via table/column/order-column allowlists in `DatabaseClient`. Parameterised queries throughout. |
| CORS | Restricted to `CORS_ORIGIN` env var (comma-separated list). |
| User deletion | Soft-delete only (`deleted_at`). Hard-delete requires direct DB access. |
| AuditLog | Append-only — no UPDATE/DELETE allowed on `audit_logs`. |
| Short codes | Generated with `crypto.getRandomValues` (cryptographically secure 8-char hex). |
| HTTPS | Required in production. `FRONTEND_URL` must use `https://`. |
| `www.` subdomain | Do NOT use `www.peakflowstat.allergyclinic.cc` — third-level subdomains are not covered by Cloudflare Universal SSL. |

---

## Development Conventions

- **Language:** TypeScript strict mode throughout. No `any`.
- **Naming:** `camelCase` variables/functions, `PascalCase` components/types, `UPPER_SNAKE_CASE` constants.
- **Styling:** Tailwind CSS, mobile-first (`sm:` -> `md:` -> `lg:`). Font: `"Sarabun"` from Google Fonts.
- **Localisation:** All UI strings in `frontend/src/i18n/th.json`. No raw Thai text in `.tsx`/`.ts`.
- **Date display:** Thai Buddhist Era (`DD/MM/YYYY+543`) via `formatThaiDate()` in `utils/date.ts`. Never inline date logic.
- **Date storage:** ISO 8601 strings in all DB columns (`created_at`, `updated_at`, `timestamp`).
- **Data fetching:** TanStack Query only. No `useEffect` + `fetch` for loading data.
- **Error shape (API):** `{ error: string, code?: string }` with standard HTTP status codes.
- **Error display (frontend):** TanStack Query error states with Thai-localised messages.
- **Comments:** JSDoc for non-obvious logic only.
- **Component size:** Keep under 300 lines. Extract reusable components.
- **Business logic:** Currently inline in route handlers (known tech debt — should move to a service layer).

---

## Testing

- **Framework:** Vitest for both frontend and backend.
- **Backend tests** (`worker/src/__tests__/`): zone calculation, Zod schema validation, `DatabaseClient` allowlist enforcement.
- **Frontend tests** (`frontend/src/__tests__/`): Thai B.E. date formatting, zone calculation, type guards.
- Run: `npm test` from `frontend/` or `worker/`.

---

## Environments

| Environment | Frontend URL | API URL | Config Files |
|-------------|-------------|---------|--------------|
| Local | `http://localhost:5173` | `http://localhost:8787` | `.env.development`, `wrangler.dev.toml`, `.dev.vars` |
| Staging | `https://staging.peakflowstat.allergyclinic.cc` | `https://api-staging.peakflowstat.allergyclinic.cc` | `.env.staging`, `wrangler.staging.toml` |
| Production | `https://peakflowstat.allergyclinic.cc` | `https://api.peakflowstat.allergyclinic.cc` | `.env.production`, `wrangler.toml` |

### Common Commands

```bash
# Frontend
cd frontend && npm run dev              # local (uses .env.development)
cd frontend && npm run build:staging    # staging build
cd frontend && npm run build            # production build

# Worker
cd worker && npm run dev                # local (uses wrangler.dev.toml)
cd worker && npm run deploy:staging     # staging
cd worker && npm run deploy             # production
```

### Key Config Files

| File | Purpose |
|------|---------|
| `frontend/public/_redirects` | `/s/* https://api.peakflowstat.allergyclinic.cc/s/:splat 302` |
| `worker/wrangler.toml` | Production worker: `DB` binding, `CORS_ORIGIN`, `FRONTEND_URL` |
| `worker/wrangler.dev.toml` | Local dev worker config |
| `worker/wrangler.staging.toml` | Staging worker config |
| `frontend/.env.development` | `VITE_API_URL=http://localhost:8787/api` |
| `frontend/.env.production` | `VITE_API_URL=https://api.peakflowstat.allergyclinic.cc/api` |
| `worker/.dev.vars` | `JWT_SECRET`, `CORS_ORIGIN`, `FRONTEND_URL` for local dev |

> Do NOT connect the Cloudflare Pages project to GitLab CI/CD — `worker/wrangler.toml` in the repo root causes the Pages build pipeline to run `npx wrangler deploy` instead of `npm run build`.

---

## Constraints — Do NOT

- Do NOT use Docker Compose, MongoDB, or Express — this is a Cloudflare-only stack.
- Do NOT use `_id` as the short link token — always use `shortToken` (UUID v4).
- Do NOT render raw HTML without DOMPurify sanitisation.
- Do NOT hardcode Thai strings in source code — use i18n keys.
- Do NOT use `any` in TypeScript.
- Do NOT UPDATE or DELETE `audit_logs` records.
- Do NOT use `useEffect` + `fetch` for data loading — use TanStack Query.
- Do NOT paginate client-side — always use backend pagination with `page`/`pageSize`.
- Do NOT use `www.peakflowstat.allergyclinic.cc` — not covered by Cloudflare Universal SSL.
- Do NOT re-add zone display to entry cards or dashboard without restoring `ZoneBadge` rendering — zone data is returned by the API and can be shown in future.
- Do NOT create monolithic components (>300 lines) — extract reusable pieces.
- Do NOT connect Cloudflare Pages to GitLab CI/CD (see above).
- Do NOT put business logic in route handlers — move to a service layer (known tech debt).

---

## Building and Running

```bash
# Frontend (dev)
cd frontend && npm install && npm run dev

# Worker backend (dev)
cd worker && npm install && npm run dev

# Run tests
cd frontend && npm test    # Vitest (24 tests)
cd worker && npm test      # Vitest (32 tests)
```

---

## Cloudflare Deployment

In addition to Docker Compose deployment, the project supports **serverless deployment** on Cloudflare with **D1 database** (SQLite).

### Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│   Cloudflare    │────▶│  Cloudflare      │────▶│ Cloudflare  │
│   Pages         │     │  Workers         │     │ D1          │
│   (Frontend)    │◄────│  (Backend API)   │◄────│ (SQLite)    │
└─────────────────┘     └──────────────────┘     └─────────────┘
   Vite + React              Hono.js
```

### Deployed URLs

| Service | URL |
|---------|-----|
| **Frontend** | https://peakflowstat.allergyclinic.cc |
| **Backend API** | https://api.peakflowstat.allergyclinic.cc |
| **Admin Panel** | https://peakflowstat.allergyclinic.cc/admin |

### Why Cloudflare?

- **Pages**: Fast static site hosting with global CDN
- **Workers**: Serverless compute at the edge (low latency)
- **D1**: SQLite database with native Workers integration
- **Cost**: Free tier covers most use cases

### Backend Changes (Hono.js + D1)

The Cloudflare backend is in `/worker/` directory with:
- **Framework**: Hono.js (Express-like, Workers-compatible)
- **Database**: D1 client (SQLite) instead of MongoDB
- **Schema**: SQL tables matching original document structure

### Database Schema (D1/SQLite)

See `worker/migrations/0001_schema.sql` for the current schema. Tables: `users`, `entries`, `audit_logs`.

### Deployment Configuration

**Worker - Production (`worker/wrangler.toml`)**
```toml
name = "peakflowstat-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[vars]
ENVIRONMENT = "production"
CORS_ORIGIN = "https://peakflowstat.allergyclinic.cc"
FRONTEND_URL = "https://peakflowstat.allergyclinic.cc"

[[d1_databases]]
binding = "DB"
database_name = "peakflowstat-db"
database_id = "812f290e-51dc-433b-a2d8-4156dadd72d0"

[[routes]]
pattern = "api.peakflowstat.allergyclinic.cc"
custom_domain = true
```

**Worker - Staging (`worker/wrangler.staging.toml`)**
```toml
name = "peakflowstat-api-staging"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[vars]
ENVIRONMENT = "staging"
CORS_ORIGIN = "https://staging.peakflowstat.allergyclinic.cc"
FRONTEND_URL = "https://staging.peakflowstat.allergyclinic.cc"

[[d1_databases]]
binding = "DB"
database_name = "peakflowstat-db-staging"
database_id = "YOUR_STAGING_DATABASE_ID"

[[routes]]
pattern = "api-staging.peakflowstat.allergyclinic.cc"
```

**Worker - Development (`worker/wrangler.dev.toml`)**
```toml
name = "peakflowstat-api-dev"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[vars]
ENVIRONMENT = "development"
CORS_ORIGIN = "http://localhost:5173"
FRONTEND_URL = "http://localhost:5173"

[[d1_databases]]
binding = "DB"
database_name = "peakflowstat-db-dev"
database_id = "YOUR_DEV_DATABASE_ID"

[[routes]]
pattern = "api.dev.peakflowstat.allergyclinic.cc"
```

**Frontend (`frontend/public/_redirects`)**
```
/s/* https://api.peakflowstat.allergyclinic.cc/s/:splat 302
```

**Frontend - Production (`frontend/.env.production`)**
```
VITE_API_URL=https://api.peakflowstat.allergyclinic.cc/api
```

**Frontend - Staging (`frontend/.env.staging`)**
```
VITE_API_URL=https://api-staging.peakflowstat.allergyclinic.cc/api
```

**Frontend - Development (`frontend/.env.development`)**
```
VITE_API_URL=http://localhost:8787/api
```

### Deployment Steps

#### Worker (manual via CLI)
```bash
cd worker

# 1. Create D1 database
npx wrangler d1 create peakflowstat-db

# 2. Apply schema
npx wrangler d1 execute peakflowstat-db --file=./migrations/0001_schema.sql --remote

# 3. Deploy worker
npx wrangler deploy
```

#### Frontend (Cloudflare Pages via CLI)
```bash
cd frontend
npm run build
npx wrangler pages deploy dist --project-name=peakflowstat --branch=initial-project
```

On first deploy, create the project first:
```bash
npx wrangler pages project create peakflowstat --production-branch=initial-project
```

After deploying, add DNS manually in Cloudflare Dashboard → **allergyclinic.cc** zone → **DNS**:
- **Type:** `CNAME`
- **Name:** `peakflowstat`
- **Target:** `peakflowstat.pages.dev`
- **Proxy:** On (orange cloud)

> **Note:** Do NOT use `www.peakflowstat.allergyclinic.cc` — third-level subdomains are not covered by Universal SSL and require Advanced Certificate Manager.

> **Note:** GitHub Actions workflows handle CI/CD automatically on push to main branch. The `.github/workflows/` directory contains deployment configurations for both Worker and Frontend.
=======
- Do NOT use Docker Compose, MongoDB, or Express — this is a Cloudflare-only stack.
- Do NOT use `_id` as the short link token — always use `shortToken` (UUID v4).
- Do NOT render raw HTML without DOMPurify sanitisation.
- Do NOT hardcode Thai strings in source code — use i18n keys.
- Do NOT use `any` in TypeScript.
- Do NOT UPDATE or DELETE `audit_logs` records.
- Do NOT use `useEffect` + `fetch` for data loading — use TanStack Query.
- Do NOT paginate client-side — always use backend pagination with `page`/`pageSize`.
- Do NOT use `www.peakflowstat.allergyclinic.cc` — not covered by Cloudflare Universal SSL.
- Do NOT re-add zone display to entry cards or dashboard without restoring `ZoneBadge` rendering — zone data is returned by the API and can be shown in future.
- Do NOT create monolithic components (>300 lines) — extract reusable pieces.
- Do NOT connect Cloudflare Pages to GitLab CI/CD (see above).
- Do NOT put business logic in route handlers — move to a service layer (known tech debt).
>>>>>>> pfs

---

See [CHANGELOGS.md](./CHANGELOGS.md) for version history.
See [ENVIRONMENTS.md](./ENVIRONMENTS.md) for full environment setup instructions.
