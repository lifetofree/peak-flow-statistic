# PeakFlowStat — Issues

<<<<<<< HEAD
## Open Issues (Code Review — 2026-04-07)

### 1. [CRITICAL] No Authentication on Admin Endpoints
- **File:** `worker/src/index.ts`, `worker/src/routes/admin.ts`
- **Problem:** All `/api/admin/*` endpoints are publicly accessible with no authentication or authorization. Anyone can create/delete users, view entries, and modify data.
- **Recommendation:** Add middleware to verify admin credentials (e.g., Bearer token, basic auth, or Cloudflare Access) before processing admin routes.

### 2. [MEDIUM] SQL Column Name Injection in database.ts
- **File:** `worker/src/lib/database.ts`
- **Problem:** Column names in SQL queries are interpolated directly from object keys (e.g., `WHERE ${key} = ?`). If filter keys ever come from user input, this allows SQL injection.
- **Recommendation:** Whitelist allowed column names or validate keys against known table schemas before interpolation.

### 3. [MEDIUM] SQL Injection Risk in find() LIKE Clause
- **File:** `worker/src/routes/admin.ts` (line 20), `worker/src/lib/database.ts`
- **Problem:** User search query is injected as `filter.first_name = '%${query}%'` — the `%` wildcards are embedded in the value, but the `database.ts` `find()` method uses `LIKE` only when value contains `%`. This pattern relies on convention rather than explicit parameterization.
- **Recommendation:** Use a dedicated search method with proper `LIKE ? ` parameterized queries instead of embedding wildcards in filter values.

### 4. [LOW-MEDIUM] CSV Filename Injection
- **File:** `worker/src/routes/admin.ts` (line 262)
- **Problem:** `Content-Disposition` header uses `${user.first_name}-${user.last_name}` directly. Names containing special characters (quotes, newlines, semicolons) could corrupt the header or enable response splitting.
- **Recommendation:** Sanitize or encode the filename — strip non-alphanumeric characters or use RFC 5987 encoding (`filename*=UTF-8''...`).

### 5. [MEDIUM] Potential XSS in Markdown Rendering
- **File:** `frontend/src/pages/` (any component rendering user notes)
- **Problem:** If `rehype-raw` is ever enabled in the markdown pipeline, user-supplied notes could inject arbitrary HTML/JS. Currently safe only because raw HTML is not parsed.
- **Recommendation:** Ensure `rehype-raw` is never added, or add `rehype-sanitize` as a safeguard. Document this constraint.

### 6. [MEDIUM] Broken Date Range Filtering in Export Endpoint
- **File:** `worker/src/routes/admin.ts` (lines 244-245)
- **Problem:** Both `from` and `to` parameters set `filter.date`, so `to` overwrites `from`. The `from` value uses exact match while `to` uses LIKE with `%`. Date range filtering does not work.
- **Recommendation:** Use proper SQL `BETWEEN` or `>=` / `<=` operators for date range queries instead of the generic filter object.

### 7. [MEDIUM] peakFlowReadings Type Mismatch (Tuple vs Array)
- **File:** `worker/src/routes/admin.ts` (line 311), frontend entry forms
- **Problem:** `updateEntrySchema` defines `peakFlowReadings` as `z.tuple([z.number(), z.number(), z.number()])` (exactly 3 values), but the frontend and other endpoints treat it as a variable-length array. This will reject valid entries with fewer or more than 3 readings.
- **Recommendation:** Change to `z.array(z.number()).min(1).max(3)` or align frontend/backend on exact tuple requirement.

### 8. [LOW] getBestReading() Returns -Infinity on Empty Array
- **File:** `worker/src/routes/zone.ts`
- **Problem:** `Math.max(...readings)` returns `-Infinity` when `readings` is an empty array. This propagates through zone calculation, producing nonsensical results.
- **Recommendation:** Add a guard: `if (readings.length === 0) return null;`

### 9. [MEDIUM] Hardcoded admin_id in Audit Logs
- **File:** `worker/src/routes/admin.ts` (all audit log inserts)
- **Problem:** Every audit log entry uses `admin_id: 'admin'` as a hardcoded string. When authentication is added, this must be replaced with the actual admin user's identity.
- **Recommendation:** Extract admin identity from the auth context/middleware once authentication is implemented.

### 10. [LOW-MEDIUM] Soft-Delete Inconsistency — Entries Not Filtered
- **File:** `worker/src/routes/admin.ts` (line 272)
- **Problem:** User list filters `deleted_at: null` to exclude soft-deleted users, but entry queries have no such filter. Entries for soft-deleted users still appear in the admin entries list.
- **Recommendation:** Either filter out entries of deleted users, or explicitly document this as intended behavior for audit trail purposes.

### 11. [MEDIUM] N+1 Query Problem in Admin Users List
- **File:** `worker/src/routes/admin.ts` (lines 28-45)
- **Problem:** For each user in the list, a separate query fetches the last entry date (`db.find('entries', { user_id: u.id })`). With 20 users per page, this causes 20+ individual DB queries per request.
- **Recommendation:** Use a single JOIN or subquery to fetch all last entry dates in one query, or batch the lookups.

### 12. [LOW-MEDIUM] Missing Validation on Admin Note Update
- **File:** `worker/src/routes/admin.ts` (line 212)
- **Problem:** The `PATCH /admin/users/:id/note` endpoint uses `await c.req.json()` directly without Zod validation. There is no type checking or length limit on the `adminNote` field.
- **Recommendation:** Add `zValidator` with a schema like `z.object({ adminNote: z.string().max(1000) })`.

### 13. [LOW] Silent JSON Parse Failures
- **File:** `worker/src/routes/admin.ts` (lines 253-256, 283-287)
- **Problem:** Multiple `try { JSON.parse(...) } catch {}` blocks silently swallow parse errors. If `peak_flow_readings` contains corrupted data, the error is hidden and a fallback value is used without logging.
- **Recommendation:** Log parse failures to help diagnose data corruption issues. Consider using `console.warn()` in catch blocks.

### 14. [LOW] Overly Permissive CORS Fallback
- **File:** `worker/src/index.ts`
- **Problem:** If `CORS_ORIGIN` env var is not set, the CORS middleware may default to `*` (allow all origins), which is too permissive for a medical data application.
- **Recommendation:** Require `CORS_ORIGIN` to be set explicitly. Fail startup or reject requests if it is missing.

## Resolved Changes

| Date | Change |
|------|--------|
| 2026-04-07 | v10: Fixed `period` field migration — optional with default `'morning'`. Added `period` to CSV export and audit diff. CSV export sends Authorization header. Created `seed-john.ts`. |
| 2026-04-07 | v11: Documented duplicate validation constants and zone calculation with ⚠️ sync comments in both files. |
| 2026-04-07 | v12: Replaced Math.random() shortCode generation with `crypto.randomBytes()` — cryptographically secure 8-char hex. |
| 2026-04-07 | v13: Removed rotateToken UI button and clickCount display from admin user detail page. |
| 2026-04-07 | v14: Removed native share button from ShareLinkCard. EntryCard notes now show 60-char preview with show more/less toggle. Admin can edit entry records. |
| 2026-04-07 | v15: Added cancel button to admin create user form. |
| 2026-04-07 | v22: Fixed short link 404 — patients visiting `/s/:code` saw a blank "Not Found" page. Root cause 1: admin-copied links pointed to `www.peakflowstat.allergyclinic.cc/s/:code` but Cloudflare Pages had no handler for `/s/*`. Fix: added `frontend/public/_redirects` to forward `/s/*` → worker. Root cause 2: worker's redirect used relative URL `/u/:token` which resolved to the API domain, not the frontend. Fix: changed to absolute URL using `FRONTEND_URL` env var. |
| 2026-04-07 | v25: Fixed "e is not iterable" TypeError on admin user detail page. `GET /api/admin/entries` returned `{ entry: {...}, zone }` per item but `AdminUserDetail` accessed `entry.peakFlowReadings` directly (not `entry.entry.peakFlowReadings`). Fixed by flattening the response shape to include `peakFlowReadings` and `zone` at the top level. |
| 2026-04-07 | v24: Fixed API 404 on admin/user pages — `VITE_API_URL` was missing `/api` suffix, causing frontend to call `api.peakflowstat.allergyclinic.cc/admin/users` instead of `.../api/admin/users`. Fixed Cloudflare Pages CI conflicts: removed root `wrangler.toml` (triggered wrangler deploy) and `frontend/wrangler.toml` (triggered wrangler versions upload). Switched to direct CLI deployment. |
| 2026-04-07 | v23: Fixed SSL cert error on `www.peakflowstat.allergyclinic.cc` — third-level subdomains not covered by Universal SSL. Fix: switched to `peakflowstat.allergyclinic.cc` (direct subdomain, covered by `*.allergyclinic.cc`). Fixed Cloudflare Pages build failure caused by `root = "frontend"` in `pages.toml` (double-applied path) and committed `tsconfig.tsbuildinfo` (stale CI cache). Frontend redeployed via GitLab CI/CD integration. |

=======
>>>>>>> origin/main
## Notes

- Authentication was intentionally removed for simplicity (open-access design)
- Zone calculations and validation constants are duplicated across frontend/backend by design (no shared package)
- `rotate-token` API endpoint still exists but the UI button has been removed
- Do NOT use `www.peakflowstat.allergyclinic.cc` — third-level subdomains are not covered by Cloudflare Universal SSL
- PF values use default color (no zone coloring) in both admin and user pages
- L/min unit is shown in column header (PF (L/min)) not in cell values
- Admin entries API (`/api/admin/entries`) returns flat `Entry[]` — no zone field
- User entries API (`/api/u/:token/entries`) returns `EntryWithZone[]` wrapped as `{ entry, zone }`

---

## Open Issues

### A. ⚠️ No Admin Authentication on Backend (By Design)
- **File:** `worker/src/index.ts`, `worker/src/routes/admin.ts`
- **Problem:** All `/api/admin/*` endpoints are publicly accessible. `authHeaders()` in `client.ts` sends a Bearer token but no backend middleware validates it.
- **Status:** Intentional open-access design. Revisit before handling real patient data in production.

### B. ⚠️ Hardcoded `admin_id` in Audit Logs (Blocked by A)
- **File:** `worker/src/routes/admin.ts` (all audit log inserts)
- **Problem:** Every audit log uses `admin_id: 'admin'` hardcoded. Cannot be fixed properly until authentication (Issue A) is implemented.
- **Status:** Deferred — depends on Issue A.

---

## Resolved Issues (2026-04-08)

### 1. ✅ Duplicate `PAGE_SIZE` Declaration — Build Error
- **File:** `worker/src/routes/admin.ts`
- **Was:** `PAGE_SIZE = 20` declared twice (as `export const` at top and `const` in body). Compile error.
- **Fix:** Removed duplicate. All imports moved to top. Added `PEAK_FLOW_MAX = 900` constant.

### 2. ✅ CSV Date Range Filter Overwrote `from` with `to`
- **File:** `worker/src/routes/admin.ts` — `GET /admin/users/:id/export`
- **Was:** `if (to) filter.date = ...` clobbered `filter.date` set by `if (from)`.
- **Fix:** Both bounds now use a `{ $gte: from, $lte: to }` operator object supported by `DatabaseClient`.

### 3. ✅ N+1 Query in `/admin/entries`
- **File:** `worker/src/routes/admin.ts`
- **Was:** `db.findOne('users', ...)` + `calculateZone()` called per entry inside `Promise.all`.
- **Fix:** Removed user lookup and zone calculation entirely. Zone is unused by frontend (`Entry[]` type has no zone field). Entries formatted directly.

### 4. ✅ No Zod Validation on Admin Note Endpoint
- **File:** `worker/src/routes/admin.ts` — `PATCH /admin/users/:id/note`
- **Was:** `const { adminNote } = await c.req.json()` — raw unvalidated JSON.
- **Fix:** Added `adminNoteSchema = z.object({ adminNote: z.string().max(5000) })` with `zValidator`. Handler uses `c.req.valid('json')`.

### 5. ✅ Peak Flow Readings Had No Value Range Validation
- **File:** `worker/src/routes/user.ts` (`createEntrySchema`), `worker/src/routes/admin.ts` (`updateEntrySchema`)
- **Was:** Tuple shape validated but individual values unconstrained (e.g. `-99` or `99999` accepted).
- **Fix:** Each reading now validated `.int().min(50).max(900)` with message `'ค่าแรงเป่าลมต้องอยู่ระหว่าง 50-900 L/min'` in both schemas.

### 6. ✅ Frontend Fetched All Pages via Sequential Loop on Load
- **Files:** `frontend/src/pages/UserDashboard.tsx`, `frontend/src/pages/AdminUserDetail.tsx`
- **Was:** On load, fetched page 1, then looped sequentially through all remaining pages — up to 100+ API calls for a 2-year patient.
- **Fix:** Added `?all=true` support to both `/api/u/:token/entries` and `/api/admin/entries`. When set, `LIMIT`/`OFFSET` are omitted. Both `fetchUserEntries` and `fetchAdminEntries` accept `all?: boolean`. Pages now make a single request.

### 7. ✅ Massive Code Duplication in Pivot Table Rendering
- **Files:** `frontend/src/pages/UserDashboard.tsx`, `frontend/src/pages/AdminUserDetail.tsx`
- **Was:** ~150 lines of identical `<table>`, `renderCell`, `renderSpO2`, `renderNote`, pagination, and note modal code copy-pasted in both files.
- **Fix:** Extracted `frontend/src/components/PeakFlowTable.tsx`. Accepts flat `Entry[]`, handles deduplication, date grouping, 20-dates/page pagination, and note modal internally. Both pages now use `<PeakFlowTable entries={...} />`.

### 8. ✅ Table Headers Hardcoded in English
- **Files:** `UserDashboard.tsx`, `AdminUserDetail.tsx`
- **Was:** "Morning - Before Med", "Evening - After Med", "Date", "PF (L/min)" hardcoded strings.
- **Fix:** Added `table` section to `th.json` (`morningBeforeMed`, `morningAfterMed`, `eveningBeforeMed`, `eveningAfterMed`, `pfUnit`). All headers now use `t('table.*')` and `t('entry.*')`. Also added `common.noData` key.

### 9. ✅ Empty Cells Showed `-` Against Spec
- **File:** `frontend/src/components/PeakFlowTable.tsx`
- **Was:** `renderCell()` / `renderSpO2()` returned `<span className="text-gray-300">-</span>` for missing entries.
- **Fix:** Both helpers return `null`. Cells are empty per spec ("Empty cells: Empty (no '-' placeholder)").

### 10. ✅ No Date Range Filter on `/admin/entries`
- **File:** `worker/src/routes/admin.ts`, `frontend/src/api/admin.ts`
- **Was:** `/admin/entries` only filtered by `userId`. No date range support.
- **Fix:** Added `?from=` and `?to=` query params using `$gte`/`$lte` operators. `fetchAdminEntries` updated with `from?` and `to?` params.

### 11. ✅ SQL Injection Risk in `DatabaseClient` (Table / Column Names)
- **File:** `worker/src/lib/database.ts`
- **Was:** `table` and `orderBy` parameters interpolated directly into SQL string. No whitelist.
- **Fix:** Added `ALLOWED_TABLES` (`users`, `entries`, `audit_logs`) and `ALLOWED_ORDER_COLUMNS` whitelists. `assertTable()` and `assertOrderColumn()` called in every method. Also added `$gte`/`$lte` operator support in `find()` and `count()`, and fixed `limit !== undefined` guard (was `if (options?.limit)` which skipped `limit: 0`).

---

## Status Summary

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| A | No backend admin auth | Security | ⚠️ By design |
| B | Hardcoded `admin_id` in audit logs | Maintainability | ⚠️ Blocked by A |
| 1 | Duplicate `PAGE_SIZE` constant | Build error | ✅ Fixed 2026-04-08 |
| 2 | CSV date range filter bug | Bug | ✅ Fixed 2026-04-08 |
| 3 | N+1 in `/admin/entries` | Performance | ✅ Fixed 2026-04-08 |
| 4 | Missing note Zod validation | Security | ✅ Fixed 2026-04-08 |
| 5 | No PF value range validation | Data integrity | ✅ Fixed 2026-04-08 |
| 6 | Sequential page-loop on load | Performance | ✅ Fixed 2026-04-08 |
| 7 | Table code duplication | Maintainability | ✅ Fixed 2026-04-08 |
| 8 | Hardcoded English table headers | i18n | ✅ Fixed 2026-04-08 |
| 9 | Empty cells showed `-` | UI consistency | ✅ Fixed 2026-04-08 |
| 10 | No date range filter on admin entries | Missing feature | ✅ Fixed 2026-04-08 |
| 11 | SQL injection risk in DatabaseClient | Security | ✅ Fixed 2026-04-08 |
