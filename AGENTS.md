# PeakFlowStat Project Context

## Project Overview

PeakFlowStat is a **mobile-first** web application for asthma patients to track peak flow measurements and visualize trends. Users access their personal dashboard via a unique short link — no login required. The interface is in Thai (Buddhist Era dates). Administrative features are directly accessible at /admin to manage users and audit all data changes.

### Key Features

- **Patient Dashboard:** Shows user name and recent entry list. Charts and zone percentage have been removed — entry cards show raw readings.
- **Easy Entry:** Simplified form for recording 3 peak flow readings, SpO2, medication timing, and morning/evening period.
- **Admin Management:** Directly accessible panel to create/edit users, set personal best values, and manage entries.
- **Markdown Notes:** Support for Markdown in patient entries and admin-only notes for each user.
- **Data Export:** Export patient data to CSV for clinical review.
- **Audit Logging:** Transparent tracking of all data modifications.
- **Bitly-like Short Links:** Each user gets an 8-character cryptographically random `shortCode`. Visiting `/s/:code` triggers a server-side 302 redirect to their dashboard. Click counts are tracked in DB but not displayed.
- **Share Link UI:** Admin can view/copy the short URL and see a QR code — available in the user detail view and as a copy button per row in the user list. (Native share button removed.)

### Main Technologies

- **Frontend:** React (TypeScript), Vite, React Router v6, TanStack Query (React Query), Tailwind CSS, react-i18next, react-markdown, qrcode.react
- **Backend:** Node.js (Express), MongoDB (Mongoose), Zod (request validation)
- **Localization:** Thai only (`th.json`)
- **Deployment:** Docker Compose (frontend + backend + MongoDB)

---

## File & Folder Structure

```
PeakFlowStat/
├── frontend/
│   ├── public/
│   ├── .env.example          # VITE_API_URL
│   ├── .env.production       # Production API URL
│   ├── wrangler.toml         # Cloudflare Pages config
│   ├── index.html            # Vite entry HTML (includes Sarabun font)
│   ├── nginx.conf            # Production nginx config (SPA + API proxy)
│   ├── Dockerfile            # Multi-stage: build with Vite, serve with nginx
│   ├── vite.config.ts
│   └── src/
├── backend/
│   ├── src/
│   │   ├── controllers/      # Parse request, call service, return response
│   │   ├── services/         # Business logic, audit log writes — called by controllers
│   │   ├── middleware/       # validateShortLink, requireAdmin, rateLimiter, validate
│   │   ├── models/           # Mongoose schemas (User, Entry, AuditLog)
│   │   ├── routes/           # Express routers (health, admin, user, redirect)
│   │   │   └── redirect.ts   # GET /s/:code → 302 to /u/:shortToken (Bitly-like)
│   │   ├── validators/       # Zod schemas for request body/query validation
│   │   ├── constants.ts      # Shared constants (PAGE_SIZE)
│   │   ├── seed.ts           # Seed script (generates admin password hash only)
│   │   └── index.ts          # App entry point (mounts /s redirect router)
│   ├── .env.example
│   ├── Dockerfile            # Build TypeScript, run with Node
│   └── tsconfig.json
├── worker/                   # Cloudflare Workers backend (Hono.js + D1)
│   ├── src/
│   │   ├── index.ts          # Hono app entry point
│   │   ├── routes/           # API routes (health, admin, user, redirect)
│   │   ├── lib/
│   │   │   ├── database.ts   # D1 client
│   │   │   └── jwt.ts        # JWT utilities
│   │   └── migrations/
│   │       └── 0001_schema.sql
│   ├── wrangler.toml
│   └── package.json
├── docker-compose.yml
└── GEMINI.md
```

### Backend Layer Flow

```
routes/ → middleware/ → controllers/ → services/ → models/
                                                 → AuditLog writes
```

Controllers must NOT contain business logic or call models directly. All mutations go through services, which handle audit logging in one place.

---

## Frontend Routes (React Router v6)

| Path | Page Component | Description |
|------|---------------|-------------|
| `/u/:token` | `UserDashboard` | User name + recent entry list + add entry button (no charts) |
| `/u/:token/new` | `NewEntry` | Entry form (peak flow, SpO2, medication, period, notes) |
| `/u/:token/entries` | `EntryHistory` | Full paginated entry list |
| `/admin` | `AdminDashboard` | User list, search, copy short link per row; create user form with cancel button |
| `/admin/users/:id` | `AdminUserDetail` | User entries (editable) + notes + QR share card + export |
| `/admin/audit` | `AdminAuditLog` | Paginated audit log viewer |

> `/s/:code` is **not** a frontend React route. On Cloudflare, `frontend/public/_redirects` forwards `/s/*` to the worker at `api.peakflowstat.allergyclinic.cc/s/:code`, which performs the lookup and 302-redirects to the absolute frontend URL `https://www.peakflowstat.allergyclinic.cc/u/:shortToken`.

### Frontend State Management

- **Server state:** TanStack Query (React Query) for all API data — caching, refetching, optimistic updates.
- **Local state:** React `useState` / `useReducer` only. No global state library needed.
- **API client:** Plain `fetch` wrapped in typed functions in `frontend/src/api/`. No Axios.

---

## Data Models (MongoDB / Mongoose)

### User

```ts
{
  _id: ObjectId,
  firstName: string,
  lastName: string,
  nickname: string,
  shortToken: string,      // UUID v4 — indexed unique, used in dashboard URL (/u/:shortToken)
  shortCode: string,       // 8-char hex using crypto.randomBytes() — indexed unique, used in short link (/s/:shortCode)
  clickCount: number,      // incremented on each /s/:shortCode redirect (default: 0)
  personalBest: number | null, // Peak flow personal best (L/min), set by admin/doctor
  adminNote: string,       // Markdown, editable by admin only
  deletedAt: Date | null,  // Soft-delete timestamp (null = active)
  createdAt: Date,
  updatedAt: Date,
}
```

### Entry

```ts
{
  _id: ObjectId,
  userId: ObjectId,        // ref: User
  date: Date,              // stored as ISO; displayed in Thai B.E. format
  period: 'morning' | 'evening',  // required — time of day for the reading
  peakFlowReadings: [number, number, number],  // 3 readings (L/min)
  spO2: number,            // percentage (70-100)
  medicationTiming: 'before' | 'after',
  note: string,            // Markdown content, sanitized on render
  createdAt: Date,
  updatedAt: Date,
}
```

### AuditLog

```ts
{
  _id: ObjectId,
  adminId: string,         // identifier of admin who acted
  targetId: ObjectId,      // Entry or User _id affected
  targetModel: 'Entry' | 'User',
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  diff: {
    before: object | null,
    after: object | null,
  },
  timestamp: Date,
}
```

> AuditLog is **append-only** — never UPDATE or DELETE records in this collection.

---

## Input Validation Ranges

These MUST be enforced both client-side (UX feedback) and server-side (Zod schemas).

| Field | Min | Max | Unit | Notes |
|-------|-----|-----|------|-------|
| Peak Flow (each reading) | 50 | 900 | L/min | 3 readings required |
| SpO2 | 70 | 100 | % | Integer only |
| Date | — | today | — | Cannot be in the future |
| Personal Best | 50 | 900 | L/min | Set by admin only |
| Period | — | — | — | Enum: `'morning'` or `'evening'` — required |

Define these as constants in `frontend/src/constants/validation.ts` and `backend/src/validators/`.

---

## Peak Flow Zones

Peak flow zones are calculated from each user's `personalBest` value. This is **standard clinical practice** for asthma management and MUST be implemented.

| Zone | Range | Color | Meaning |
|------|-------|-------|---------|
| Green | 80–100% of personal best | `#22c55e` | Well controlled |
| Yellow | 50–79% of personal best | `#eab308` | Caution — adjust medication |
| Red | < 50% of personal best | `#ef4444` | Medical alert — seek help |

### Implementation

- **Backend:** Zone is included in entry response: calculated from `max(peakFlowReadings)` vs user's `personalBest`.
- **Frontend:** `ZoneBadge` component exists but is not rendered anywhere — removed from both the user dashboard header and `EntryCard`. Zone data is returned by the API but not displayed.
- **Edge case:** If `personalBest` is not set, a warning notice is shown on the dashboard to contact their doctor.

Zone calculation utility: `frontend/src/utils/zone.ts` and `backend/src/services/zone.ts`.

---

## Data Visualization

> **Charts removed from user dashboard.** `PeakFlowChart`, `SpO2Chart`, `TimeRangeSelector`, and `ZoneBadge` components still exist in the codebase but are no longer rendered on the user dashboard.

### Current User Dashboard Layout (Mobile-First)

```
┌──────────────────────────┐
│  User name               │
├──────────────────────────┤
│  Recent entries list     │
├──────────────────────────┤
│  [+ Add Entry] button    │
└──────────────────────────┘
```

---

## API Endpoints

All user routes pass through `validateShortLink` middleware.
All admin routes pass through `requireAdmin` middleware (accessible without login — passthrough).
All request bodies pass through Zod validation middleware.

### Short Link Redirect (not under `/api`)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/s/:code` | Look up user by `shortCode`, increment `clickCount`, respond `302` to `https://www.peakflowstat.allergyclinic.cc/u/:shortToken` (absolute URL via `FRONTEND_URL` env var). On unknown code, redirect to `/`. Cloudflare Pages `_redirects` forwards `/s/*` from frontend domain to worker. |

### Health

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Returns `{ status: 'ok', db: 'connected' }`. Used by Docker health check. |

### User Routes (`/api/u/:token`)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/u/:token` | Validate token, return user profile (incl. personalBest, excl. adminNote) |
| `GET` | `/api/u/:token/entries` | Paginated entries (20/page), `?from=&to=` date filter |
| `POST` | `/api/u/:token/entries` | Create a new entry |
| `GET` | `/api/u/:token/export` | Export entries as CSV, `?from=&to=` date filter |

### Admin — User Management

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/users` | List users with search (`?q=`), paginated. Returns `shortCode`, `clickCount` (tracked in DB, not displayed in UI). |
| `POST` | `/api/admin/users` | Create user + generate `shortToken` (UUID) + `shortCode` (8-char hex) |
| `GET` | `/api/admin/users/:id` | Get single user with stats |
| `PATCH` | `/api/admin/users/:id` | Edit user details (name, personalBest) |
| `DELETE` | `/api/admin/users/:id` | Soft-delete user (writes AuditLog) |
| `PATCH` | `/api/admin/users/:id/note` | Update admin Markdown note |
| `POST` | `/api/admin/users/:id/rotate-token` | Generate new shortToken, invalidate old link (endpoint exists; UI button removed) |
| `GET` | `/api/admin/users/:id/export` | Export user data as CSV |

### Admin — Entry Management

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/entries` | All entries, paginated (`?page=&userId=`) |
| `PATCH` | `/api/admin/entries/:id` | Edit entry (writes AuditLog) |
| `DELETE` | `/api/admin/entries/:id` | Delete entry (writes AuditLog) |

### Admin — Audit Log

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/audit` | Paginated audit log, filterable by `?userId=&action=` |

---

## Security Requirements

- **Authentication:** Removed for simplicity. Admin routes require no login; user routes auto-find first active user if token invalid/missing. App is open-access by design.
- **Short tokens:** UUID v4 minimum — used for user identification (not authentication).
- **Markdown rendering:** Rendered via `react-markdown`, which does not pass through raw HTML by default, making it safe without additional sanitization. DOMPurify is available as a dependency but not required for react-markdown usage.
- **Rate limiting:** Patient-facing routes (`/api/u/:token/*`) — max 100 requests per 15 minutes per IP. Uses `express-rate-limit`.
- **Request validation:** All request bodies and query params validated with Zod schemas. Reject invalid input with 400 and descriptive error.
- **AuditLog:** Append-only. No UPDATE or DELETE operations allowed on this collection.
- **CSV Export:** Sends `Authorization` header on export requests (prepared for future auth re-enablement).
- **HTTPS:** Required in production. The `FRONTEND_BASE_URL` must use `https://`.
- **CORS:** Restrict to known frontend origin via `CORS_ORIGIN` env var.
- **User deletion:** Soft-delete only (set `deletedAt` flag). Hard-delete requires direct DB access.

---

## Constraints — Do NOT

- Do NOT use `_id` as the short link token — always use the `shortToken` field (UUID v4).
- Do NOT enable `rehype-raw` in react-markdown without adding DOMPurify sanitization.
- Do NOT hardcode Thai strings in source code — always use i18n keys from `th.json`.
- Do NOT use the TypeScript `any` type.
- Do NOT DELETE or UPDATE AuditLog records.
- Do NOT expose MongoDB `_id` values in short links or public-facing URLs.
- Do NOT paginate with `skip` on large collections — use cursor-based pagination for the admin entry list if the dataset is expected to grow large.
- Do NOT put business logic in controllers — use the services layer.
- Do NOT call Mongoose models directly from controllers.
- Do NOT use `useEffect` + `fetch` for data loading — use TanStack Query.
- Do NOT build desktop-first layouts — all pages must be mobile-first, scaling up to desktop.
- Do NOT re-add zone display to entry cards or the dashboard without also restoring the ZoneBadge component — zone data is still returned by the API and can be shown in future.

---

## Development Conventions

- **Language:** TypeScript strict mode throughout (frontend and backend).
- **Naming:** `camelCase` variables/functions, `PascalCase` components/types/interfaces, `UPPER_SNAKE_CASE` constants.
- **Styling:** Tailwind CSS, mobile-first (`sm:`, `md:`, `lg:` breakpoints). Thai-compatible font: `"Sarabun"` from Google Fonts.
- **Localization:** All UI strings in `frontend/src/i18n/th.json`. Use `useTranslation` hook. No raw Thai text in `.tsx`/`.ts` files.
- **Date formatting:** Utility in `frontend/src/utils/date.ts`. Convert ISO to Thai B.E. format (`DD/MM/YYYY+543`). Never inline date logic in components.
- **Error handling (API):** Consistent JSON shape: `{ error: string, code?: string }`. HTTP status codes: 400 validation, 401 unauthorized, 403 forbidden, 404 not found, 429 rate limited, 500 server error.
- **Error handling (Frontend):** TanStack Query error boundaries. Show Thai-localized error messages.
- **Comments:** JSDoc only for non-obvious logic. Do not comment self-explanatory code.
- **Validation:** Zod schemas in `backend/src/validators/`. Shared validation constants (ranges) in a common file importable by both Zod schemas and frontend constants.

---

## Testing

- **Backend:** Jest + Supertest. Test files co-located as `*.test.ts`.
  - Must test: short link validation middleware, entry CRUD, admin auth, audit log writes, Zod schema validation, zone calculation, CSV export format.
- **Frontend:** React Testing Library + Vitest.
  - Must test: Thai B.E. date formatting, zone calculation utility, EntryCard note preview/expand, EntryCard rendering with mock data.
- Run all tests: `npm test` from the respective `frontend/` or `backend/` directory.

---

## Environment Variables

The project uses separate configurations for local, staging, and production environments.

### Environments

| Environment | Frontend URL | API URL | Database | Config Files |
|-------------|--------------|---------|----------|--------------|
| Local | http://localhost:5173 | http://localhost:8787 | `peakflowstat-db-dev` | `.env.development`, `wrangler.dev.toml` |
| Staging | https://staging.peakflowstat.allergyclinic.cc | https://api-staging.peakflowstat.allergyclinic.cc | `peakflowstat-db-staging` | `.env.staging`, `wrangler.staging.toml` |
| Production | https://peakflowstat.allergyclinic.cc | https://api.peakflowstat.allergyclinic.cc | `peakflowstat-db` | `.env.production`, `wrangler.toml` |

### Frontend Environment Variables

Frontend uses Vite's environment mode system. Create `.env.{mode}` files:

- `.env.development` - Local development
- `.env.staging` - Staging environment
- `.env.production` - Production environment

**Example `.env.development`**
```env
VITE_API_URL=http://localhost:8787/api
```

**Example `.env.production`**
```env
VITE_API_URL=https://api.peakflowstat.allergyclinic.cc/api
```

### Worker Environment Variables

Worker uses separate Wrangler config files:

- `wrangler.dev.toml` - Local development
- `wrangler.staging.toml` - Staging environment
- `wrangler.toml` - Production environment (default)

**Example `wrangler.dev.toml`**
```toml
name = "peakflowstat-api-dev"
[vars]
ENVIRONMENT = "development"
CORS_ORIGIN = "http://localhost:5173"
FRONTEND_URL = "http://localhost:5173"
[[d1_databases]]
binding = "DB"
database_name = "peakflowstat-db-dev"
database_id = "YOUR_DEV_DATABASE_ID"
```

Never commit `.env` files. Environment config files (`.env.*`, `wrangler*.toml`) are committed.

### Switching Between Environments

**Frontend:**
```bash
# Local development (uses .env.development)
npm run dev

# Staging (uses .env.staging)
npm run dev:staging

# Production build (uses .env.production)
npm run build
```

**Worker:**
```bash
# Local development (uses wrangler.dev.toml)
npm run dev

# Staging deployment (uses wrangler.staging.toml)
npm run deploy:staging

# Production deployment (uses wrangler.toml)
npm run deploy
```

**Checking current mode:**
In browser DevTools (`F12` → Console):
```javascript
import.meta.env.MODE  // Returns: "development" | "staging" | "production"
import.meta.env.VITE_API_URL
```

### Quick Switching Guide

| What you want | Command | Files Used | Environment |
|---------------|---------|-------------|--------------|
| Run frontend locally | `cd frontend && npm run dev` | `.env.development` | Development |
| Build frontend for staging | `cd frontend && npm run build:staging` | `.env.staging` | Staging |
| Build frontend for production | `cd frontend && npm run build` | `.env.production` | Production |
| Run worker locally | `cd worker && npm run dev` | `wrangler.dev.toml` | Development |
| Deploy worker to staging | `cd worker && npm run deploy:staging` | `wrangler.staging.toml` | Staging |
| Deploy worker to production | `cd worker && npm run deploy` | `wrangler.toml` | Production |

### Environment Details

| Environment | Frontend URL | API URL | Database | Config Files |
|-------------|--------------|---------|----------|--------------|
| Development | http://localhost:5173 | http://localhost:8787 | Production D1 | `.env.development`, `wrangler.dev.toml` |
| Staging | https://staging.peakflowstat.allergyclinic.cc | https://api-staging.peakflowstat.allergyclinic.cc | Staging D1 | `.env.staging`, `wrangler.staging.toml` |
| Production | https://peakflowstat.allergyclinic.cc | https://api.peakflowstat.allergyclinic.cc | Production D1 | `.env.production`, `wrangler.toml` |

### Current Configuration

| Environment | Frontend URL | API URL | Database | Config Files | Status |
|-------------|--------------|---------|----------|--------------|--------|
| **Local Development** | http://localhost:5173 | http://localhost:8787 | Local (empty) | `.env.development`, `wrangler.dev.toml` | ⚠️ D1 Limitation |
| **Production** | https://peakflowstat.allergyclinic.cc | https://api.peakflowstat.allergyclinic.cc | Production D1 | `.env.production`, `wrangler.toml` | ✅ Active |
| **Staging** | Not configured | Not configured | Not configured | `.env.staging`, `wrangler.staging.toml` | 🔧 Not Deployed |

### Local Development Notes

**⚠️ Limitation**: `wrangler dev` creates a local in-memory SQLite database and cannot connect to remote D1 databases. This is a known Cloudflare Workers limitation.

**Workflow Options**:

1. **Option A - Use Production for Testing** (Recommended)
   - Make code changes locally
   - Build: `cd frontend && npm run build`
   - Deploy directly to production or use production frontend at https://peakflowstat.allergyclinic.cc

2. **Option B - Build and Preview**
   - Make code changes locally
   - Build: `cd frontend && npm run build`
   - Preview: `cd frontend && npm run preview` (no proxy, static files only)

3. **Option C - Deploy to Staging**
   - Set up staging D1 database
   - Deploy worker and frontend to staging
   - Test on staging environment

### Setup Staging Environment

1. **Create Staging D1 Database**
   ```bash
   cd worker
   npx wrangler d1 create peakflowstat-db-staging
   ```

2. **Update Database ID**
   Copy the returned `database_id` and update `wrangler.staging.toml`.

3. **Run Schema and Seed**
   ```bash
   npx wrangler d1 execute peakflowstat-db-staging --file=./migrations/0001_schema.sql --remote --config wrangler.staging.toml
   npx wrangler d1 execute peakflowstat-db-staging --file=./migrations/0002_seed.sql --remote --config wrangler.staging.toml
   ```

4. **Deploy Staging Worker**
   ```bash
   npm run deploy:staging
   ```

5. **Deploy Staging Frontend**
   ```bash
   cd frontend
   npm run build:staging
   npx wrangler pages deploy dist --project-name=peakflowstat-staging --branch=staging
   ```

See `ENVIRONMENTS.md` for complete setup instructions.

---

## Building and Running

```bash
# Full stack (recommended)
docker-compose up

# Frontend only (dev)
cd frontend && npm install && npm run dev

# Backend only (dev)
cd backend && npm install && npm run dev

# Seed test data (dev only)
cd backend && npx ts-node src/seed.ts

# Run tests
cd frontend && npm test    # Vitest
cd backend && npm test     # Jest (requires MongoDB)
```

### Docker Compose Requirements

- Named volumes for MongoDB persistence.
- Backend depends on MongoDB with health check (`mongosh --eval 'db.runCommand("ping")'`).
- Backend exposes `/api/health` for its own health check.
- Frontend served via nginx in production (not `npm start`).
- Restart policy: `unless-stopped` for all services.

---

## Cloudflare Deployment (Alternative)

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

**users table**
```sql
id TEXT PRIMARY KEY
name TEXT NOT NULL
age INTEGER
height REAL
weight REAL
green_min INTEGER
yellow_min INTEGER
short_link_token TEXT UNIQUE NOT NULL
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
```

**entries table**
```sql
id TEXT PRIMARY KEY
user_id TEXT NOT NULL
peak_flow INTEGER NOT NULL
spo2 INTEGER
symptoms TEXT (JSON array)
notes TEXT
timestamp DATETIME NOT NULL
FOREIGN KEY (user_id) REFERENCES users(id)
```

**audit_logs table**
```sql
id TEXT PRIMARY KEY
action TEXT NOT NULL
user_id TEXT
details TEXT
ip_address TEXT
timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
```

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

> **Note:** Do NOT connect the Pages project to GitLab CI/CD — the repo root contains `worker/wrangler.toml` which causes the Pages build pipeline to run `npx wrangler deploy` instead of `npm run build`.

### Cost Comparison

| Service | Docker Compose | Cloudflare |
|---------|----------------|------------|
| Hosting | Self-managed | Serverless |
| Database | MongoDB (512MB free) | D1 (5GB free) |
| Requests | Unlimited | 100k/day |
| Global CDN | Manual setup | Built-in |

### Default Admin Credentials

- **Username**: `admin`
- **Password**: `admin123`

See `worker/DEPLOYMENT.md` for detailed Cloudflare setup instructions.

---


See [CHANGELOGS.md](./CHANGELOGS.md) for version history.
