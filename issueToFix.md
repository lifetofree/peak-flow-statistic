# PeakFlowStat — Issues

## ⚠️ CRITICAL: Implementation Discrepancy (Found 2026-04-09)

**A comprehensive code review has revealed that the "Resolved Issues" listed below (v1.1.0) are NOT present in the current codebase. These appear to be missing merges, regressions, or premature documentation.**

### Summary of Missing Implementation:
- **Security**: `DatabaseClient` is still vulnerable to SQL injection (no whitelisting).
- **Security**: `/api/admin/*` remains fully public with no auth middleware.
- **Performance**: N+1 queries persist in `/admin/entries`.
- **Data Integrity**: Zod schemas lack the documented range validation (50-900).
- **Architecture**: `PeakFlowTable.tsx` is implemented but **not integrated**; `UserDashboard` and `AdminUserDetail` still use duplicate legacy table code.
- **API**: Date range filtering (`from`/`to`) is missing in both backend routes and frontend API clients.

---

## Open Issues

### A. ⚠️ No Admin Authentication on Backend (By Design)
- **File:** `worker/src/index.ts`, `worker/src/routes/admin.ts`
- **Problem:** All `/api/admin/*` endpoints are publicly accessible. `authHeaders()` in `client.ts` sends a Bearer token but no backend middleware validates it.
- **Status:** Intentional open-access design, but remains a high-risk security gap.

### B. ⚠️ Hardcoded `admin_id` in Audit Logs (Blocked by A)
- **File:** `worker/src/routes/admin.ts` (all audit log inserts)
- **Problem:** Every audit log uses `admin_id: 'admin'` hardcoded.
- **Status:** Deferred — depends on Issue A.

### C. ⚠️ Missing / Regressed Implementation (High Priority)
1. **Restore SQL Injection Fixes**: Add `ALLOWED_TABLES` and `ALLOWED_ORDER_COLUMNS` to `DatabaseClient`.
2. **Integrate `PeakFlowTable`**: Replace ~300 lines of duplicate code in `UserDashboard.tsx` and `AdminUserDetail.tsx`.
3. **Add Date Range Filtering**: Implement `from`/`to` logic in `worker/src/routes/admin.ts` and `user.ts`.
4. **Fix N+1 Queries**: Optimize `/admin/entries` to avoid per-entry user lookups.
5. **Apply Zod Constraints**: Add `.min(50).max(900)` to all peak flow reading schemas.
6. **Unified Unit Display**: Ensure `(L/min)` is only in headers, not cell values.

---

## Resolved Issues (v1.0.0 Baseline)

*Note: The following were previously marked as resolved in v1.1.0 but have been moved to Section C above due to missing implementation in the current branch.*

- ✅ **Initial Prototype**: Basic CRUD for users and entries.
- ✅ **Localization**: Thai language support via `th.json`.
- ✅ **Mobile Layout**: Responsive card view for user dashboard.
- ✅ **Short Links**: Bitly-like redirection service.

---

## Status Summary (2026-04-09)

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| A | No backend admin auth | Security | ⚠️ By design |
| B | Hardcoded `admin_id` in audit logs | Maintainability | ⚠️ Blocked by A |
| C1| SQL injection risk in DatabaseClient | Security | 🔴 MISSING |
| C2| Table code duplication | Maintainability | 🔴 MISSING |
| C3| Date range filtering | Missing Feature | 🔴 MISSING |
| C4| N+1 in /admin/entries | Performance | 🔴 MISSING |
| C5| PF value range validation | Data integrity | 🔴 MISSING |
