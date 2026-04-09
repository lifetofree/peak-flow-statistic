# PeakFlowStat — Issues

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
