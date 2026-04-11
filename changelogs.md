## Changelog

## Current Version
v1.2.0 (2026-04-11)

| Date | Version | Change |
|------|---------|--------|
| 2026-04-11 | v40 | Implemented backend pagination for all list views. User dashboard list mode now fetches 80 entries/page (20 days × 4 entries), card mode 10 entries/page. Admin user detail page fetches 80 entries/page. EntryHistory page fixed to use pagination. All pagination moved from frontend to backend for improved performance with large datasets. Updated AGENTS.md with comprehensive pagination documentation. |
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
| 2026-04-10 | v26 | Added separate environment configurations for local, staging, and production. Created `.env.development`, `.env.staging` for frontend with corresponding build scripts. Created `wrangler.dev.toml`, `wrangler.staging.toml` for worker with deploy scripts. Added `ENVIRONMENTS.md` documentation. Fixed infinite loop in `_redirects` file causing deployment failures. |
