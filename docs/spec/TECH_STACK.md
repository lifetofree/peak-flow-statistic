# Tech Stack — PeakFlowStat

**Last updated:** 2026-05-15  
**Status:** Production

---

## Deployment Topology

```
Internet
  │
  ├─ peakflowstat.allergyclinic.cc  ──► Cloudflare Pages (React SPA)
  ├─ main.peakflowstat.pages.dev    ──► Cloudflare Pages (preview)
  ├─ api.peakflowstat.allergyclinic.cc ► Cloudflare Worker (REST API)
  └─ s.peakflowstat.allergyclinic.cc/*► Short-link redirect (same Worker)
```

All compute and storage runs exclusively on Cloudflare's edge — zero external services, zero VMs, zero containers in production.

---

## Infrastructure

| Layer | Service | Details |
|---|---|---|
| Frontend hosting | Cloudflare Pages | SPA served from CDN |
| API compute | Cloudflare Workers | TypeScript, Hono v4.6 |
| Database | Cloudflare D1 | SQLite at edge, ID: `812f290e-…` |
| Cache / Rate-limit store | Cloudflare KV | Namespace binding `RATE_LIMIT` |
| CI/CD | GitHub Actions | Build → Pages deploy on push to `main` |

---

## Backend (Worker)

| Item | Choice |
|---|---|
| Runtime | Cloudflare Workers (V8 isolates) |
| Language | TypeScript 5.7 |
| Framework | Hono 4.6 |
| Validation | Zod 3.24 + `@hono/zod-validator` |
| Auth token | Custom HMAC-SHA-256 JWT (`WebCrypto` API) |
| Bundler | Wrangler 4.x (direct TS compilation, no separate tsc step) |
| Test runner | Vitest 4 |

### Environment bindings (prod `wrangler.toml`)

```toml
DB         = D1 database "peakflowstat-db"
RATE_LIMIT = KV namespace
JWT_SECRET = (secret, set via Wrangler secrets)
CORS_ORIGIN = "https://peakflowstat.allergyclinic.cc,https://main.peakflowstat.pages.dev"
FRONTEND_URL = "https://peakflowstat.allergyclinic.cc"
```

Three environment configs exist: `wrangler.toml` (prod), `wrangler.staging.toml` (staging), `wrangler.dev.toml` (local dev on port 8788).

---

## Frontend

| Item | Choice |
|---|---|
| Language | TypeScript 5.7 |
| Framework | React 18.3 |
| Bundler | Vite 6 |
| Router | React Router 6 (lazy-loaded pages) |
| Data fetching | TanStack Query v5 |
| Styling | Tailwind CSS 3.4 |
| i18n | i18next 24 + react-i18next 15 (Thai only, `th.json`) |
| Rich text editor | react-quill 2 (Quill.js) |
| XSS sanitization | DOMPurify 3 (frontend only) |
| Charts | Recharts 2 (installed; `PeakFlowChart.tsx` and `SpO2Chart.tsx` exist but not yet rendered) |
| Date picker | react-datepicker 9 + custom `BuddhistDatePicker` |
| QR code | qrcode.react 4 |
| Test runner | Vitest 2 + Testing Library |

---

## Coding Standards

### General
- All source is TypeScript with strict mode enabled.
- `snake_case` for database column names; `camelCase` for all API JSON and TypeScript types.
- Dates stored as ISO-8601 strings (UTC). Displayed to users as Thai Buddhist Era (พ.ศ.) via `utils/date.ts`.

### Backend conventions
- Route handlers delegate business logic to service layer (`worker/src/services/`).
- All DB access goes through `DatabaseClient` — never raw SQL in routes.
- Column/table names are validated against allowlists in `DatabaseClient` to prevent SQL injection.
- Audit log is append-only: never `UPDATE` or `DELETE` from `audit_logs`.
- Soft-delete only for users: set `deleted_at`, never hard-delete.

### Frontend conventions
- All user-facing strings use `t()` from i18next — no hardcoded Thai or English strings in JSX.
- `Entry` canonical type is `frontend/src/types/index.ts`; components import from there.
- Zone calculation (`utils/zone.ts`) must stay in sync with backend (`worker/src/routes/zone.ts`).

---

## Security Baseline

| Concern | Implementation |
|---|---|
| SQL injection | Allowlisted table/column names in `DatabaseClient` |
| XSS | DOMPurify sanitization on frontend before display |
| CORS | Explicit allowlist in Worker CORS middleware |
| Rate limiting | Cloudflare KV sliding window: 100 req/15min (patient), 300 req/15min (admin) |
| Admin auth | **Intentionally absent** — open-access by design for current use case |
| Backend HTML sanitization | **Not implemented** — tracked as Issue #6 (medium priority) |

> ⚠️ The admin panel has no authentication. This is an explicit design decision. Re-evaluate before handling real PII in production.

---

## Known Technical Debt (Active)

| ID | Description | Priority |
|---|---|---|
| T-03 | Unify `Entry` type definitions across components | Medium |
| T-04 | Add React error boundaries | Low |
| T-09 | Consolidate duplicate peak flow parsing logic (Issue #3) | Medium |
| T-10 | Add KV caching for user profile reads (Issue #5) | Medium |
| T-11 | Add backend HTML sanitization for notes (Issue #6) | Medium |
| T-12 | Streaming CSV export for large datasets (Issue #7) | Low |

---

## Local Development

```bash
# Worker (port 8788)
cd worker && npm run dev

# Frontend (port 5173, proxies /api to :8788)
cd frontend && npm run dev
```

Proxy is configured in `frontend/vite.config.ts` to target `http://localhost:8788`.
