## Changelog

## Current Version
v1.10.0 (2026-04-13)

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-04-13 | v1.10.0 | Updated AGENTS.md with comprehensive project documentation including rate limiting implementation, new test files (api-flows.test.ts, rate-limit.test.ts), DevModeBanner component, and updated file structure. Added references to RATE_LIMITING.md and TEST_PROTOCOL.md documentation. Updated Security section with rate limiting details. Updated Testing section with comprehensive test suite information. Added missing files to file structure (audit.ts, peakFlow.ts, pagination.ts). |
| 2026-04-14 | v53 | Implemented peak flow zone color display (B-03). EntryCard now shows ZoneBadge and color-coded peak flow values. EntriesListView and UserEntriesTable (admin) now display zone-colored peak flow readings. Fixed hardcoded English strings in table headers to use i18n keys. Updated entryGrouping.ts to preserve zone data through date grouping. |
| 2026-04-14 | v52 | Implemented rate limiting on all API routes using Cloudflare KV. Patient routes (/api/u/:token/*) limited to 100 requests/15min per IP. Admin routes limited to 300 requests/15min per IP. Returns 429 with Retry-After header when limit exceeded. Added rate limit headers (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset) to all API responses. Created comprehensive unit tests for rate limiting middleware. Updated ENVIRONMENTS.md with KV namespace setup instructions. |
| 2026-04-12 | v50 | Fixed admin user detail crash: entryGrouping.ts now guards against undefined `date` field. Added `.github/workflows/deploy.yml` for CI/CD. |
| 2026-04-12 | v49 | Fixed DatabaseClient `updateOne` binding order — SET values must come before WHERE values. Fixed `count()` to use shared `buildWhereClause` for consistent filter handling including $gte/$lte and IN clauses. |
| 2026-04-12 | v48 | Added comprehensive test suites: 32 backend tests (zone calculation, DatabaseClient validation, Zod schemas) and 24 frontend tests (Thai B.E. date formatting, zone calculation, TypeScript type validation). All tests passing. |
| 2026-04-12 | v47 | Fixed date timezone issue in EntryForm: use raw date string instead of `new Date(date).toISOString()` which caused off-by-one day due to timezone conversion. Fixed CSV filename header injection by sanitizing user names. |
| 2026-04-12 | v46 | Security and performance fixes. Rewrote DatabaseClient with full column name validation, $gte/$lte range query support, and shared buildWhereClause helper. Fixed N+1 query in admin users list using batch entry lookup. Fixed date filtering in user entries and admin entries to use SQL-level filtering instead of client-side JS filtering. Added proper backend pagination with date filters. Removed stale .js files from worker/src. Removed console.log from AdminDashboard. Fixed CreateEntryInput type to include period field. Removed any types from FormattedEntry and FormattedAuditLog. |
| 2026-04-12 | v45 | Updated date/time display across the system. All events (create, edit, delete) now store full datetime in database (`created_at`, `updated_at`, `timestamp`). All UI displays now show only date in Thai Buddhist Era format (e.g., "12/04/2569"). Updated AdminAuditLog, NoteModal, and UserNoteModal to use formatThaiDate instead of formatThaiDateTime. |
| 2026-04-12 | v44 | Changed both admin notes and user notes to use rich text (WYSIWYG) editor instead of markdown. Created custom RichTextEditor component with formatting toolbar (bold, italic, underline, lists, alignment). Replaced textarea with rich text editor in EntryForm. Updated EntryCard and NoteModal to display rich text HTML properly. All HTML content sanitized with DOMPurify. Fixed cursor jumping issue in rich text editor. |
| 2026-04-12 | v43 | Added date range filtering to user dashboard and admin user detail pages. Created reusable DateFilter component with Thai localization. Backend now supports `from` and `to` query parameters for entries. CSV export respects current date filters. Page resets to 1 when date filters change. Added Thai translation keys for date filter UI. Fixed DatabaseClient array value support for IN clauses. Added error handling to admin entries API. |
| 2026-04-12 | v42 | Refactored backend admin routes from 421-line monolith into modular structure. Split into users.ts, entries.ts, audit.ts, index.ts, and types.ts. Fixed N+1 query in entries route with batch user fetching. Replaced `any` types with proper TypeScript interfaces. Created utility functions for peak flow parsing. |
| 2026-04-12 | v41 | Refactored frontend components to eliminate code duplication. Extracted admin components: UserProfile, UserShareLink, UserAdminNote, UserEntriesTable, NoteModal. Extracted user components: ViewModeToggle, EntriesCardView, EntriesListView, UserNoteModal. Created shared entryGrouping.ts utility. Reduced AdminUserDetail from 578 to 183 lines (68% reduction). Reduced UserDashboard from 343 to 136 lines (60% reduction). |
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

## Summary of Major Features

### v1.10.0 (2026-04-13)
- Documentation updates to reflect current project state
- Added missing files to AGENTS.md file structure

### v53 (2026-04-14)
- Peak flow zone color display implementation
- ZoneBadge component restored and integrated
- Color-coded peak flow values in tables and cards

### v52 (2026-04-14)
- Rate limiting implementation using Cloudflare KV
- Separate limits for patient (100/15min) and admin (300/15min) routes
- Comprehensive rate limiting tests

### v50-v49 (2026-04-12)
- Bug fixes for admin user detail and DatabaseClient
- Improved error handling and data consistency

### v48 (2026-04-12)
- Comprehensive test suite added (32 backend + 24 frontend tests)
- All tests passing

### v47-v46 (2026-04-12)
- Security and performance improvements
- SQL injection prevention
- N+1 query fixes
- Date filtering improvements

### v45 (2026-04-12)
- Date/time display standardization
- Thai Buddhist Era format throughout UI

### v44 (2026-04-12)
- Rich text editor implementation
- WYSIWYG editor for notes
- DOMPurify sanitization

### v43 (2026-04-12)
- Date range filtering feature
- Reusable DateFilter component
- CSV export with date filters

### v42 (2026-04-12)
- Backend refactoring
- Modular route structure
- Improved code organization

### v41 (2026-04-12)
- Frontend component refactoring
- Code duplication elimination
- Shared utilities

### v40 (2026-04-11)
- Backend pagination implementation
- Improved performance for large datasets

### v39-v38 (2026-04-08)
- Shared PeakFlowTable component
- Single-request entry fetching

### v37-v34 (2026-04-08)
- Date range filtering improvements
- N+1 query fixes
- Validation enhancements

### v33-v21 (2026-04-07)
- Initial feature implementations
- Bug fixes and improvements
- Cloudflare deployment setup
