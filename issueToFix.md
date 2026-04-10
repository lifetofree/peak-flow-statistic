# PeakFlowStat — Issues

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

## Notes

- Authentication was intentionally removed for simplicity (open-access design)
- Zone calculations and validation constants are duplicated across frontend/backend by design (no shared package)
- `rotate-token` API endpoint still exists but the UI button has been removed
- Do NOT use `www.peakflowstat.allergyclinic.cc` — third-level subdomains are not covered by Cloudflare Universal SSL
