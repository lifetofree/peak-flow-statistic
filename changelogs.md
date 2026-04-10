## Changelog

<<<<<<< HEAD
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
| 2026-04-07 | v21: Deployed full-stack to Cloudflare: Workers backend + D1 database + Pages frontend at peakflowstat.allergyclinic.cc |
| 2026-04-07 | v22: Fixed short link 404. Two root causes: (1) `/s/:code` was not handled on frontend domain — added `frontend/public/_redirects` to forward `/s/*` to worker. (2) Worker redirect used relative URL `/u/:token` which resolved to API domain — fixed to use absolute `FRONTEND_URL` env var. |
| 2026-04-07 | v25: Fixed `GET /api/admin/entries` response shape — was wrapping each entry as `{ entry: {...}, zone }` but `AdminUserDetail` expected flat objects with `peakFlowReadings` directly on each item, causing "e is not iterable" TypeError. Flattened response to `{ _id, peakFlowReadings, zone, ... }`. Added 20 sample users (English names, no entries) to D1. |
| 2026-04-07 | v24: Fixed API 404 on admin page — `VITE_API_URL` was missing `/api` suffix (called `/admin/users` instead of `/api/admin/users`). Removed root `wrangler.toml` and `frontend/wrangler.toml` (caused Pages CI to run `wrangler deploy`/`wrangler versions upload` instead of `npm run build`). Switched frontend deployment to direct CLI (`wrangler pages deploy`) instead of GitLab CI/CD integration. |
| 2026-04-07 | v23: Full Cloudflare redeployment from scratch. Deleted old Pages (peakflowstatx), Workers (peakflowstat-api, peakflowstatx-backend), and D1 (peakflowstatx-db). Created new D1 (id: 812f290e). Changed frontend domain from `www.peakflowstat.allergyclinic.cc` to `peakflowstat.allergyclinic.cc` (no www) to use Universal SSL. Frontend now deployed via Cloudflare Pages GitLab CI/CD integration (auto-deploy on push). Fixed `pages.toml` — removed duplicate `root = "frontend"`. Removed `tsconfig.tsbuildinfo` from git (build cache). Added `/* /index.html 200` SPA fallback to `_redirects`. |
| 2026-04-10 | v26: Added separate environment configurations for local, staging, and production. Created `.env.development`, `.env.staging` for frontend with corresponding build scripts. Created `wrangler.dev.toml`, `wrangler.staging.toml` for worker with deploy scripts. Added `ENVIRONMENTS.md` documentation. Fixed infinite loop in `_redirects` file causing deployment failures. |
=======
## Current Version
v1.1.0 (2026-04-08)


| Date | Version | Change |
|------|---------|--------|
| 2026-04-08 | v39 | PeakFlowTable extracted as shared component used by UserDashboard and AdminUserDetail. Table headers localized via th.json table section. Empty cells render null (no dash). |
| 2026-04-08 | v38 | Frontend fetches all entries in single request using ?all=true. Replaced sequential page-loop with single API call in UserDashboard and AdminUserDetail. fetchUserEntries and fetchAdminEntries updated with all/from/to params. |
| 2026-04-08 | v37 | Added date range filter (from/to) to GET /admin/entries using $gte/$lte operators. |
| 2026-04-08 | v36 | Fixed N+1 in /admin/entries: removed per-entry user lookup and zone calculation. Zone not used by frontend Entry type. |
| 2026-04-08 | v35 | Added Zod validation (max 5000) to PATCH /admin/users/:id/note. peakFlowReadings each value now validated int min 50 max 900 in both admin and user routes. Added PEAK_FLOW_MAX = 900 constant. |
| 2026-04-08 | v34 | Fixed duplicate PAGE_SIZE declaration in admin.ts (build error). Fixed import ordering. Fixed CSV date range filter overwrite bug using $gte/$lte. Added ALLOWED_TABLES and ALLOWED_ORDER_COLUMNS whitelists to DatabaseClient with $gte/$lte operator support. Fixed limit !== undefined guard. |
| 2026-04-07 | v33 | User dashboard table: same layout as admin (date/period/med grouping, 20 dates/page, pagination). Card view: 10 cards/page pagination. PF header shows (L/min), PF values use default color (no zone). Note icon only shows when entry has note. common.close added to th.json. |
| 2026-04-07 | v32 | Admin user detail table: grouped by date, period, medication timing. Separate PF/SpO2/Note columns. Note shows 📄 icon, click for modal. |
| 2026-04-07 | v31 | Added CORS_ORIGIN required check. Added console.warn to JSON.parse catch blocks. |
| 2026-04-07 | v30 | Fixed getBestReading() null on empty array. Admin entries excludes soft-deleted users. Admin note Zod validation max 5000. |
| 2026-04-07 | v29 | CSV filename sanitization. rehype-sanitize added to all ReactMarkdown usages. |
| 2026-04-07 | v28 | Fixed N+1 query in admin users list using batch subquery. |
| 2026-04-07 | v27 | Added $gte/$lte operators. peakFlowReadings validation fixed to array (not tuple). |
| 2026-04-07 | v26 | TABLE_COLUMNS whitelist prevents SQL injection. |
| 2026-04-07 | v25 | Flattened admin entries response. Added 20 sample users to D1. |
| 2026-04-07 | v24 | Fixed VITE_API_URL missing /api. Removed duplicate wrangler.toml files. |
| 2026-04-07 | v23 | Full Cloudflare redeployment. New D1, new domain peakflowstat.allergyclinic.cc |
| 2026-04-07 | v22 | Fixed short link 404 - _redirects and absolute FRONTEND_URL |
| 2026-04-07 | v21 | Deployed full-stack to Cloudflare |
>>>>>>> origin/main
