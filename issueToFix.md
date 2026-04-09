# PeakFlowStat — Issues

## Open Issues (Code Review — 2026-04-07)

### 1. [CRITICAL] No Authentication on Admin Endpoints
- **File:** `worker/src/index.ts`, `worker/src/routes/admin.ts`
- **Problem:** All `/api/admin/*` endpoints are publicly accessible with no authentication or authorization. Anyone can create/delete users, view entries, and modify data.
- **Recommendation:** Add middleware to verify admin credentials (e.g., Bearer token, basic auth, or Cloudflare Access) before processing admin routes.

### 9. [MEDIUM] Hardcoded admin_id in Audit Logs
- **File:** `worker/src/routes/admin.ts` (all audit log inserts)
- **Problem:** Every audit log entry uses `admin_id: 'admin'` as a hardcoded string. When authentication is added, this must be replaced with the actual admin user's identity.
- **Recommendation:** Extract admin identity from the auth context/middleware once authentication is implemented.

## Resolved Issues

### ~~2. [MEDIUM] SQL Column Name Injection in database.ts~~ — RESOLVED
- **Fixed in:** v26 (2026-04-07)
- **Fix:** Added `TABLE_COLUMNS` whitelist in `database.ts`. All methods now validate table names and column names before interpolation. Invalid names throw an error.

### ~~3. [MEDIUM] SQL Injection Risk in find() LIKE Clause~~ — RESOLVED
- **Fixed in:** v26 (2026-04-07)
- **Fix:** Replaced implicit `%`-in-value LIKE detection with explicit `{ $like: pattern }` operator syntax. Admin search now uses `filter.first_name = { $like: '%query%' }`. Removed broken `to` date filter that also relied on the implicit `%` convention.

### ~~4. [LOW-MEDIUM] CSV Filename Injection~~ — RESOLVED
- **Fixed in:** v29 (2026-04-07)
- **Fix:** Added filename sanitization in both `admin.ts` and `user.ts` export endpoints. Uses regex to strip all characters except alphanumeric, Thai characters, dots, hyphens, and underscores before setting `Content-Disposition` header.

### ~~5. [MEDIUM] Potential XSS in Markdown Rendering~~ — RESOLVED
- **Fixed in:** v29 (2026-04-07)
- **Fix:** Installed `rehype-sanitize` and added `rehypePlugins={[rehypeSanitize]}` to all 5 `<ReactMarkdown>` usages across `AdminUserDetail.tsx`, `AdminDashboard.tsx`, and `EntryForm.tsx`. Now safe even if `rehype-raw` is ever added.

### ~~6. [MEDIUM] Broken Date Range Filtering in Export Endpoint~~ — RESOLVED
- **Fixed in:** v27 (2026-04-07)
- **Fix:** Added `$gte` and `$lte` operators to `DatabaseClient` `find()` and `count()` methods. Admin export and user entries/export endpoints now use `{ $gte: from, $lte: to }` for proper date range filtering instead of overwriting `filter.date`.

### ~~7. [MEDIUM] peakFlowReadings Type Mismatch (Tuple vs Array)~~ — RESOLVED
- **Fixed in:** v27 (2026-04-07)
- **Fix:** Changed `peakFlowReadings` from `z.tuple([z.number(), z.number(), z.number()])` to `z.array(z.number()).min(1).max(3)` in both `updateEntrySchema` (admin.ts) and `createEntrySchema` (user.ts). Now accepts 1-3 readings.

### ~~8. [LOW] getBestReading() Returns -Infinity on Empty Array~~ — RESOLVED
- **Fixed in:** v30 (2026-04-07)
- **Fix:** Added empty array guard to `getBestReading()` in `zone.ts`. Returns `null` instead of `-Infinity` when readings array is empty. Return type changed to `number | null`.

### ~~10. [LOW-MEDIUM] Soft-Delete Inconsistency — Entries Not Filtered~~ — RESOLVED
- **Fixed in:** v30 (2026-04-07)
- **Fix:** Admin entries endpoint (`GET /admin/entries`) now uses a subquery `WHERE user_id IN (SELECT id FROM users WHERE deleted_at IS NULL)` to exclude entries belonging to soft-deleted users.

### ~~11. [MEDIUM] N+1 Query Problem in Admin Users List~~ — RESOLVED
- **Fixed in:** v28 (2026-04-07)
- **Fix:** Replaced per-user `db.find('entries')` loop with a single `SELECT user_id, MAX(date) FROM entries WHERE user_id IN (...) GROUP BY user_id` query via new `db.rawQuery()` method. Now uses 1 batch query instead of N individual queries.

### ~~12. [LOW-MEDIUM] Missing Validation on Admin Note Update~~ — RESOLVED
- **Fixed in:** v30 (2026-04-07)
- **Fix:** Added `updateNoteSchema = z.object({ adminNote: z.string().max(5000) })` with `zValidator('json', updateNoteSchema)` to the `PATCH /admin/users/:id/note` endpoint. Replaced raw `c.req.json()` with `c.req.valid('json')`.

### ~~13. [LOW] Silent JSON Parse Failures~~ — RESOLVED
- **Fixed in:** v31 (2026-04-07)
- **Fix:** Added `console.warn()` with entry ID and error details to all 4 silent `try/catch` blocks in `admin.ts` (2 locations) and `user.ts` (2 locations) for `JSON.parse(peak_flow_readings)`.

### ~~14. [LOW] Overly Permissive CORS Fallback~~ — RESOLVED
- **Fixed in:** v31 (2026-04-07)
- **Fix:** `CORS_ORIGIN` is now required — middleware throws `Error` at runtime if the env var is missing or empty. No fallback to `*`.

## Resolved Changes

| Date | Change |
|------|--------|
| 2026-04-07 | v10: Fixed `period` field migration — optional with default `'morning'`. Added `period` to CSV export and audit diff. CSV export sends Authorization header. Created `seed-john.ts`. |
| 2026-04-07 | v11: Documented duplicate validation constants and zone calculation with sync comments in both files. |
| 2026-04-07 | v12: Replaced Math.random() shortCode generation with `crypto.randomBytes()` — cryptographically secure 8-char hex. |
| 2026-04-07 | v13: Removed rotateToken UI button and clickCount display from admin user detail page. |
| 2026-04-07 | v14: Removed native share button from ShareLinkCard. EntryCard notes now show 60-char preview with show more/less toggle. Admin can edit entry records. |
| 2026-04-07 | v15: Added cancel button to admin create user form. |
| 2026-04-07 | v22: Fixed short link 404 — patients visiting `/s/:code` saw a blank "Not Found" page. Root cause 1: admin-copied links pointed to `www.peakflowstat.allergyclinic.cc/s/:code` but Cloudflare Pages had no handler for `/s/*`. Fix: added `frontend/public/_redirects` to forward `/s/*` → worker. Root cause 2: worker's redirect used relative URL `/u/:token` which resolved to the API domain, not the frontend. Fix: changed to absolute URL using `FRONTEND_URL` env var. |
| 2026-04-07 | v23: Fixed SSL cert error on `www.peakflowstat.allergyclinic.cc` — third-level subdomains not covered by Universal SSL. Fix: switched to `peakflowstat.allergyclinic.cc` (direct subdomain, covered by `*.allergyclinic.cc`). Fixed Cloudflare Pages build failure caused by `root = "frontend"` in `pages.toml` (double-applied path) and committed `tsconfig.tsbuildinfo` (stale CI cache). Frontend redeployed via GitLab CI/CD integration. |
| 2026-04-07 | v24: Fixed API 404 on admin/user pages — `VITE_API_URL` was missing `/api` suffix, causing frontend to call `api.peakflowstat.allergyclinic.cc/admin/users` instead of `.../api/admin/users`. Fixed Cloudflare Pages CI conflicts: removed root `wrangler.toml` (triggered wrangler deploy) and `frontend/wrangler.toml` (triggered wrangler versions upload). Switched to direct CLI deployment. |
| 2026-04-07 | v25: Fixed "e is not iterable" TypeError on admin user detail page. `GET /api/admin/entries` returned `{ entry: {...}, zone }` per item but `AdminUserDetail` accessed `entry.peakFlowReadings` directly (not `entry.entry.peakFlowReadings`). Fixed by flattening the response shape to include `peakFlowReadings` and `zone` at the top level. |
| 2026-04-07 | v26: Fixed SQL column name injection and LIKE clause injection in database.ts. |
| 2026-04-07 | v27: Fixed date range filtering, fixed peakFlowReadings tuple vs array mismatch. |
| 2026-04-07 | v28: Fixed N+1 query problem in admin users list using batch subquery. |
| 2026-04-07 | v29: Fixed CSV filename injection, added rehype-sanitize to all ReactMarkdown usages. |
| 2026-04-07 | v30: Fixed getBestReading() returning -Infinity, soft-delete entry filtering, admin note Zod validation. |
| 2026-04-07 | v31: Added console.warn() to silent JSON.parse catch blocks; made CORS_ORIGIN env var required (no fallback to *). |

=======
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
## Notes

- Authentication was intentionally removed for simplicity (open-access design)
- Zone calculations and validation constants are duplicated across frontend/backend by design (no shared package)
- `rotate-token` API endpoint still exists but the UI button has been removed
- Do NOT use `www.peakflowstat.allergyclinic.cc` — third-level subdomains are not covered by Cloudflare Universal SSL

---

## Code Review Issues (2026-04-08)

> **Status: All fixable issues resolved on 2026-04-08.**
> Issue #11 (no backend admin auth) is acknowledged as intentional by design.

### Critical Bugs

**1. ✅ FIXED — Duplicate `PAGE_SIZE` declaration in `admin.ts`**
- Removed duplicate `const PAGE_SIZE = 20`. All imports moved to top. Added `PEAK_FLOW_MAX = 900` constant.

**2. ✅ FIXED — CSV date range filter was broken (`admin.ts`)**
- Was: `to` overwrote `from` when both provided.
- Now: uses `{ $gte: from, $lte: to }` operator object. Both bounds applied correctly.

**3. ✅ FIXED — N+1 query in `/admin/entries`**
- Removed per-entry `db.findOne('users', ...)` and `calculateZone()` call entirely. Zone is not used by the frontend (`fetchAdminEntries` returns `Entry[]` with no zone field). Entries now formatted directly.

---

### Missing Validations

**4. ✅ FIXED — `/admin/users/:id/note` had no Zod validation**
- Added `adminNoteSchema = z.object({ adminNote: z.string().max(5000) })` with `zValidator`. Handler uses `c.req.valid('json')`.

**5. ✅ FIXED — `peakFlowReadings` values had no min/max validation**
- Each reading now validated `.int().min(50).max(900)` in both `createEntrySchema` (user.ts) and `updateEntrySchema` (admin.ts).

---

### Performance Issues

**6. ✅ FIXED — Frontend fetched ALL pages via sequential loop on load**
- Added `?all=true` support to both `/api/u/:token/entries` and `/api/admin/entries`. When set, `LIMIT`/`OFFSET` are omitted.
- Both `fetchUserEntries` and `fetchAdminEntries` updated to accept `all?: boolean`.
- `UserDashboard` and `AdminUserDetail` now make a single `all=true` request — no more page loop.

---

### Code Quality

**7. ✅ FIXED — Massive code duplication in table rendering**
- Extracted shared `frontend/src/components/PeakFlowTable.tsx`. Accepts `Entry[]`, handles dedup, grouping, pagination, and note modal internally. Both pages now use `<PeakFlowTable entries={...} />`.

**8. ✅ FIXED — Table headers not localized**
- Added `table` section to `th.json`: `morningBeforeMed`, `morningAfterMed`, `eveningBeforeMed`, `eveningAfterMed`, `pfUnit`. All headers now use `t('table.*')` and `t('entry.*')`.

**9. ✅ FIXED — Empty cells showed `-` against spec**
- `renderPF()` and `renderSpO2()` in `PeakFlowTable` now return `null` for missing entries (no dash placeholder).

**10. ✅ FIXED — No date range filter on `/admin/entries`**
- Added `from`/`to` query params to `GET /admin/entries` using `$gte`/`$lte` operators. `fetchAdminEntries` updated with `from?`/`to?` params.

---

### Security Notes

**11. ⚠️ BY DESIGN — No admin authentication on the backend**
- `authHeaders()` in `client.ts` sends a token but no backend middleware validates it. Intentional open-access design. Revisit if real patient data is handled in production.

**12. ✅ FIXED — SQL injection risk in `DatabaseClient`**
- Added `ALLOWED_TABLES` and `ALLOWED_ORDER_COLUMNS` whitelists. `assertTable()` and `assertOrderColumn()` called in every method. Added `$gte`/`$lte` operator support in `find()` and `count()`.

---

### Fix Summary

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| 1 | Duplicate `PAGE_SIZE` constant | Build error | ✅ Fixed |
| 2 | CSV date range filter bug | Bug | ✅ Fixed |
| 3 | N+1 in `/admin/entries` | Performance | ✅ Fixed |
| 6 | Fetch all pages on load | Performance | ✅ Fixed |
| 4 | Missing note Zod validation | Security | ✅ Fixed |
| 5 | No PF value range validation | Data integrity | ✅ Fixed |
| 7 | Table code duplication | Maintainability | ✅ Fixed |
| 8 | Hardcoded English headers | i18n | ✅ Fixed |
| 9 | Empty cell `-` vs empty | UI consistency | ✅ Fixed |
| 10 | No entry date range search in admin | Missing feature | ✅ Fixed |
| 11 | No backend admin auth | Security (by design) | ⚠️ N/A |
| 12 | SQL injection risk in DatabaseClient | Security | ✅ Fixed |
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
