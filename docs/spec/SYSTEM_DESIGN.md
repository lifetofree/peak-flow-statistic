# System Design — PeakFlowStat

**Last updated:** 2026-05-15  
**Status:** Production (v53+)

---

## Overview

PeakFlowStat is a clinical asthma-monitoring tool used at an allergy clinic in Thailand. Patients record twice-daily peak flow (PF) and SpO2 readings via a tokenized URL. Clinic staff manage patients through an open-access admin panel.

**Target users:**
- **Patients** — Thai-speaking asthma patients using mobile browsers.
- **Admin / Clinic staff** — Manage patient records, review readings, write notes, export data.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Edge                          │
│                                                             │
│  ┌──────────────┐     ┌────────────────────────────────┐   │
│  │  Pages (SPA) │     │  Worker (Hono API)             │   │
│  │  React 18    │────►│  /api/u/:token/*  (patient)    │   │
│  │  Tailwind    │     │  /api/admin/*     (admin)      │   │
│  │  i18n (th)   │     │  /s/:code         (redirect)   │   │
│  └──────────────┘     │  /api/health                   │   │
│                        └───────────┬────────────────────┘   │
│                                    │                        │
│                        ┌───────────▼────────────────────┐   │
│                        │  D1 (SQLite)                   │   │
│                        │  users / entries / audit_logs  │   │
│                        └────────────────────────────────┘   │
│                                                             │
│                        ┌───────────────────────────────┐    │
│                        │  KV                           │    │
│                        │  Rate limit counters          │    │
│                        └───────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### `users`

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID v4 |
| `first_name` | TEXT NOT NULL | |
| `last_name` | TEXT NOT NULL | |
| `nickname` | TEXT NOT NULL | Displayed name in Thai UI |
| `short_token` | TEXT UNIQUE | UUID v4 — used in `/u/:token` URL |
| `short_code` | TEXT UNIQUE | 8-char hex — used in `/s/:code` short link |
| `click_count` | INTEGER | Short-link click counter |
| `personal_best` | INTEGER | Peak flow personal best (L/min). Used for zone calculation. Nullable. |
| `admin_note` | TEXT | WYSIWYG HTML. Admin-only. |
| `instruction_box` | TEXT | WYSIWYG HTML. Shown to patient on dashboard. |
| `user_note` | TEXT | Patient-editable note. Also editable by admin. |
| `deleted_at` | TEXT | ISO-8601. Soft-delete timestamp. Null = active. |
| `created_at` | TEXT | ISO-8601 |
| `updated_at` | TEXT | ISO-8601 |

Indexes: `short_token`, `short_code`, `deleted_at`.

### `entries`

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID v4 |
| `user_id` | TEXT FK → users.id | CASCADE DELETE |
| `date` | TEXT | ISO-8601 date (YYYY-MM-DD) |
| `peak_flow_readings` | TEXT | JSON array of up to 3 readings, e.g. `[420, 430, 425]` |
| `peak_flow` | INTEGER NOT NULL | Best (max) reading. Denormalized for query performance. |
| `spo2` | INTEGER | SpO2 % (0–100). Optional. |
| `medication_timing` | TEXT | `before` or `after` |
| `medication_time` | TEXT | Added in migration 0003. Reserved, not yet used in UI. |
| `period` | TEXT | `morning` or `evening` |
| `note` | TEXT | Plain text patient note |
| `created_at` | TEXT | ISO-8601 |
| `updated_at` | TEXT | ISO-8601 |

Indexes: `user_id`, `date`.

### `audit_logs`

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID v4 |
| `admin_id` | TEXT | Hardcoded `"admin"` (no multi-admin yet) |
| `target_id` | TEXT | ID of affected User or Entry |
| `target_model` | TEXT | `User` or `Entry` |
| `action` | TEXT | `CREATE`, `UPDATE`, or `DELETE` |
| `diff` | TEXT | JSON `{ before: {...} | null, after: {...} | null }` |
| `timestamp` | TEXT | ISO-8601 |

Append-only. Never `UPDATE` or `DELETE` records.

Index: `timestamp`.

---

## Peak Flow Zone System

Zone is calculated on-the-fly from `peak_flow` vs `personal_best`. Both frontend and backend implement the same algorithm — they must stay in sync.

| Zone | Condition | Color |
|---|---|---|
| Green | ≥ 90% of personal best | `#22c55e` |
| Orange | ≥ 80% and < 90% | `#f97316` |
| Yellow | ≥ 60% and < 80% | `#eab308` |
| Red | < 60% (or no personal best set) | `#ef4444` |

**Files (keep in sync):**
- Backend: `worker/src/routes/zone.ts` → `calculateZone()`
- Frontend: `frontend/src/utils/zone.ts` → `calculateZone()`

---

## Access Model

### Patient access
- URL: `/u/:token` where `:token` is the user's `short_token` (UUID v4).
- No login. Knowing the token grants full read/write access to that patient's data.
- Short-link `/s/:code` (8-char hex) redirects to `/u/:token` and increments `click_count`.
- Rate limit: **100 requests per 15 minutes** per IP.

### Admin access
- URL: `/admin` and all sub-routes.
- **No authentication.** Open-access by intentional design for current clinic workflow.
- Rate limit: **300 requests per 15 minutes** per IP.
- Admin can: create/update/soft-delete users, edit all entry fields, edit admin notes, instruction boxes, user notes, export CSV, view audit log.

---

## Worker Source Layout

```
worker/src/
├── index.ts                  # Hono app bootstrap, Env interface, CORS
├── constants/
│   └── pagination.ts         # DEFAULT_PAGE_SIZE = 20
├── lib/
│   ├── audit.ts              # writeCreateAudit / writeUpdateAudit / writeDeleteAudit
│   ├── database.ts           # DatabaseClient (type-safe CRUD over D1)
│   └── peakFlow.ts           # parsePeakFlowReadings(), getBestReading()
├── middleware/
│   └── rateLimit.ts          # rateLimitPatient / rateLimitAdmin (KV sliding window)
├── routes/
│   ├── admin.ts              # Re-exports admin/index.ts
│   ├── admin/
│   │   ├── index.ts          # Mounts usersRoutes + entriesRoutes + auditRoutes
│   │   ├── audit.ts          # GET /admin/audit
│   │   ├── entries.ts        # GET /admin/entries, PATCH/DELETE /admin/entries/:id
│   │   ├── types.ts          # DB record types (snake_case) + API response types (camelCase)
│   │   └── users.ts          # CRUD /admin/users + note/instruction/user-note PATCH routes
│   ├── health.ts             # GET /api/health
│   ├── jwt.ts                # sign() / verify() using WebCrypto HMAC-SHA-256
│   ├── redirect.ts           # GET /s/:code → redirect to patient dashboard
│   ├── user.ts               # GET/PATCH /u/:token, GET/POST /u/:token/entries, GET /u/:token/export
│   └── zone.ts               # calculateZone(), getBestReading()
└── services/
    ├── entryService.ts       # getUserEntries(), createUserEntry(), updateEntry(), deleteEntry()
    ├── exportService.ts      # generateCsv(), getSafeFileName()
    └── userService.ts        # listUsers(), createUser(), getUser(), updateUser(), deleteUser()
```

---

## Frontend Source Layout

```
frontend/src/
├── App.tsx                   # Route declarations (all pages lazy-loaded)
├── main.tsx                  # ReactDOM.createRoot, i18n init, QueryClient
├── api/
│   ├── client.ts             # Base fetch wrapper (reads VITE_API_URL)
│   ├── admin.tsx             # Admin API functions
│   └── user.ts               # Patient API functions
├── components/
│   ├── BuddhistDatePicker.tsx # react-datepicker with Buddhist Era (พ.ศ.) display
│   ├── DateFilter.tsx        # From/To date filter with Thai locale
│   ├── EntryCard.tsx         # Single entry display with ZoneBadge
│   ├── EntryForm.tsx         # Entry creation form (validated)
│   ├── PeakFlowChart.tsx     # Line chart (Recharts) — not yet rendered in UI
│   ├── PeakFlowTable.tsx     # Shared paginated table for entries
│   ├── RichTextEditor.tsx    # Quill WYSIWYG + DOMPurify sanitization
│   ├── SpO2Chart.tsx         # SpO2 chart (Recharts) — not yet rendered in UI
│   ├── ZoneBadge.tsx         # Green/Orange/Yellow/Red zone pill badge
│   └── admin/
│       ├── NoteModal.tsx     # Modal wrapper for note editing
│       ├── UserAdminNote.tsx # Admin-only note panel (rich text)
│       ├── UserEntriesTable.tsx # Entry table in admin user detail
│       ├── UserInstructionBox.tsx # Instruction box panel (rich text)
│       ├── UserPatientNote.tsx # Patient note panel (editable by admin)
│       ├── UserProfile.tsx   # Name/personalBest/shortToken display
│       └── UserShareLink.tsx # QR code + short link display
│   └── user/
│       ├── EntriesCardView.tsx # Card layout for entry history
│       ├── EntriesListView.tsx # Table layout for entry history
│       ├── UserNoteModal.tsx  # Patient self-edit note modal
│       └── ViewModeToggle.tsx # Card/list view switcher
├── i18n/
│   ├── index.ts              # i18next config
│   └── th.json               # All Thai UI strings
├── pages/
│   ├── AdminAuditLog.tsx     # /admin/audit
│   ├── AdminDashboard.tsx    # /admin
│   ├── AdminLogin.tsx        # /admin/login (UI only, no actual auth)
│   ├── AdminUserDetail.tsx   # /admin/users/:id
│   ├── EntryHistory.tsx      # /u/:token/entries
│   ├── NewEntry.tsx          # /u/:token/new
│   └── UserDashboard.tsx     # /u/:token
├── types/
│   └── index.ts              # Canonical TypeScript interfaces (User, Entry, AuditLog, …)
└── utils/
    ├── date.ts               # Buddhist Era date formatting
    ├── entryGrouping.ts      # Group entries by date for card view
    └── zone.ts               # calculateZone(), ZONE_COLORS
```

---

## Data Flow: Patient Creates Entry

```
Browser (NewEntry.tsx)
  │  POST /api/u/:token/entries  { date, peakFlowReadings:[x,y,z], spO2, medicationTiming, period, note }
  ▼
Worker route: user.ts
  │  validateShortLink middleware → look up user by short_token (excluding deleted)
  │  Zod schema validation
  ▼
entryService.createUserEntry()
  │  Compute peak_flow = max(peakFlowReadings)
  │  INSERT INTO entries (...)
  ▼
Response: 201 { _id, userId, date, peakFlowReadings, spO2, ... }
  ▼
React Query cache invalidated → entry list refetches
```

## Data Flow: Admin Views Patient Entries

```
Browser (AdminUserDetail.tsx)
  │  GET /api/admin/entries?userId=X&page=1&pageSize=20
  ▼
Worker route: entries.ts
  │  rateLimitAdmin middleware
  │  db.find(entries, { user_id: X }) + db.count()
  │  Batch fetch users by user_id set (avoid N+1)
  │  formatEntryWithZone() for each entry (calls calculateZone if personalBest set)
  ▼
Response: { entries: [{ _id, peakFlowReadings, zone: { zone, percentage }, ... }], total, page, pageSize }
  ▼
UserEntriesTable renders color-coded peak flow values + ZoneBadge
```

## Data Flow: Short Link Redirect

```
Browser hits /s/a1b2c3d4
  ▼
Worker route: redirect.ts
  │  db.findOne(users, { short_code: 'a1b2c3d4', deleted_at: null })
  │  Increment click_count
  ▼
HTTP 302 → https://peakflowstat.allergyclinic.cc/u/<short_token>
```

---

## Pagination

Default page size: `DEFAULT_PAGE_SIZE = 20` (`worker/src/constants/pagination.ts`).

All list endpoints return:
```json
{ "entries" | "users" | "logs": [...], "total": 123, "page": 1, "pageSize": 20 }
```

Pass `pageSize=0` to fetch all records (used for CSV export path). Note: this creates a DoS risk if `total` is very large — tracked as a known bug.

---

## Migrations

| File | Change |
|---|---|
| `0001_schema.sql` | Initial schema: `users`, `entries`, `audit_logs` + indexes |
| `0002_seed.sql` | Seed data (test users/entries) |
| `0003_add_medication_time.sql` | `entries.medication_time TEXT` |
| `0004_add_instruction_box.sql` | `users.instruction_box TEXT` |
| `0005_add_user_note.sql` | `users.user_note TEXT` |

Run with: `npx wrangler d1 migrations apply peakflowstat-db`

---

## Open Design Decisions

| Decision | Rationale |
|---|---|
| No admin authentication | Simplicity for single-clinic internal use |
| No shared package between frontend/backend | Avoids monorepo complexity; constants duplicated by design |
| Soft-delete only | Preserves audit trail; hard-delete requires direct DB access |
| `peak_flow` column denormalized | Allows ORDER BY / filter without JSON parsing |
| Zone not stored in DB | Calculated at read time from `peak_flow` + `personal_best` |
| No `www.` subdomain | Third-level subdomains not covered by Cloudflare Universal SSL |
