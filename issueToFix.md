# PeakFlowStatX — Issues

All previously tracked issues have been resolved as of 2026-04-07 (v15).

## Resolved Changes

| Date | Change |
|------|--------|
| 2026-04-07 | v10: Fixed `period` field migration — optional with default `'morning'`. Added `period` to CSV export and audit diff. CSV export sends Authorization header. Created `seed-john.ts`. |
| 2026-04-07 | v11: Documented duplicate validation constants and zone calculation with ⚠️ sync comments in both files. |
| 2026-04-07 | v12: Replaced Math.random() shortCode generation with `crypto.randomBytes()` — cryptographically secure 8-char hex. |
| 2026-04-07 | v13: Removed rotateToken UI button and clickCount display from admin user detail page. |
| 2026-04-07 | v14: Removed native share button from ShareLinkCard. EntryCard notes now show 60-char preview with show more/less toggle. Admin can edit entry records. |
| 2026-04-07 | v15: Added cancel button to admin create user form. |

## Notes

- Authentication was intentionally removed for simplicity (open-access design)
- Zone calculations and validation constants are duplicated across frontend/backend by design (no shared package)
- `seed-jonh.ts` (typo) should be manually deleted; use `seed-john.ts` instead
- `rotate-token` API endpoint still exists but the UI button has been removed
- Do NOT use `www.peakflowstat.allergyclinic.cc` — third-level subdomains are not covered by Cloudflare Universal SSL
- PF values use default color (no zone coloring) in both admin and user pages
- L/min unit is shown in column header (PF (L/min)) not in cell values
- Data structure is consistent: both admin and user APIs return wrapped entry objects (`{ entry: {...}, zone: ... }`)

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
