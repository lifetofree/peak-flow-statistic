# PeakFlowStat — Issues

## Current Status (2026-04-13)

All previously tracked issues from v15 (2026-04-07) have been resolved. The following issues are identified based on the comprehensive code review and current project state.

## Active Issues

### 🔴 HIGH PRIORITY

#### Issue #1: Business Logic in Route Handlers
- **Status:** Known Technical Debt
- **Location:** [`worker/src/routes/user.ts`](worker/src/routes/user.ts:58-113), [`worker/src/routes/admin/users.ts`](worker/src/routes/admin/users.ts:48-81), [`worker/src/routes/admin/entries.ts`](worker/src/routes/admin/entries.ts:55-95)
- **Description:** Business logic is embedded directly in route handlers, violating the Single Responsibility Principle. This makes testing difficult and code harder to maintain.
- **Impact:** Reduced code maintainability, difficult to unit test business logic
- **Recommendation:** Extract business logic into a service layer (e.g., `worker/src/services/entryService.ts`, `worker/src/services/auditService.ts`)
- **Priority:** High - Should be addressed before adding new features

#### Issue #2: N+1 Query in User List with Last Entry Date
- **Status:** Active
- **Location:** [`worker/src/routes/admin/users.ts`](worker/src/routes/admin/users.ts:66-78)
- **Description:** After fetching users, the code fetches ALL entries for those users to find the last entry date. This is inefficient.
- **Impact:** Performance degradation with large datasets, unnecessary database queries
- **Recommendation:** Use a subquery or window function approach to fetch only the latest entry per user
- **Priority:** High - Affects performance with many users

### 🟡 MEDIUM PRIORITY

#### Issue #3: Duplicate Peak Flow Parsing Logic
- **Status:** Active
- **Location:** 
  - [`worker/src/routes/user.ts`](worker/src/routes/user.ts:86-91)
  - [`worker/src/routes/admin/entries.ts`](worker/src/routes/admin/entries.ts:21-33)
  - [`worker/src/routes/admin/users.ts`](worker/src/routes/admin/users.ts:232-237)
- **Description:** Peak flow readings parsing logic is duplicated in multiple places.
- **Impact:** Code duplication, maintenance burden, potential for inconsistencies
- **Recommendation:** Create a shared utility function in `worker/src/lib/peakFlow.ts` (already exists but not fully utilized)
- **Priority:** Medium - Code quality issue

#### Issue #4: Audit Log Writing Duplication
- **Status:** Active
- **Location:** 
  - [`worker/src/routes/admin/users.ts`](worker/src/routes/admin/users.ts:109-117, 151-159, 175-183, 200-208)
  - [`worker/src/routes/admin/entries.ts`](worker/src/routes/admin/entries.ts:118-126, 145-153)
- **Description:** Audit log writing code is duplicated across multiple endpoints.
- **Impact:** Code duplication, maintenance burden
- **Recommendation:** Create an audit service in `worker/src/lib/audit.ts` (already exists but not fully utilized)
- **Priority:** Medium - Code quality issue

#### Issue #5: No Caching for User Profile
- **Status:** Active
- **Location:** [`worker/src/routes/user.ts`](worker/src/routes/user.ts:46-56)
- **Description:** User profile is fetched on every request without caching.
- **Impact:** Unnecessary database queries, increased latency
- **Recommendation:** Implement caching using Cloudflare Workers KV for user profiles
- **Priority:** Medium - Performance optimization

#### Issue #6: No Input Sanitization for Notes on Backend
- **Status:** Partially Addressed
- **Location:** [`worker/src/routes/user.ts`](worker/src/routes/user.ts:139), [`worker/src/routes/admin/users.ts`](worker/src/routes/admin/users.ts:101)
- **Description:** While the frontend uses DOMPurify, the backend doesn't sanitize HTML content before storing it. This could lead to stored XSS if the frontend sanitization is bypassed.
- **Impact:** Potential security vulnerability
- **Recommendation:** Add HTML sanitization on the backend before storing notes
- **Priority:** Medium - Security concern

### 🟢 LOW PRIORITY

#### Issue #7: CSV Generation in Memory
- **Status:** Active
- **Location:** [`worker/src/routes/user.ts`](worker/src/routes/user.ts:160-184), [`worker/src/routes/admin/users.ts`](worker/src/routes/admin/users.ts:213-245)
- **Description:** CSV is built entirely in memory, which could be problematic for large datasets.
- **Impact:** Memory usage for large exports
- **Recommendation:** Use streaming for large exports
- **Priority:** Low - Only affects large datasets

## Resolved Issues (2026-04-07 to 2026-04-14)

| Date | Issue | Resolution |
|------|-------|------------|
| 2026-04-14 | No rate limiting on API routes | ✅ Implemented Cloudflare KV-based rate limiting (v52) |
| 2026-04-14 | Peak flow zone color not displayed | ✅ Implemented zone color display (v53) |
| 2026-04-12 | Duplicate `PAGE_SIZE` declaration | ✅ Fixed (v34) |
| 2026-04-12 | CSV date range filter bug | ✅ Fixed (v34) |
| 2026-04-12 | N+1 query in `/admin/entries` | ✅ Fixed (v36) |
| 2026-04-12 | Missing note Zod validation | ✅ Fixed (v35) |
| 2026-04-12 | No PF value range validation | ✅ Fixed (v35) |
| 2026-04-12 | Frontend fetched ALL pages via sequential loop | ✅ Fixed with `?all=true` (v38) |
| 2026-04-12 | Massive code duplication in table rendering | ✅ Fixed with shared PeakFlowTable (v39) |
| 2026-04-12 | Table headers not localized | ✅ Fixed (v39) |
| 2026-04-12 | Empty cells showed `-` against spec | ✅ Fixed (v39) |
| 2026-04-12 | No date range filter on `/admin/entries` | ✅ Fixed (v37) |
| 2026-04-12 | SQL injection risk in DatabaseClient | ✅ Fixed with allowlists (v46) |
| 2026-04-12 | Date timezone issue in EntryForm | ✅ Fixed (v47) |
| 2026-04-12 | Admin user detail crash | ✅ Fixed (v50) |
| 2026-04-12 | DatabaseClient updateOne binding order | ✅ Fixed (v49) |
| 2026-04-12 | No comprehensive test suite | ✅ Added 32 backend + 24 frontend tests (v48) |

## Notes

- **Authentication:** Intentionally removed for simplicity (open-access design)
- **Zone calculations and validation constants:** Duplicated across frontend/backend by design (no shared package)
- **Rate limiting:** Fully implemented using Cloudflare KV (v52)
- **Zone display:** Fully implemented with color coding (v53)
- **Business logic in route handlers:** Acknowledged as technical debt, documented in AGENTS.md
- **No backend admin auth:** Intentional by design for open-access

## Design Decisions

The following are intentional design choices, not issues:

1. **No Admin Authentication:** The admin panel is intentionally open-access by design. This is suitable for the current use case but should be reconsidered if real patient data is handled in production.

2. **Duplicate Validation Constants:** Validation constants are intentionally duplicated between frontend and backend (no shared package). Both must be kept in sync when updating.

3. **No `www.` Subdomain:** Do NOT use `www.peakflowstat.allergyclinic.cc` — third-level subdomains are not covered by Cloudflare Universal SSL.

4. **Zone Data in API:** Zone data is returned by the API and displayed in the UI (as of v53). Previously it was returned but not displayed.

5. **Soft-Delete Only:** User deletion is soft-delete only (`deleted_at`). Hard-delete requires direct DB access.

6. **Append-Only Audit Log:** Never UPDATE or DELETE `audit_logs` records.

## Next Steps

1. **High Priority:** Address business logic in route handlers by extracting to service layer
2. **High Priority:** Fix N+1 query in user list with last entry date
3. **Medium Priority:** Consolidate duplicate peak flow parsing logic
4. **Medium Priority:** Consolidate audit log writing code
5. **Medium Priority:** Implement caching for user profiles
6. **Medium Priority:** Add backend HTML sanitization for notes
7. **Low Priority:** Implement streaming for CSV exports
