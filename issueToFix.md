# PeakFlowStat — Issues

## Project Review (2026-04-12)

### Overview
A mobile-first asthma peak flow tracking app deployed on Cloudflare (Pages + Workers + D1). Thai-localized UI. v1.6.0 with 51 iterations of rapid development.

---

### Strengths

1. **Clean architecture**: Worker routes are well-organized (health, user, admin, redirect). Frontend uses TanStack Query properly with lazy-loaded routes.
2. **Good data model**: D1 schema has proper indexes (`idx_users_short_token`, `idx_entries_user_id`, etc.), soft deletes, and append-only audit logs.
3. **Zone calculation**: Clinical-standard green/yellow/red zones correctly implemented in `worker/src/routes/zone.ts`.
4. **Pagination**: Properly implemented with backend pagination across all list views.

---

### Issues & Concerns

#### Critical

1. **SQL injection in `DatabaseClient`** (`worker/src/lib/database.ts`): Table names and column names are interpolated directly into SQL strings. ✅ **FIXED:** `ALLOWED_TABLES` and `ALLOWED_ORDER_COLUMNS` whitelists now exist and are enforced via `assertTable()` and `assertOrderColumn()` functions.

2. **N+1 queries in admin users list** (`worker/src/routes/admin/users.ts:59-68`): ✅ **FIXED:** Now uses batch entry lookup instead of per-user query.

3. **N+1 queries in admin entries** (`worker/src/routes/admin/entries.ts:55-95`): ✅ **FIXED:** Now uses batch user fetching with Map to eliminate per-entry database queries.

4. **No authentication on admin routes**: All admin endpoints are wide open. `requireAdmin` is described in AGENTS.md but there's no middleware enforcing it. Anyone can create/delete users. Issue A acknowledges this as "by design" but this is critical for a medical application.

#### Medium

5. **Pervasive `any` type usage**: ✅ **PARTIALLY FIXED:** Admin routes now use proper TypeScript interfaces (`UserRecord`, `EntryRecord`, `AuditLogRecord`, `FormattedUser`, `FormattedEntry`, `FormattedAuditLog`). Some `any` types still remain in `user.ts` and `database.ts`.

6. **Hardcoded English strings in table headers**: `UserDashboard.tsx:220-247` and `AdminUserDetail.tsx:419-460` have hardcoded "Morning - Before Med", "Evening - After Med", "PF(L/Min)", "SpO2", "Note" instead of using i18n keys. ❌ **STILL PRESENT:** Table headers are hardcoded in component JSX.

7. **`CreateEntryInput` missing `period`** (`frontend/src/types/index.ts:84-90`): ✅ **FIXED:** Type now includes `period: 'morning' | 'evening'`.

8. **CSV export date filtering**: ✅ **FIXED:** Date filtering now works with `from` and `to` query parameters applied in application layer (not via DatabaseClient operators).

9. **`.js` files alongside `.ts` files** in `worker/src/routes/` and `worker/src/lib/`: ✅ **FIXED:** Removed 8 stale .js files from worker/src.

10. **`note` route missing Zod validation**: ✅ **FIXED:** `PATCH /admin/users/:id/note` now uses `zValidator('json', adminNoteSchema)` with `z.string().max(5000)`.

#### Minor

11. **Console.log in production code** (`AdminDashboard.tsx:32`): ✅ **FIXED:** Removed from AdminDashboard.

12. **Duplicated table rendering logic**: ✅ **FIXED:** Table rendering extracted into `EntriesListView.tsx` (user) and `UserEntriesTable.tsx` (admin). Shared `entryGrouping.ts` utility eliminates duplication.

13. **`PeakFlowTable.tsx` component exists** but isn't imported by either `UserDashboard` or `AdminUserDetail`. ⚠️ **DEPRECATED:** Replaced by modular components (`EntriesListView.tsx` and `UserEntriesTable.tsx`).

14. **Seed data uses non-Thai names** (John Smith, Mary Johnson) for a Thai-language clinical app.

15. **`adminNote` Zod validation**: ✅ **FIXED:** Now validates with `z.string().max(5000)` in `adminNoteSchema`.

---

### Architecture Notes

- The `backend/` directory (Express + MongoDB) appears abandoned in favor of `worker/` (Hono + D1). AGENTS.md still documents both extensively, which is confusing. Consider removing `backend/` or clearly marking it deprecated.
- No tests exist — no test files found in `worker/` or `frontend/src/`. ✅ **FIXED:** 56 tests now exist (32 backend + 24 frontend).
- The `DatabaseClient` abstraction is too thin — it doesn't handle range queries, joins, or parameterized column names, forcing workarounds throughout the codebase. ✅ **FIXED:** DatabaseClient now has full column validation, $gte/$lte range operators, shared buildWhereClause.

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

## Recent Changes (2026-04-12)

### Date/Time Display Standardization
- **System-wide datetime storage**: All events (create, edit, delete) now store full datetime in database (`created_at`, `updated_at`, `timestamp`) as ISO 8601 strings
- **Date-only display across UI**: All UI elements now show only date in Thai Buddhist Era format (e.g., "12/04/2569")
- **Updated components** to use `formatThaiDate()` instead of `formatThaiDateTime()`:
  - AdminAuditLog.tsx - Audit log timestamps now show date only
  - NoteModal.tsx (admin) - Note dates now show date only
  - UserNoteModal.tsx - Note dates now show date only
- **Entry cards and tables** - Already using `formatThaiDate()`, no changes needed

### Entry Form UI Improvements
- **Toggle button styling** for period selection (morning/evening) with gray background
- **Toggle button styling** for medication timing (before/after) with gray background
- **Two-column layout** for SpO2 and medication timing on same row for better mobile experience
- **Added Thai translation** `entry.medicationSection` for section header (later removed)

### Rich Text Notes Implementation
- **Created RichTextEditor component** (`frontend/src/components/RichTextEditor.tsx`):
  - Custom WYSIWYG editor with formatting toolbar
  - Supports: Bold, Italic, Underline, Bullet List, Numbered List, Align Left
  - Uses `contenteditable` div with `document.execCommand`
  - All HTML sanitized with DOMPurify to prevent XSS
  - Cursor position preserved during typing
- **Updated UserAdminNote component** (`frontend/src/components/admin/UserAdminNote.tsx`):
  - Replaced ReactMarkdown with RichTextEditor
  - Simplified UI (no more preview/raw toggle)
  - Admin notes stored and displayed as HTML
- **Updated EntryForm component** (`frontend/src/components/EntryForm.tsx`):
  - Replaced textarea + markdown preview with RichTextEditor
  - Patient notes now support rich text formatting
- **Updated EntryCard component** (`frontend/src/components/EntryCard.tsx`):
  - Notes display as rich text HTML with DOMPurify sanitization
  - Creates text preview from HTML for truncated view
- **Updated NoteModal components**:
  - Both admin and user note modals now display HTML content
  - All content sanitized with DOMPurify
- **Removed ReactMarkdown dependency** for notes
- **Fixed cursor jumping issue** in rich text editor:
  - Added `isInitialized` ref to track initialization
  - Prevents unnecessary DOM updates during typing

### Date Filtering Implementation
- **Added DateFilter component** (`frontend/src/components/DateFilter.tsx`):
  - Reusable date range picker with from/to inputs
  - Calendar icon and Thai-localized labels
  - Clear filter button when filters are active
- **Updated user entries API** (`worker/src/routes/user.ts`):
  - Supports `from` and `to` query parameters
  - Filters entries in application layer
  - Proper pagination with filtered results
- **Updated admin entries API** (`worker/src/routes/admin/entries.ts`):
  - Supports `from` and `to` query parameters
  - Filters entries in application layer
  - Proper pagination with filtered results
- **Updated export functions**:
  - `getExportUrl()` now accepts `from` and `to` parameters
  - `getAdminExportUrl()` now accepts `from` and `to` parameters
  - CSV export respects current date filters
- **Added Thai translations** (`frontend/src/i18n/th.json`):
  - `common.dateFilter`: "กรองตามวันที่"
  - `common.fromDate`: "จากวันที่"
  - `common.toDate`: "ถึงวันที่"
  - `common.clearFilter`: "ล้างตัวกรอง"
- **Updated user dashboard** (`frontend/src/pages/UserDashboard.tsx`):
  - Added date filter state and handlers
  - Query key includes date filters for proper caching
  - Page resets to 1 when filters change
- **Updated admin user detail** (`frontend/src/pages/AdminUserDetail.tsx`):
  - Added date filter state and handlers
  - Query key includes date filters for proper caching
  - Page resets to 1 when filters change
  - Export function uses current date filters

### Backend Refactoring
- **Split admin routes** into modular structure (`worker/src/routes/admin/`):
  - `users.ts` - User management (GET, POST, PATCH, DELETE, note, export)
  - `entries.ts` - Entry management (GET, PATCH, DELETE)
  - `audit.ts` - Audit log viewing (GET)
  - `index.ts` - Route aggregator
  - `types.ts` - Shared TypeScript interfaces
- **Fixed N+1 query** in entries route with batch user fetching
- **Replaced `any` types** with proper TypeScript interfaces

### Frontend Refactoring
- **Extracted admin components** (`frontend/src/components/admin/`):
  - `UserProfile.tsx` - User info display and edit form
  - `UserShareLink.tsx` - Share link card wrapper
  - `UserAdminNote.tsx` - Admin note section with preview/edit
  - `UserEntriesTable.tsx` - Entries table with pagination
  - `NoteModal.tsx` - Note viewing modal
- **Extracted user components** (`frontend/src/components/user/`):
  - `ViewModeToggle.tsx` - Card/List view toggle
  - `EntriesCardView.tsx` - Card view with pagination
  - `EntriesListView.tsx` - Table view with pagination
  - `UserNoteModal.tsx` - Note viewing modal
- **Created shared utility** (`frontend/src/utils/entryGrouping.ts`):
  - Entry grouping logic for both dashboards
  - Eliminates code duplication
- **Reduced component sizes**:
  - AdminUserDetail: 578 lines → 183 lines (68% reduction)
  - UserDashboard: 343 lines → 136 lines (60% reduction)
  - Backend admin routes: 421 lines → split across 5 focused files

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

The following issues were previously marked as resolved but are now **actually fixed**:

- ✅ **Issue #1 (SQL injection)**: DatabaseClient now validates table names, column names, and order columns via whitelists. $gte/$lte range operators supported.
- ✅ **Issue #2 (N+1 in `/admin/users`)**: Now uses batch entry lookup instead of per-user query
- ✅ **Issue #3 (N+1 in `/admin/entries`)**: Uses batch user fetching
- ✅ **Issue #4 (No Zod validation on note endpoint)**: Uses `zValidator`
- ✅ **Issue #7 (CreateEntryInput missing period)**: Type now includes `period` field
- ✅ **Issue #8 (CSV export date filtering)**: Uses `$gte`/`$lte` range operators
- ✅ **Issue #9 (.js files in source)**: Removed stale .js files
- ✅ **Issue #10 (No Zod validation on note endpoint)**: Uses `zValidator` with max(5000)
- ✅ **Issue #11 (Console.log in production)**: Removed from AdminDashboard

---

## Resolved Issues (2026-04-12)

### 15. ✅ Date Range Filter Missing from User Dashboard
- **Files:** `frontend/src/pages/UserDashboard.tsx`, `worker/src/routes/user.ts`
- **Was:** No way to filter entries by date range on user dashboard.
- **Fix:** 
  - Added `DateFilter` component with from/to date pickers
  - Backend `/u/:token/entries` now supports `from` and `to` query parameters
  - Filtering applied in application layer with proper pagination
  - Thai localization for all UI labels
  - Page resets to 1 when date filters change

### 16. ✅ Date Range Filter Missing from Admin User Detail
- **Files:** `frontend/src/pages/AdminUserDetail.tsx`, `worker/src/routes/admin/entries.ts`
- **Was:** No way to filter entries by date range on admin user detail page.
- **Fix:**
  - Reused `DateFilter` component
  - Backend `/admin/entries` now supports `from` and `to` query parameters
  - CSV export respects current date filters
  - Filtering applied in application layer with proper pagination
  - Page resets to 1 when date filters change

### 17. ✅ Date Range Filter Missing from CSV Export
- **Files:** `frontend/src/api/admin.tsx`, `frontend/src/api/user.ts`
- **Was:** CSV export didn't support date filtering.
- **Fix:** Updated `getAdminExportUrl()` and `getExportUrl()` to accept optional `from` and `to` parameters and append them to the export URL.

### 18. ✅ Markdown Notes → Rich Text (WYSIWYG)
- **Files:**
  - `frontend/src/components/RichTextEditor.tsx` - New WYSIWYG editor component
  - `frontend/src/components/admin/UserAdminNote.tsx` - Admin notes now use rich text
  - `frontend/src/components/EntryForm.tsx` - User entry notes now use rich text
  - `frontend/src/components/EntryCard.tsx` - HTML note display with DOMPurify
  - `frontend/src/components/admin/NoteModal.tsx` - HTML content display
  - `frontend/src/components/user/UserNoteModal.tsx` - HTML content display
- **Was:** Notes stored and displayed as markdown, requiring ReactMarkdown rendering.
- **Fix:**
  - Created custom WYSIWYG editor with toolbar (bold, italic, underline, lists, alignment)
  - All HTML sanitized with DOMPurify to prevent XSS
  - Fixed cursor jumping issue with `isInitialized` ref
  - Removed ReactMarkdown dependency for notes
  - Notes stored as HTML in database

### 12. ✅ Functions Too Long - Backend Admin Routes (421 lines)
- **File:** `worker/src/routes/admin.ts`
- **Was:** Single file handling all admin routes (users, entries, audit) with mixed concerns.
- **Fix:** Split into modular structure:
  - `worker/src/routes/admin/users.ts` - User management
  - `worker/src/routes/admin/entries.ts` - Entry management
  - `worker/src/routes/admin/audit.ts` - Audit log viewing
  - `worker/src/routes/admin/index.ts` - Route aggregator
  - `worker/src/routes/admin/types.ts` - TypeScript interfaces
- **Additional improvements:**
  - Extracted `parsePeakFlowReadings()` and `getBestReadingFromEntry()` utilities
  - Fixed N+1 query problem with batch user fetching in entries route
  - Replaced `any` types with proper TypeScript interfaces

### 13. ✅ Functions Too Long - AdminUserDetail Page (578 lines)
- **File:** `frontend/src/pages/AdminUserDetail.tsx`
- **Was:** Monolithic component handling user profile, share link, admin note, entries table, and note modal.
- **Fix:** Extracted components in `frontend/src/components/admin/`:
  - `UserProfile.tsx` - User info display and edit form
  - `UserShareLink.tsx` - Share link card wrapper
  - `UserAdminNote.tsx` - Admin note section with preview/edit
  - `UserEntriesTable.tsx` - Entries table with pagination
  - `NoteModal.tsx` - Note viewing modal
- **Additional improvements:**
  - Created `frontend/src/utils/entryGrouping.ts` utility for shared grouping logic
  - Reduced main component to 183 lines (68% reduction)

### 14. ✅ Functions Too Long - UserDashboard Page (343 lines)
- **File:** `frontend/src/pages/UserDashboard.tsx`
- **Was:** Large component with card/list view modes, entry grouping, and table rendering.
- **Fix:** Extracted components in `frontend/src/components/user/`:
  - `ViewModeToggle.tsx` - Card/List view toggle
  - `EntriesCardView.tsx` - Card view with pagination
  - `EntriesListView.tsx` - Table view with pagination
  - `UserNoteModal.tsx` - Note viewing modal
- **Additional improvements:**
  - Reused `entryGrouping.ts` utility
  - Reduced main component to 136 lines (60% reduction)

---

## Previously Resolved Issues (2026-04-08)

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
| 1 | SQL injection in DatabaseClient | Critical | ✅ Fixed (whitelists + column validation) |
| 2 | N+1 in admin users list | Critical | ✅ Fixed (batch entry lookup) |
| 3 | N+1 in admin entries | Critical | ✅ Fixed (batch user fetching) |
| 4 | No admin authentication | Critical | ⚠️ By design (Issue A) |
| 5 | Pervasive `any` type usage | Medium | ⚠️ Partially fixed (admin routes typed, FormattedEntry/FormattedAuditLog fixed) |
| 6 | Hardcoded English table headers | Medium | ❌ Still present |
| 7 | CreateEntryInput missing period | Medium | ✅ Fixed |
| 8 | CSV export date filtering | Medium | ✅ Fixed ($gte/$lte operators) |
| 9 | .js files in source | Medium | ✅ Fixed (removed stale .js files) |
| 10 | No Zod validation on note endpoint | Medium | ✅ Fixed |
| 11 | Console.log in production | Minor | ✅ Fixed |
| 12 | Functions too long (backend admin routes) | Maintainability | ✅ Fixed |
| 13 | Functions too long (AdminUserDetail page) | Maintainability | ✅ Fixed |
| 14 | Functions too long (UserDashboard page) | Maintainability | ✅ Fixed |
| 15 | Date filter missing from user dashboard | Feature | ✅ Fixed |
| 16 | Date filter missing from admin user detail | Feature | ✅ Fixed |
| 17 | Date filter missing from CSV export | Feature | ✅ Fixed |
| 18 | Markdown notes → Rich text (WYSIWYG) | Feature | ✅ Fixed |
| 19 | Date/Time display standardization | Feature | ✅ Fixed |
| 20 | Date timezone issue in EntryForm | Bug | ✅ Fixed (use raw date string) |
| 21 | User entries date filtering done in JS | Performance | ✅ Fixed (SQL-level filtering) |
| 22 | CSV filename header injection | Security | ✅ Fixed (name sanitization) |
| 23 | Comprehensive test suites added | Testing | ✅ Fixed (56 tests passing) |
| 24 | DateFilter removed from user/admin dashboards | UI Simplification | ✅ Fixed |
| 25 | EntriesCardView crash on undefined entry | Bug | ✅ Fixed (pass EntryWithZone objects) |
| 26 | Admin dashboard row not fully clickable | UX | ✅ Fixed (row click + stopPropagation) |
| 27 | SPA catch-all redirect missing in _redirects | Bug | ✅ Fixed (added `* /index.html 200`) |
| 28 | GitHub Actions CI/CD setup | DevOps | ✅ Fixed (deploy.yml for main branch) |
| A | No backend admin auth | Security | ⚠️ By design |
| B | Hardcoded admin_id in audit logs | Maintainability | ⚠️ Blocked by A |

---

## Resolved Issues (2026-04-12) - v1.5.0

### 20. ✅ Date Timezone Issue in EntryForm
- **File:** `frontend/src/components/EntryForm.tsx`
- **Was:** `new Date(date).toISOString()` converted local date to UTC, causing off-by-one day in certain timezones.
- **Fix:** Pass raw date string directly (e.g., `"2026-04-12"`) instead of converting to ISO.

### 21. ✅ User/Admin Entries Date Filtering Done in JavaScript
- **Files:** `worker/src/routes/user.ts`, `worker/src/routes/admin/entries.ts`
- **Was:** Date filtering (`from`/`to`) applied in JavaScript after fetching ALL entries from database. Total count was wrong. Performance issue with large datasets.
- **Fix:** Date filtering now uses SQL `$gte`/`$lte` range operators in DatabaseClient. Proper backend pagination applied after filtering.

### 22. ✅ CSV Filename Header Injection
- **Files:** `worker/src/routes/admin/users.ts`, `worker/src/routes/user.ts`
- **Was:** User first/last name used directly in Content-Disposition header without sanitization.
- **Fix:** Names sanitized to alphanumeric + dash/underscore only.

### 23. ✅ Comprehensive Test Suites Added
- **Backend:** 32 tests in `worker/src/__tests__/` covering zone calculation, DatabaseClient validation, Zod schemas
- **Frontend:** 24 tests in `frontend/src/__tests__/` covering Thai B.E. date formatting, zone calculation, TypeScript type validation
- **All tests passing.**

---

## Resolved Issues (2026-04-12) - v1.4.0

### 19. ✅ Date/Time Display Standardization
- **Files:**
  - `frontend/src/pages/AdminAuditLog.tsx` - Audit log timestamps
  - `frontend/src/components/admin/NoteModal.tsx` - Note dates
  - `frontend/src/components/user/UserNoteModal.tsx` - Note dates
  - `frontend/src/utils/date.ts` - Date formatting utilities
- **Was:** Some UI elements showed datetime (e.g., "12/04/2569 14:30"), others showed only date. Inconsistent display across the application.
- **Fix:**
  - Standardized all datetime storage to use full ISO 8601 strings in database (`created_at`, `updated_at`, `timestamp`)
  - All UI displays now show only date in Thai Buddhist Era format (e.g., "12/04/2569")
  - Updated components to use `formatThaiDate()` instead of `formatThaiDateTime()`
  - Note modals show date only in header, not date+time

---
