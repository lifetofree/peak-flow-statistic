# PeakFlowStat Project Context

## Project Overview

PeakFlowStat is a **mobile-first** web application for asthma patients to track peak flow measurements and visualize trends. Users access their personal dashboard via a unique short link — no login required. The interface is in Thai (Buddhist Era dates). Administrative features are directly accessible at /admin to manage users and audit all data changes.

### Key Features

- **Patient Dashboard:** Shows user name + recent entry list with **card/table view toggle**. Cards show all peak flow readings (not just best). Table view expands to full width.
- **Easy Entry:** Simplified form for recording 3 peak flow readings, SpO2, medication timing (before/after), and morning/evening period.
- **Admin Management:** Directly accessible panel with **clickable rows** to navigate to user detail. **Table-based entry display** grouped by date with morning/evening × before/after columns.
- **Markdown Notes:** Support for Markdown in patient entries and admin-only notes for each user.
- **Data Export:** Export patient data to CSV for clinical review.
- **Audit Logging:** Transparent tracking of all data modifications.
- **Bitly-like Short Links:** Each user gets an 8-character cryptographically random `shortCode`. Visiting `/s/:code` triggers a server-side 302 redirect to their dashboard.

### Main Technologies

- **Frontend:** React (TypeScript), Vite, React Router v6, TanStack Query (React Query), Tailwind CSS, react-i18next, react-markdown, rehype-sanitize, qrcode.react
- **Backend:** Cloudflare Workers (Hono.js), D1 (SQLite), Zod + zValidator
- **Localization:** Thai only (`th.json`)
- **Deployment:** Cloudflare Workers + D1 + Pages

---

## Notes

- Authentication was intentionally removed for simplicity (open-access design)
- Zone calculations and validation constants are duplicated across frontend/backend by design (no shared package)
- `rotate-token` API endpoint still exists but is UI button has been removed
- Do NOT use `www.peakflowstat.allergyclinic.cc` — third-level subdomains are not covered by Cloudflare Universal SSL
- PF values use default color (no zone coloring) in both admin and user pages
- L/min unit is shown in column header (PF (L/min)) not in cell values
- Data structure is consistent: both admin and user APIs return wrapped entry objects (`{ entry: {...}, zone: ... }`)
- PF values show zone color in admin detail table but default color in user dashboard table (per v33 user request)
- Note icon only shows when entry has a note (per v31 and v32 user request)

---

## Current Project State (2026-04-07)

### Web Title
- **"Peak Flow Stat - Allergy Clinic"** (updated from "PeakFlowStatX")

### User Dashboard
- Card view (default) / Table view toggle
- **Card view**: 10 cards per page with pagination
- **Table view**: Expands to full screen width (`max-w-full`), grouped by date/period/medication timing, 20 dates per page with pagination
- Peak flow displays all 3 values (e.g., "450 / 460 / 455") - not just best value
- PF column header shows "(L/min)" unit
- PF and SpO2 values displayed as **regular text** (not bold, no zone color)
- Note icon only shows when entry has a note

### Admin User Detail Table Layout
- **Header Row 1:** Date | Morning - Before Med | Morning - After Med | Evening - Before Med | Evening - After Med
- **Header Row 2:** (under each period) PF (L/min) | SpO₂ | Note
- **Data rows:** Grouped by date, entries split by period AND medication timing, 20 dates per page with pagination
- **Note column:** Shows 📄 icon only when entry has note, click to view full note in modal
- **Empty cells:** Empty (no "-" placeholder)
- Each cell shows: PF/SpO₂ as separate columns
- PF values use default color (no zone coloring)

### Entry Grouping Logic
- Entries grouped by `date-period-medicationTiming` combination
- If multiple entries exist for same combination, **latest by createdAt** is kept
- Example: 29/03/2569 morning/before has 2 entries → shows only the latest

### Localization
- `common.close` = "ปิด" (added to th.json under common section)

---

## File & Folder Structure

```
PeakFlowStat/
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── admin.ts
│   │   │   └── client.ts
│   │   ├── components/
│   │   │   ├── EntryCard.tsx
│   │   │   ├── EntryForm.tsx
│   │   │   └── ShareLinkCard.tsx
│   │   ├── i18n/
│   │   │   └── th.json
│   │   ├── pages/
│   │   │   ├── AdminAuditLog.tsx
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── AdminUserDetail.tsx
│   │   │   ├── EntryHistory.tsx
│   │   │   ├── NewEntry.tsx
│   │   │   └── UserDashboard.tsx
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── utils/
│   │       ├── date.ts
│   │       └── zone.ts
│   ├── public/
│   │   └── _redirects
│   ├── index.html (title: "Peak Flow Stat - Allergy Clinic")
│   ├── package.json
│   └── vite.config.ts
├── worker/
│   ├── src/
│   │   ├── index.ts
│   │   ├── lib/
│   │   │   ├── database.ts
│   │   │   └── jwt.ts
│   │   └── routes/
│   │       ├── admin.ts
│   │       ├── health.ts
│   │       ├── redirect.ts
│   │       └── user.ts
│   ├── migrations/
│   │   └── 0001_schema.sql
│   ├── wrangler.toml
│   └── .dev.vars
├── docker-compose.yml (MongoDB backend - legacy)
├── backend/ (Express backend - legacy)
└── AGENTS.md
```

---

## Frontend Routes (React Router v6)

| Path | Page Component | Description |
|------|---------------|-------------|
| `/u/:token` | `UserDashboard` | User name + entry list with card/table toggle |
| `/u/:token/new` | `NewEntry` | Entry form (peak flow, SpO2, medication, period) |
| `/u/:token/entries` | `EntryHistory` | Full paginated entry list |
| `/admin` | `AdminDashboard` | User list with **clickable rows** to navigate |
| `/admin/users/:id` | `AdminUserDetail` | User entries in **table grouped by date/period/med** |
| `/admin/audit` | `AdminAuditLog` | Paginated audit log viewer |

> `/s/:code` redirects to worker which does 302 to `/u/:shortToken`

---

## Data Models

### User (D1)

```sql
id TEXT PRIMARY KEY
first_name TEXT NOT NULL
last_name TEXT NOT NULL
nickname TEXT NOT NULL
short_token TEXT UNIQUE NOT NULL
short_code TEXT UNIQUE NOT NULL
click_count INTEGER DEFAULT 0
personal_best INTEGER
admin_note TEXT
deleted_at TEXT
created_at TEXT
updated_at TEXT
```

### Entry (D1)

```sql
id TEXT PRIMARY KEY
user_id TEXT NOT NULL
date TEXT NOT NULL
period TEXT NOT NULL ('morning' | 'evening')
medication_timing TEXT NOT NULL ('before' | 'after')
peak_flow_readings TEXT (JSON array [n1,n2,n3])
spo2 INTEGER
note TEXT
created_at TEXT
updated_at TEXT
```

---

## API Endpoints

### User Routes

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/u/:token` | Get user profile |
| `GET` | `/api/u/:token/entries` | Paginated entries (20/page) |
| `POST` | `/api/u/:token/entries` | Create entry |
| `GET` | `/api/u/:token/export` | CSV export |

### Admin Routes

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/users` | List users with search, paginated |
| `POST` | `/api/admin/users` | Create user |
| `GET` | `/api/admin/users/:id` | Get user details |
| `PATCH` | `/api/admin/users/:id` | Update user |
| `DELETE` | `/api/admin/users/:id` | Soft-delete user |
| `PATCH` | `/api/admin/users/:id/note` | Update admin note |
| `GET` | `/api/admin/entries` | All entries paginated |
| `DELETE` | `/api/admin/entries/:id` | Delete entry |
| `GET` | `/api/admin/audit` | Audit log paginated |

---

## Running Locally

### Prerequisites
- Node.js
- Wrangler CLI (`npm i -g wrangler`)
- Python3 (for sample data generation)

### Start Backend (Worker with remote D1)
```bash
cd worker
npm install
wrangler dev --remote
# Runs on http://localhost:8787
```

### Start Frontend
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

### Frontend API URL
Set in `frontend/.env`:
```
VITE_API_URL=http://localhost:8787/api
```

---

## Generate Sample Data

```python
import requests
from datetime import datetime, timedelta

BASE = "http://localhost:8787/api"

for i in range(30):
    date = (datetime.utcnow() - timedelta(days=i+1)).replace(hour=8, minute=0)
    
    # Morning Before Med
    requests.post(f"{BASE}/u/{TOKEN}/entries", json={
        "date": date.isoformat() + "Z",
        "peakFlowReadings": [380 + i*7, 370 + i*11, 360 + i*13],
        "spO2": 94 + i % 4,
        "medicationTiming": "before",
        "period": "morning",
        "note": f"Morning before med day {i+1}"
    })
    
    # Morning After Med
    # ... (similar pattern)
    
    # Evening Before Med
    # ... (similar pattern)
    
    # Evening After Med
    # ... (similar pattern)
```

---
