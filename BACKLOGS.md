# PeakFlowStat — Feature Backlog

Prioritized list of suggested features and improvements.

## High Priority

### B-01: Rate Limiting on Worker Routes
- **Why:** No rate limiting on Cloudflare Worker. Patient-facing routes (`/api/u/:token/*`) and admin routes are unlimited. Vulnerable to abuse.
- **Scope:** Implement per-IP rate limiting using Cloudflare's built-in features or custom middleware. 100 req/15min for patient routes, 300 req/15min for admin.

### B-03: Peak Flow Zone Color Display
- **Why:** Zone calculation exists in backend but is not displayed anywhere. Clinical value: patients and doctors need to see green/yellow/red zone at a glance.
- **Scope:** Color-code peak flow values in entry cards and table cells. Show zone badge on dashboard when personalBest is set. Restore ZoneBadge component.

### B-04: Offline Support (PWA)
- **Why:** Patients may use the app in areas with poor connectivity (clinics, rural areas). Entry form should work offline and sync when back online.
- **Scope:** Service worker, offline entry queue, background sync, installable PWA manifest.

## Medium Priority

### B-05: Data Visualization Charts
- **Why:** Peak flow trends over time are clinically valuable. Doctors need to see if readings are improving or declining.
- **Scope:** Line chart showing peak flow readings over time (7/30/90 day views). SpO2 trend line. Zone bands (green/yellow/red) as background shading. Use recharts (already installed).

### B-06: Date Range Filtering (Re-add to UI)
- **Why:** Removed from UI for simplification, but clinically necessary for reviewing specific periods (e.g., "show last month's readings" for a doctor visit).
- **Scope:** Re-add DateFilter component to user dashboard and admin user detail. Already supported by backend API (`from`/`to` params).

### B-07: Multi-Language Support (English + Thai)
- **Why:** Some healthcare providers in Thailand prefer English interface. Adding a second language is straightforward with existing i18n setup.
- **Scope:** Add `en.json` translation file. Language toggle in settings. Default to Thai.

### B-08: Admin Audit Log Improvements
- **Why:** Current audit log shows raw JSON diffs. Hard to read. No way to see "who changed what" for a specific patient.
- **Scope:** Human-readable diff view. Filter by date range. Export audit log. Link from user detail to their audit history.

### B-09: Entry Edit for Patients
- **Why:** Patients cannot edit their own entries after submission. If they make a mistake (wrong reading, wrong period), they must contact admin.
- **Scope:** Edit button on entry cards. PUT endpoint for patient entry updates. Audit log entry for patient edits.

### B-10: Notification Reminders
- **Why:** Asthma management requires consistent twice-daily readings. Patients forget to record.
- **Scope:** Browser notification permission prompt. Morning/evening reminder schedule. Configurable per user.

## Low Priority

### B-11: Print-Friendly Report
- **Why:** Doctors often want printed reports during clinic visits.
- **Scope:** Print-optimized CSS for entry table. Print button on user dashboard and admin detail. Include patient info, date range, and readings.

### B-12: Data Import (CSV)
- **Why:** Migrating patients from other systems or paper records.
- **Scope:** CSV upload endpoint. Validate and import entries. Show preview before committing.

### B-13: Multi-User Comparison
- **Why:** Researchers may want to compare peak flow trends across multiple patients.
- **Scope:** Admin-only feature. Select multiple users. Overlay charts. Aggregate statistics.

### B-14: Mobile App (React Native / PWA)
- **Why:** Better mobile experience with native camera (for QR), push notifications, and offline access.
- **Scope:** Convert to full PWA with push notifications, or build React Native wrapper.

### B-15: Export to PDF
- **Why:** More professional than CSV for clinical documentation.
- **Scope:** PDF export with formatted table, patient info header, date range. Use jsPDF or server-side generation.

## Technical Debt / Maintenance

### T-01: Remove `backend/` Directory
- **Why:** Express + MongoDB backend is deprecated and abandoned. Still documented in AGENTS.md which causes confusion.
- **Scope:** Delete `backend/` directory. Remove all Express/MongoDB references from AGENTS.md.

### T-02: Hardcoded English Strings in Tables
- **Why:** `UserEntriesTable.tsx` and `EntriesListView.tsx` have hardcoded "Morning - Before Med", "PF(L/Min)" etc. instead of i18n keys.
- **Scope:** Add `th.json` entries for all table headers. Use `t()` in components.

### T-03: Unify Entry Types Between Frontend and Backend
- **Why:** Multiple `Entry` type definitions exist (`types/index.ts`, `entryGrouping.ts`, `EntriesCardView.tsx`, `UserEntriesTable.tsx`) with slightly different shapes. Causes TypeScript errors and confusion.
- **Scope:** Single `Entry` type in `types/index.ts`. All components import from there.

### T-04: Error Boundaries in React
- **Why:** Runtime errors crash the entire app (e.g., the entryGrouping crash). Error boundaries would show a fallback UI.
- **Scope:** Add React error boundary wrapper around route components. Show Thai-localized error message with retry button.

### T-05: Seed Data with Thai Names
- **Why:** Test data uses "John Smith", "Mary Johnson" — confusing for a Thai-language clinical app.
- **Scope:** Update `0002_seed.sql` with Thai names and realistic Thai patient data.

### T-06: E2E Tests
- **Why:** Unit tests cover utilities but not user flows (login, create entry, view history, export).
- **Scope:** Playwright or Cypress. Cover critical paths: patient entry creation, admin user management, CSV export.
