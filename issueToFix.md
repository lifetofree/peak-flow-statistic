# PeakFlowStat — Issues

## Project Review (2026-04-12)

### Overview
A mobile-first asthma peak flow tracking app deployed on Cloudflare (Pages + Workers + D1). Thai-localized UI. v1.2.0 with 40 iterations of rapid development.

---

### Strengths

1. **Clean architecture**: Worker routes are well-organized (health, user, admin, redirect). Frontend uses TanStack Query properly with lazy-loaded routes.
2. **Good data model**: D1 schema has proper indexes (`idx_users_short_token`, `idx_entries_user_id`, etc.), soft deletes, and append-only audit logs.
3. **Zone calculation**: Clinical-standard green/yellow/red zones correctly implemented in `worker/src/routes/zone.ts`.
4. **Pagination**: Properly implemented with backend pagination across all list views.

---

### Issues & Concerns

#### Critical

1. **SQL injection in `DatabaseClient`** (`worker/src/lib/database.ts:10`): Table names and column names are interpolated directly into SQL strings. The `find`, `updateOne`, `deleteOne`, `insertOne` methods all take raw table/column names. The `options.orderBy` at line 26 is directly interpolated: `ORDER BY ${options.orderBy}`. An attacker controlling query params could inject SQL through unsanitized input. The changelog mentions `TABLE_COLUMNS` whitelist (v26) and issueToFix.md marks this as resolved (Issue #11), but **no whitelist exists** in the current `DatabaseClient`.

2. **N+1 queries in admin users list** (`worker/src/routes/admin.ts:28-45`): `GET /admin/users` fetches users, then does `await Promise.all(users.map(async ...))` with a per-user `db.find('entries', ...)` call. This was supposedly fixed in v28 and marked resolved (Issue #28 in changelog), but it's still present in the current code.

3. **N+1 queries in admin entries** (`worker/src/routes/admin.ts:281-305`): `GET /admin/entries` does per-entry user lookup + zone calculation. Changelog v36 says this was removed and issueToFix.md marks it as resolved (Issue #3), but it's still there.

4. **No authentication on admin routes**: All admin endpoints are wide open. `requireAdmin` is described in AGENTS.md but there's no middleware enforcing it. Anyone can create/delete users. Issue A acknowledges this as "by design" but this is critical for a medical application.

#### Medium

5. **Pervasive `any` type usage** (`admin.ts`, `user.ts`, `database.ts`): `DatabaseClient` constructor takes `any`, all query results are cast as `any`. This violates the project's own constraint of "Do NOT use the TypeScript `any` type."

6. **Hardcoded English strings in table headers**: `UserDashboard.tsx:222-246` and `AdminUserDetail.tsx:383-417` have hardcoded "Morning - Before Med", "Evening - After Med", "PF(L/Min)", "SpO2", "Note" instead of using i18n keys. Issue #8 in issueToFix.md marks this as resolved with `PeakFlowTable` extraction, but both pages still inline the full table with hardcoded strings.

7. **`CreateEntryInput` missing `period`** (`frontend/src/types/index.ts:84-90`): The type definition doesn't include `period`, but the form sends it. The backend Zod schema requires it. Type mismatch.

8. **CSV export date filtering is broken** (`worker/src/routes/admin.ts:244-245`): Uses `filter.date = from` (exact match) and `filter.date = \`%${to}%\`` (LIKE hack). Neither produces a proper date range filter. Issue #2 and #10 in issueToFix.md mention `$gte`/`$lte` operators, but `DatabaseClient` doesn't actually support them.

9. **`.js` files alongside `.ts` files** in `worker/src/routes/` and `worker/src/lib/`: Both `.ts` and compiled `.js` exist (`admin.ts` + `admin.js`, etc.). The `.js` files shouldn't be in the source directory.

10. **`note` route missing Zod validation** (`worker/src/routes/admin.ts:209-232`): The `PATCH /admin/users/:id/note` endpoint uses `c.req.json()` directly instead of `zValidator`. Issue #4 in issueToFix.md marks this as resolved, but the code still uses raw `c.req.json()`.

#### Minor

11. **Console.log in production code** (`AdminDashboard.tsx:32`): `console.log('Fetching users...')` and `console.log('Users fetched:', result)` left in.

12. **Duplicated table rendering logic**: `UserDashboard.tsx` and `AdminUserDetail.tsx` have ~150 lines of nearly identical table JSX. Issue #7 in issueToFix.md mentions `PeakFlowTable` as a shared component that was extracted, but both pages still inline the table instead of importing it.

13. **`PeakFlowTable.tsx` component exists** but isn't imported by either `UserDashboard` or `AdminUserDetail`.

14. **Seed data uses non-Thai names** (John Smith, Mary Johnson) for a Thai-language clinical app.

15. **`adminNote` Zod validation** (`admin.ts:209`): Missing `z.string().max(5000)` — uses raw `c.req.json()`. Changelog v35 mentions this was added but it's not in the current code.

---

### Architecture Notes

- The `backend/` directory (Express + MongoDB) appears abandoned in favor of `worker/` (Hono + D1). AGENTS.md still documents both extensively, which is confusing. Consider removing `backend/` or clearly marking it deprecated.
- No tests exist — no test files found in `worker/` or `frontend/src/`.
- The `DatabaseClient` abstraction is too thin — it doesn't handle range queries, joins, or parameterized column names, forcing workarounds throughout the codebase.

---

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

## Documentation Discrepancies

The following issues are marked as **RESOLVED** in issueToFix.md but **STILL PRESENT** in the current codebase:

- **Issue #3 (N+1 in `/admin/entries`)**: Code still has per-entry user lookup at lines 281-305 of `admin.ts`
- **Issue #11 (SQL injection)**: No `ALLOWED_TABLES` or `ALLOWED_ORDER_COLUMNS` whitelists exist in `DatabaseClient`
- **Issue #4 (No Zod validation on note endpoint)**: `PATCH /admin/users/:id/note` still uses raw `c.req.json()` at line 212
- **Issue #8 (Hardcoded table headers)**: Both dashboard pages still have hardcoded English strings in table JSX
- **Issue #7 (Code duplication)**: `PeakFlowTable` exists but is not used; both pages inline the table logic

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

### 5. ✅ Peak Flow Readings Had No Value Range Validation
- **File:** `worker/src/routes/user.ts` (`createEntrySchema`), `worker/src/routes/admin.ts` (`updateEntrySchema`)
- **Was:** Tuple shape validated but individual values unconstrained (e.g. `-99` or `99999` accepted).
- **Fix:** Each reading now validated `.int().min(50).max(900)` with message `'ค่าแรงเป่าลมต้องอยู่ระหว่าง 50-900 L/min'` in both schemas.

### 6. ✅ Frontend Fetched All Pages via Sequential Loop on Load
- **Files:** `frontend/src/pages/UserDashboard.tsx`, `frontend/src/pages/AdminUserDetail.tsx`
- **Was:** On load, fetched page 1, then looped sequentially through all remaining pages — up to 100+ API calls for a 2-year patient.
- **Fix:** Added `?all=true` support to both `/api/u/:token/entries` and `/api/admin/entries`. When set, `LIMIT`/`OFFSET` are omitted. Both `fetchUserEntries` and `fetchAdminEntries` accept `all?: boolean`. Pages now make a single request.

---

## Status Summary

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| 1 | SQL injection in DatabaseClient | Critical | ❌ Still present (marked fixed in docs) |
| 2 | N+1 in admin users list | Critical | ❌ Still present (marked fixed in docs) |
| 3 | N+1 in admin entries | Critical | ❌ Still present (marked fixed in docs) |
| 4 | No admin authentication | Critical | ⚠️ By design (Issue A) |
| 5 | Pervasive `any` type usage | Medium | ❌ Open |
| 6 | Hardcoded English table headers | Medium | ❌ Still present (marked fixed in docs) |
| 7 | CreateEntryInput missing period | Medium | ❌ Open |
| 8 | CSV export date filtering broken | Medium | ❌ Open |
| 9 | .js files in source | Medium | ❌ Open |
| 10 | No Zod validation on note endpoint | Medium | ❌ Still present (marked fixed in docs) |
| 11 | Console.log in production | Minor | ❌ Open |
| 12 | Duplicated table rendering | Minor | ❌ Still present (marked fixed in docs) |
| A | No backend admin auth | Security | ⚠️ By design |
| B | Hardcoded admin_id in audit logs | Maintainability | ⚠️ Blocked by A |
