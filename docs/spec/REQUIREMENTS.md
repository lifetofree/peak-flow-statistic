# Functional Requirements — PeakFlowStat

**Last updated:** 2026-05-15  
**Status:** Reflects current production system (v53+)

---

## Product Summary

PeakFlowStat is a clinical web application for an allergy clinic in Thailand. Patients record twice-daily peak expiratory flow (PEF) and SpO2 readings. Clinic staff manage patient records and review trends. The UI is Thai-language only.

---

## User Roles

| Role | Access method | Auth |
|---|---|---|
| Patient | Tokenized URL `/u/:token` | None — URL is the credential |
| Admin (clinic staff) | `/admin/*` | None — intentionally open-access |

---

## Patient Requirements

### PR-01: Dashboard
- Patient opens their unique URL (`/u/:token`).
- Dashboard shows: nickname, current zone badge (if `personalBest` is set), instruction box (rendered HTML from admin), and patient's own note with an edit button.
- Navigation to: record new entry, view entry history.

### PR-02: Record Entry
- Patient can submit one entry with: date, three peak flow readings (integers), SpO2 (integer 0–100, optional), medication timing (before/after), period (morning/evening), and an optional text note.
- The best (max) of the three PF readings is stored as `peak_flow`.
- Date defaults to today (local time, Thai timezone).
- SpO2 is optional — `null` is stored if not provided.

### PR-03: Entry History
- Patient can view all their entries ordered by date (newest first).
- Two view modes available: card view (grouped by date) and list/table view.
- Entries show: date in Buddhist Era (พ.ศ.), period, medication timing, peak flow readings, SpO2, zone badge, note.
- Date range filter available (`from`/`to`).
- Paginated (20 per page) or all-at-once.

### PR-04: Zone Display
- Each entry displays a zone badge: green / orange / yellow / red.
- Zone is calculated from `peak_flow` vs `personal_best`. If `personalBest` is null, zone shows as red.
- Zone thresholds: green ≥90%, orange ≥80%, yellow ≥60%, red <60%.

### PR-05: CSV Export
- Patient can export their entries as a CSV file, respecting any active date filters.
- Filename: `<FirstName><LastName>-entries.csv`.

### PR-06: Patient Note
- Patient can write and update a personal note (plain text) visible on their dashboard.
- Note is also viewable and editable by admin.

### PR-07: Short Link
- A short 8-character link (`/s/:code`) redirects to the patient's dashboard.
- Each click is counted. Admin can view `clickCount`.

---

## Admin Requirements

### AR-01: Patient List
- Admin views paginated list of all active patients (20 per page).
- List shows: name, nickname, personal best, last entry date, click count.
- Search by name/nickname.
- Soft-deleted patients are excluded from the list.

### AR-02: Create Patient
- Admin creates a new patient with: first name, last name, nickname, personal best (optional), admin note (optional), instruction box (optional).
- System auto-generates: unique token (UUID v4) for dashboard URL, unique short code (8-char hex) for short link.

### AR-03: Patient Detail
- Admin views full patient profile: all fields, share link with QR code, instruction box, admin note, patient note.
- Admin can edit: first name, last name, nickname, personal best.
- Admin can separately edit: admin note (WYSIWYG), instruction box (WYSIWYG), patient note.

### AR-04: Soft-Delete Patient
- Admin can soft-delete a patient (sets `deleted_at`).
- Deleted patients are excluded from all patient-facing routes (404 on token lookup).
- Deletion is logged to audit trail.

### AR-05: Entry Management
- Admin views entries for a specific patient with date range filter and pagination.
- Admin can edit any field of any entry (date, readings, SpO2, medication timing, period, note).
- Admin can hard-delete any entry.
- All edits/deletes are logged to audit trail.

### AR-06: Admin Note (WYSIWYG)
- Admin can write a rich-text note (HTML) per patient.
- Note is for internal use only; not visible to the patient.
- Max 5,000 characters.

### AR-07: Instruction Box (WYSIWYG)
- Admin can write a rich-text instruction message per patient.
- Instructions are rendered on the patient's dashboard (HTML from admin).
- Max 5,000 characters.

### AR-08: CSV Export (Admin)
- Admin can export entries for any patient as CSV with optional date range filter.

### AR-09: Audit Log
- All CREATE / UPDATE / DELETE actions on Users and Entries are recorded.
- Audit log shows: timestamp, action type, target (User or Entry), diff (before/after values).
- Admin can filter by user and action type.
- Paginated (20 per page), newest first.
- Audit log is append-only — no modification or deletion of log records.

### AR-10: Share Link
- Admin can view and copy the patient's dashboard URL and short link.
- QR code is displayed for easy sharing.

---

## Non-Functional Requirements

| Category | Requirement |
|---|---|
| Language | Thai only (`th.json`). Buddhist Era (พ.ศ.) for all displayed dates. |
| Rate limiting | Patient routes: 100 req/15min/IP. Admin routes: 300 req/15min/IP. |
| Security | SQL injection prevented via column/table allowlists. XSS prevented via DOMPurify on frontend. |
| Availability | Cloudflare edge — inherits Cloudflare SLA. |
| Data retention | No auto-deletion. Soft-deleted users and their entries remain in DB. |
| Mobile | Fully responsive, designed for mobile-first patient use. |
| Offline | Not supported (PWA is a planned future feature — B-04). |

---

## Acceptance Criteria Checklist (Current)

### Patient flow
- [x] Patient opens `/u/:token` and sees their name, zone badge, and instruction box
- [x] Patient records an entry with 3 PF readings, SpO2, timing, period
- [x] Entry list shows zone badge and color-coded PF value
- [x] Date range filter works on entry history
- [x] CSV export downloads correctly and respects date filter
- [x] Buddhist Era dates display throughout UI
- [x] Patient can edit their own note

### Admin flow
- [x] Admin creates patient with auto-generated token and short code
- [x] Admin edits patient profile (name, nickname, personal best)
- [x] Admin edits admin note, instruction box, patient note (WYSIWYG)
- [x] Admin views entries for patient with date filter
- [x] Admin edits/deletes individual entries
- [x] Admin soft-deletes patient
- [x] Audit log records all changes with before/after diff
- [x] Admin exports CSV for any patient
- [x] QR code and short link shown on patient detail

---

## Out of Scope (Planned / Backlog)

| Feature | Backlog ID |
|---|---|
| Offline / PWA support | B-04 |
| Peak flow trend charts | B-05 |
| Patient entry editing | B-09 |
| Notification reminders | B-10 |
| English language toggle | B-07 |
| Human-readable audit log diffs | B-08 |
| PDF export | B-15 |
| Multi-admin / role-based auth | — |
