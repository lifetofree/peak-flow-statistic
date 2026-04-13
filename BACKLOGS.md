# PeakFlowStat — Feature Backlog

Prioritized list of suggested features and improvements.

## High Priority

### ~~B-01: Rate Limiting on Worker Routes~~ ✅ COMPLETED (v52)
- **Why:** No rate limiting on Cloudflare Worker. Patient-facing routes (`/api/u/:token/*`) and admin routes are unlimited. Vulnerable to abuse.
- **Scope:** Implement per-IP rate limiting using Cloudflare's built-in features or custom middleware. 100 req/15min for patient routes, 300 req/15min for admin.
- **Implementation:** Created KV-based rate limiting middleware with separate limits for patient (100/15min) and admin (300/15min) routes. Comprehensive unit tests added.

### ~~B-03: Peak Flow Zone Color Display~~ ✅ COMPLETED (v53)
- **Why:** Zone calculation exists in backend but is not displayed anywhere. Clinical value: patients and doctors need to see green/yellow/red zone at a glance.
- **Scope:** Color-code peak flow values in entry cards and table cells. Show zone badge on dashboard when personalBest is set. Restore ZoneBadge component.
- **Implementation:** Updated EntryCard to show ZoneBadge and color-coded peak flow values. Updated EntriesListView and UserEntriesTable (admin) to color-code peak flow values based on zone. Fixed hardcoded English strings in table headers to use i18n keys.

### ~~B-06: Date Range Filtering (Re-add to UI)~~ ✅ COMPLETED (v43)
- **Why:** Removed from UI for simplification, but clinically necessary for reviewing specific periods (e.g., "show last month's readings" for a doctor visit).
- **Scope:** Re-add DateFilter component to user dashboard and admin user detail. Already supported by backend API (`from`/`to` params).
- **Implementation:** Created reusable DateFilter component with Thai localization. Backend now supports `from` and `to` query parameters for entries. CSV export respects current date filters. Page resets to 1 when date filters change.

### B-04: Offline Support (PWA)
- **Why:** Patients may use the app in areas with poor connectivity (clinics, rural areas). Entry form should work offline and sync when back online.
- **Scope:** Service worker, offline entry queue, background sync, installable PWA manifest.
- **Estimated Effort:** High
- **Dependencies:** None

## Medium Priority

### B-05: Data Visualization Charts
- **Why:** Peak flow trends over time are clinically valuable. Doctors need to see if readings are improving or declining.
- **Scope:** Line chart showing peak flow readings over time (7/30/90 day views). SpO2 trend line. Zone bands (green/yellow/red) as background shading. Use recharts (already installed).
- **Note:** PeakFlowChart.tsx and SpO2Chart.tsx components exist but are not rendered. Need to integrate them into the UI.
- **Estimated Effort:** Medium
- **Dependencies:** None

### B-07: Multi-Language Support (English + Thai)
- **Why:** Some healthcare providers in Thailand prefer English interface. Adding a second language is straightforward with existing i18n setup.
- **Scope:** Add `en.json` translation file. Language toggle in settings. Default to Thai.
- **Estimated Effort:** Medium
- **Dependencies:** None

### B-08: Admin Audit Log Improvements
- **Why:** Current audit log shows raw JSON diffs. Hard to read. No way to see "who changed what" for a specific patient.
- **Scope:** Human-readable diff view. Filter by date range. Export audit log. Link from user detail to their audit history.
- **Estimated Effort:** Medium
- **Dependencies:** None

### B-09: Entry Edit for Patients
- **Why:** Patients cannot edit their own entries after submission. If they make a mistake (wrong reading, wrong period), they must contact admin.
- **Scope:** Edit button on entry cards. PUT endpoint for patient entry updates. Audit log entry for patient edits.
- **Estimated Effort:** Medium
- **Dependencies:** None

### B-10: Notification Reminders
- **Why:** Asthma management requires consistent twice-daily readings. Patients forget to record.
- **Scope:** Browser notification permission prompt. Morning/evening reminder schedule. Configurable per user.
- **Estimated Effort:** Medium
- **Dependencies:** None

## Low Priority

### B-11: Print-Friendly Report
- **Why:** Doctors often want printed reports during clinic visits.
- **Scope:** Print-optimized CSS for entry table. Print button on user dashboard and admin detail. Include patient info, date range, and readings.
- **Estimated Effort:** Low
- **Dependencies:** None

### B-12: Data Import (CSV)
- **Why:** Migrating patients from other systems or paper records.
- **Scope:** CSV upload endpoint. Validate and import entries. Show preview before committing.
- **Estimated Effort:** Medium
- **Dependencies:** None

### B-13: Multi-User Comparison
- **Why:** Researchers may want to compare peak flow trends across multiple patients.
- **Scope:** Admin-only feature. Select multiple users. Overlay charts. Aggregate statistics.
- **Estimated Effort:** High
- **Dependencies:** B-05 (Data Visualization Charts)

### B-14: Mobile App (React Native / PWA)
- **Why:** Better mobile experience with native camera (for QR), push notifications, and offline access.
- **Scope:** Convert to full PWA with push notifications, or build React Native wrapper.
- **Estimated Effort:** Very High
- **Dependencies:** B-04 (Offline Support/PWA)

### B-15: Export to PDF
- **Why:** More professional than CSV for clinical documentation.
- **Scope:** PDF export with formatted table, patient info header, date range. Use jsPDF or server-side generation.
- **Estimated Effort:** Medium
- **Dependencies:** None

## Technical Debt / Maintenance

### ~~T-01: Remove `backend/` Directory~~ ✅ COMPLETED
- **Why:** Express + MongoDB backend is deprecated and abandoned. Still documented in AGENTS.md which causes confusion.
- **Scope:** Delete `backend/` directory. Remove all Express/MongoDB references from AGENTS.md.
- **Status:** No `backend/` directory exists in current project structure. All references removed from documentation.

### ~~T-02: Hardcoded English Strings in Tables~~ ✅ COMPLETED (v53)
- **Why:** `UserEntriesTable.tsx` and `EntriesListView.tsx` have hardcoded "Morning - Before Med", "PF(L/Min)" etc. instead of i18n keys.
- **Scope:** Add `th.json` entries for all table headers. Use `t()` in components.
- **Status:** Fixed in v53. All table headers now use i18n keys.

### T-03: Unify Entry Types Between Frontend and Backend
- **Why:** Multiple `Entry` type definitions exist (`types/index.ts`, `entryGrouping.ts`, `EntriesCardView.tsx`, `UserEntriesTable.tsx`) with slightly different shapes. Causes TypeScript errors and confusion.
- **Scope:** Single `Entry` type in `types/index.ts`. All components import from there.
- **Estimated Effort:** Medium
- **Dependencies:** None

### T-04: Error Boundaries in React
- **Why:** Runtime errors crash the entire app (e.g., the entryGrouping crash). Error boundaries would show a fallback UI.
- **Scope:** Add React error boundary wrapper around route components. Show Thai-localized error message with retry button.
- **Estimated Effort:** Low
- **Dependencies:** None

### T-05: Seed Data with Thai Names
- **Why:** Test data uses "John Smith", "Mary Johnson" — confusing for a Thai-language clinical app.
- **Scope:** Update `0002_seed.sql` with Thai names and realistic Thai patient data.
- **Estimated Effort:** Low
- **Dependencies:** None

### T-06: E2E Tests
- **Why:** Unit tests cover utilities but not user flows (login, create entry, view history, export).
- **Scope:** Playwright or Cypress. Cover critical paths: patient entry creation, admin user management, CSV export.
- **Estimated Effort:** High
- **Dependencies:** None

### T-07: Extract Business Logic to Service Layer
- **Why:** Business logic is embedded directly in route handlers, violating the Single Responsibility Principle. This makes testing difficult and code harder to maintain.
- **Scope:** Create service layer (`worker/src/services/`) for entry management, user management, and audit logging. Move business logic from route handlers to services.
- **Estimated Effort:** High
- **Dependencies:** None
- **Note:** This is tracked as Issue #1 in ISSUETOFIX.md

### T-08: Fix N+1 Query in User List
- **Why:** After fetching users, the code fetches ALL entries for those users to find the last entry date. This is inefficient.
- **Scope:** Use a subquery or window function approach to fetch only the latest entry per user.
- **Estimated Effort:** Medium
- **Dependencies:** None
- **Note:** This is tracked as Issue #2 in ISSUETOFIX.md

### T-09: Consolidate Duplicate Code
- **Why:** Peak flow parsing logic and audit log writing code are duplicated across multiple files.
- **Scope:** Create shared utility functions in `worker/src/lib/peakFlow.ts` and `worker/src/lib/audit.ts`. Update all usages to import from these shared utilities.
- **Estimated Effort:** Medium
- **Dependencies:** None
- **Note:** This is tracked as Issues #3 and #4 in ISSUETOFIX.md

### T-10: Implement Caching for User Profiles
- **Why:** User profile is fetched on every request without caching, causing unnecessary database queries.
- **Scope:** Implement caching using Cloudflare Workers KV for user profiles.
- **Estimated Effort:** Medium
- **Dependencies:** None
- **Note:** This is tracked as Issue #5 in ISSUETOFIX.md

### T-11: Add Backend HTML Sanitization
- **Why:** While the frontend uses DOMPurify, the backend doesn't sanitize HTML content before storing it. This could lead to stored XSS if the frontend sanitization is bypassed.
- **Scope:** Add HTML sanitization on the backend before storing notes.
- **Estimated Effort:** Low
- **Dependencies:** None
- **Note:** This is tracked as Issue #6 in ISSUETOFIX.md

### T-12: Implement Streaming for CSV Exports
- **Why:** CSV is built entirely in memory, which could be problematic for large datasets.
- **Scope:** Use streaming for large exports instead of building the entire CSV in memory.
- **Estimated Effort:** Medium
- **Dependencies:** None
- **Note:** This is tracked as Issue #7 in ISSUETOFIX.md

## Completed Features

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

## Prioritization Matrix

| Priority | Features | Rationale |
|----------|----------|-----------|
| **P0 (Critical)** | T-07, T-08 | Performance and maintainability issues that affect the entire application |
| **P1 (High)** | B-04, B-05, B-09 | High-value features that improve user experience and clinical utility |
| **P2 (Medium)** | B-07, B-08, B-10, B-12, B-15, T-03, T-06, T-09, T-10 | Useful features and technical debt with moderate effort |
| **P3 (Low)** | B-11, B-13, B-14, T-04, T-05, T-11, T-12 | Nice-to-have features or low-impact improvements |

## Next Steps

1. **Immediate (This Sprint):** Address T-07 (Extract Business Logic) and T-08 (Fix N+1 Query)
2. **Short-term (Next 2-3 Sprints):** Implement B-04 (Offline Support) and B-05 (Data Visualization Charts)
3. **Medium-term (Next Quarter):** Add B-07 (Multi-Language Support) and B-09 (Entry Edit for Patients)
4. **Long-term (Future):** Consider B-14 (Mobile App) and B-13 (Multi-User Comparison)
