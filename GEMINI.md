# PeakFlowStatX Project Context

## Project Overview

PeakFlowStatX is a **mobile-first** web application for asthma patients to track peak flow measurements and visualize trends. Users access their personal dashboard via a unique short link — no login required. The interface is in Thai (Buddhist Era dates). Administrative features are directly accessible at /admin to manage users and audit all data changes.

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
PeakFlowStatX/
├── frontend/
│   ├── public/
│   ├── .env.example          # VITE_API_URL
│   ├── index.html            # Vite entry HTML (includes Sarabun font)
│   ├── nginx.conf            # Production nginx config (SPA + API proxy)
│   ├── Dockerfile            # Multi-stage: build with Vite, serve with nginx
│   ├── vite.config.ts
│   └── src/
│       ├── api/              # API client functions (wrapping fetch), one file per resource
│       │   ├── client.ts     # Base fetch wrapper, auth header helper
│       │   ├── user.ts       # Patient-facing API calls
│       │   └── admin.ts      # Admin API calls
│       ├── components/       # Reusable UI components
│       │   ├── ZoneBadge.tsx         # exists but not used in UserDashboard
│       │   ├── PeakFlowChart.tsx     # exists but not used (charts removed from dashboard)
│       │   ├── SpO2Chart.tsx         # exists but not used (charts removed from dashboard)
│       │   ├── TimeRangeSelector.tsx # exists but not used (removed with charts)
│       │   ├── EntryCard.tsx         # Shows reading + note preview with show more/less toggle
│       │   ├── EntryForm.tsx
│       │   └── ShareLinkCard.tsx     # QR code + copy link (native share removed)
│       ├── constants/        # Validation ranges, pagination size
│       │   └── validation.ts
│       ├── pages/            # Route-level pages (UserDashboard, AdminDashboard, etc.)
│       ├── hooks/            # Custom React hooks
│       ├── i18n/
│       │   ├── index.ts      # react-i18next setup
│       │   └── th.json       # All Thai strings (no hardcoded strings in source)
│       ├── types/            # Shared TypeScript types/interfaces
│       │   └── index.ts
│       ├── utils/            # Pure helper functions
│       │   ├── date.ts       # Thai B.E. date formatting
│       │   └── zone.ts       # Zone calculation + colors
│       ├── App.tsx           # React Router route definitions
│       ├── main.tsx          # Vite entry point
│       └── vite-env.d.ts     # Vite type declarations
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

> `/s/:code` is **not** a frontend route. It is handled server-side by `backend/src/routes/redirect.ts` and proxied by nginx before React Router is involved.

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
| `GET` | `/s/:code` | Look up user by `shortCode`, increment `clickCount`, respond `302` to `/u/:shortToken`. On unknown code, redirect to `/`. Served by nginx proxy to backend. |

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

### Backend (`backend/.env.example`)

```env
MONGODB_URI=mongodb://mongo:27017/peakflow
PORT=4000
FRONTEND_BASE_URL=https://yourapp.com   # Used by /s/:code redirect (302 target base)
CORS_ORIGIN=https://yourapp.com
```

### Frontend (`frontend/.env.example`)

```env
VITE_API_URL=http://localhost:4000/api
```

Never commit `.env` files. Both `.env.example` files MUST be committed.

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

## Changelog

| Date | Change |
|------|--------|
| 2026-04-06 | Initial spec |
| 2026-04-06 | v2: Added data models, API endpoints, security section, constraints |
| 2026-04-06 | v3: Added peak flow zones, charts, mobile-first, services layer, validation ranges, frontend routes, export, admin CRUD gaps, Zod, health check, seed script |
| 2026-04-06 | v4: Updated to match implementation — Vite (VITE_API_URL, main.tsx, Vitest), removed DOMPurify requirement (react-markdown safe by default), added deletedAt to User model, added rate limiting on patient routes, removed unused search param from admin entries, noted adminNote exclusion from patient profile, added constants.ts/Dockerfiles/nginx.conf to file structure, fixed changelog |
| 2026-04-07 | v5: Removed admin authentication; administrative features now directly accessible at /admin. Added Markdown-supported 'Admin Note' field to user creation and detail views. |
| 2026-04-06 | v6: Removed all authentication barriers — admin routes require no login (requireAdmin always passes), user routes auto-find first active user if token invalid/missing (validateShortLink fallback), login page auto-redirects to /admin. Division-by-zero guards added to zone calculations. App now fully open-access for simplicity. |
| 2026-04-06 | v7: Added Bitly-like server-side short link system. New `shortCode` (6-char) and `clickCount` fields on User. `GET /s/:code` route in backend responds with 302 redirect to `/u/:shortToken`, nginx proxies `/s/` to backend. `ShortLinkRedirect.tsx` removed from frontend — `/s/:code` is no longer a React route. Added `period: 'morning'\|'evening'` required field to Entry. Added `ShareLinkCard` component (QR code + copy + native share). Per-row copy link button added to AdminDashboard user list. `FRONTEND_BASE_URL` env var added to backend. |
| 2026-04-06 | v8: Removed charts (PeakFlowChart, SpO2Chart), TimeRangeSelector, and ZoneBadge from user dashboard. User page now shows name + entry list only. Removed click count column from admin user list (clickCount still tracked in DB). Recharts removed from active use (dependency retained). |
| 2026-04-06 | v9: Removed ZoneBadge (zone color + percentage) from EntryCard. Entry records now show only date, period, peak flow best reading, SpO2, medication timing, and note. Zone data still returned by API but not displayed anywhere in the UI. |
| 2026-04-07 | v10: Fixed `period` field migration — `updateEntrySchema` now has optional `period` with default `'morning'`. Added `period` to CSV export and adminUpdateEntry audit diff. CSV export now sends Authorization header for future auth re-enablement. |
| 2026-04-07 | v11: Documented duplicate validation constants (L) and zone calculation (M) with ⚠️ sync comments in both files. |
| 2026-04-07 | v12: Improved shortCode generation — now uses `crypto.randomBytes()` for cryptographically secure 8-char hex codes instead of predictable Math.random() alphanumeric. |
| 2026-04-07 | v13: Removed "create new link" (rotateToken) button and clickCount display from admin user detail page. |
| 2026-04-07 | v14: Removed "send to app" share button. User notes now show truncated preview with "show more/less". Admin can edit entry records with full timestamp update. |
| 2026-04-07 | v15: Added cancel button to admin create user form. |
| 2026-04-07 | v16: Removed shortCode textbox from admin edit user form (auto-generated). Added markdown preview toggle for entry notes in both user new entry form and admin entry edit form. |
| 2026-04-07 | v17: Admin user list now shows adminNote preview with toggle to view full note. |
| 2026-04-07 | v18: Admin user list - removed adminNote column, added "Last Entry" column. Admin entry list - added note column with click to view full note in modal. |
| 2026-04-07 | v19: Admin create user form - adminNote field now supports markdown preview with toggle. |
| 2026-04-07 | v20: Cleared all sample users/entries. Deleted old seed files (seed-john.ts, seed-11-users.ts, seed-jonh.ts). Created 20 sample users with 600 entries for testing. Deleted sample seed file after use. |
