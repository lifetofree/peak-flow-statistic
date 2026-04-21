# PeakFlowStat — Code Review

**Date:** 2026-04-18  
**Reviewer:** Claude (claude-sonnet-4-6)  
**Scope:** Full project — structure, architecture, security, code quality, type safety, test coverage

---

## Table of Contents

1. [Overall Assessment](#overall-assessment)
2. [Project Structure](#project-structure)
3. [Architecture](#architecture)
4. [Security](#security)
5. [Backend — Worker](#backend--worker)
6. [Frontend](#frontend)
7. [Type Safety](#type-safety)
8. [Test Coverage](#test-coverage)
9. [Bugs Found](#bugs-found)
10. [Recommendations Summary](#recommendations-summary)

---

## Overall Assessment

PeakFlowStat is a well-conceived, production-deployed clinical tool with a clean Cloudflare-native stack. The codebase demonstrates good patterns: parameterised queries throughout, Zod validation on all mutation endpoints, a service layer separating business logic from route handlers, TanStack Query for all data fetching, and a working audit trail.

The main concerns are:

- **Bugs** that affect real users (CSV newline corruption, null zone after admin entry edit).
- **Type safety gaps** — `any` leaks in service layer, `Zone` typed as `string` instead of a union.
- **Test blind spots** — three service modules and two lib utilities had no tests at all before this review (now added).
- **Documentation artefacts** — unresolved merge conflict in `AGENTS.md`, duplicated file tree in the same file.

None of these are project-breaking, but the bugs and type gaps should be addressed before the next feature sprint.

---

## Project Structure

### What's Good

- Clean separation of `frontend/` and `worker/` with their own `package.json` and test suites.
- The worker route hierarchy (`routes/admin/`, `routes/health.ts`, `routes/user.ts`) maps cleanly to the API surface.
- Service layer (`services/entryService.ts`, `services/userService.ts`, `services/exportService.ts`) extracts business logic out of route handlers — this is the right direction.
- Shared utilities in `lib/` (`database.ts`, `audit.ts`, `peakFlow.ts`) are well-scoped and reusable.
- Migration files in `worker/migrations/` give a clear schema history.

### Issues

**Unresolved merge conflict in `AGENTS.md` (line 688)**
```
- Do NOT put business logic in route handlers — move to a service layer (known tech debt).
>>>>>>> pfs
```
This marker is committed to main. Fix: remove the `>>>>>>> pfs` line.

**Duplicated file tree in `AGENTS.md` (lines 139–150)**
The `services/` section erroneously repeats the entire `admin/` and route file listing that already appears under `routes/` (lines 124–135). This is a copy-paste artifact.

**`AGENTS.md` references Docker Compose in the "Why Cloudflare" section (line 515)**
> "In addition to Docker Compose deployment..."

There is no Docker Compose deployment. This sentence contradicts the constraints section.

**Dead pages that are not rendered**
Per `AGENTS.md`, these components exist but are never rendered:
- `PeakFlowChart.tsx`
- `SpO2Chart.tsx`
- `TimeRangeSelector.tsx`
- `ZoneBadge.tsx` — note: `BACKLOGS.md` says B-03 re-added it, but `AGENTS.md` still lists it as "not rendered". Check if it is actually wired up.
- `AdminLogin.tsx` — login is bypassed, page exists but admin is open-access by design.

---

## Architecture

### What's Good

- `DatabaseClient` (`worker/src/lib/database.ts`) is the best part of the backend. It wraps D1 with an allowlist-based SQL-injection guard (`ALLOWED_TABLES`, `ALLOWED_COLUMNS`, `ALLOWED_ORDER_COLUMNS`), range operators (`$gte`, `$lte`), `IN` clauses, and `LIKE` support. Every query goes through parameterised binding.
- Rate limiting via KV is cleanly separated into middleware with configurable limits per route group.
- `getLastEntryDatesForUsers` uses a single `MAX(date) GROUP BY user_id` query instead of N+1 per-user fetches — correct.
- CORS is configured from environment variable, not hardcoded.

### Issues

**Zone calculation duplicated in three places**

| File | Lines |
|---|---|
| `frontend/src/utils/zone.ts` | 10–26 |
| `worker/src/routes/zone.ts` | 8–27 |
| `worker/src/routes/admin/entries.ts` | 25–45 (local copy) |

The local copy in `entries.ts` is the most problematic — it re-implements `formatEntryWithZone` locally instead of importing from `services/entryService.ts`. This means admin entries and user entries use different code paths. If zone thresholds ever change, `entries.ts` will drift.

**Fix:** Delete the local `formatEntryWithZone` in `entries.ts` (lines 25–45) and import `formatEntriesWithZone` from `services/entryService.ts`.

**Validation constants duplicated between frontend and backend**

`frontend/src/constants/validation.ts` defines `PEAK_FLOW_MIN`, `PEAK_FLOW_MAX`, `SPO2_MIN`, `SPO2_MAX`. The same boundaries are repeated in Zod schemas in `worker/src/routes/user.ts` (lines 77–84) and `worker/src/routes/admin/users.ts` (lines 23–36). There is no enforcement mechanism. If one changes, the other doesn't follow.

Since there is no shared package, at minimum these should be co-located comments referencing each other.

**`pageSize=0` default is inconsistent between services**

| Service | Default pageSize |
|---|---|
| `entryService.ts:121` | `0` (no LIMIT → all rows) |
| `userService.ts:105` | `20` |
| `routes/admin/entries.ts:52` | `DEFAULT_PAGE_SIZE` (20) |

A caller that omits `pageSize` on the entry endpoint gets all rows. This is the intended behaviour for exports, but it also means the entries list endpoint has no built-in safeguard against large result sets.

**Rate limiter uses timestamp array (sliding window)**

`middleware/rateLimit.ts:40–52`: stores an array of request timestamps in KV per (IP, path) pair. For the patient limit of 100 req/15min, that's up to 100 timestamps per key. This works fine at clinic scale. At larger scale, consider a sliding window counter (two KV values: count + window start) to reduce payload size.

---

## Security

| # | Issue | Severity | Location |
|---|---|---|---|
| S-1 | Admin panel has no authentication | Known by design | `worker/src/routes/admin/` |
| S-2 | Backend does not sanitize HTML before storing notes | Medium | `worker/src/routes/user.ts:83`, `admin/users.ts:39` |
| S-3 | `validateShortLink` middleware typed as `any` | Low | `worker/src/routes/user.ts:38` |
| S-4 | `audit_id` is hardcoded to `'admin'` | Low | `worker/src/lib/audit.ts:28` |
| S-5 | `Content-Disposition` filename not quoted for special chars | Low | `routes/user.ts:116`, `admin/users.ts:136` |

**S-1 — No admin authentication (known)**
All admin endpoints are open-access. `client.ts` sends a token via `authHeaders()` but no backend middleware validates it. The `jwt.ts` file exists but is not enforced. This is documented in `AGENTS.md` as intentional. The risk is low for a private clinic deployment where the admin URL is not public knowledge, but any credential leak or URL discovery gives full write access to all patient data.

**S-2 — No backend HTML sanitization**
The frontend uses DOMPurify before rendering, which prevents XSS in the browser. However, notes are stored raw in D1. A direct API call (bypassing the frontend) can store arbitrary HTML, which would then be served and rendered by any client. This is tracked as `T-11` in `BACKLOGS.md`. A lightweight server-side sanitizer (e.g., stripping `<script>`, `<iframe>`, event attributes) would close this gap without heavy dependencies.

**S-3 — `validateShortLink` typed as `any`**
```ts
// worker/src/routes/user.ts:38
const validateShortLink = async (c: any, next: any) => {
```
Should be:
```ts
import type { Context, Next } from 'hono';
const validateShortLink = async (
  c: Context<{ Bindings: Env; Variables: Variables }>,
  next: Next
) => {
```

**S-4 — Hardcoded `admin_id`**
```ts
// worker/src/lib/audit.ts:28
admin_id: 'admin',
```
Every audit log row records the same actor. If multiple admins ever exist, or if you want to trace which session performed an action, this field is useless. Consider passing a session identifier or IP as the `admin_id` even now.

**S-5 — `Content-Disposition` filename**
```ts
// worker/src/routes/user.ts:116
c.header('Content-Disposition', `attachment; filename="${safeName}-entries.csv"`);
```
`getSafeFileName` strips non-alphanumeric characters, so the filename is safe. But if the function ever changes, unescaped quotes in the filename would break the header. The RFC 6266 compliant form is:
```ts
`attachment; filename*=UTF-8''${encodeURIComponent(safeName)}-entries.csv`
```

---

## Backend — Worker

### `worker/src/lib/database.ts`

Overall this is the strongest file in the project. A few minor observations:

- `WHERE 1=1` pattern (lines 126, 154, 178) is a valid and common SQL idiom for building dynamic WHERE clauses. No functional issue.
- `getLastEntryDatesForUsers` (lines 189–206) lives on `DatabaseClient` but uses a raw SQL query that bypasses the allowlist abstraction. It is safe (no user input in the query body, only parameterised `IN` placeholders), but architecturally inconsistent. It could alternatively live in `userService.ts` as a raw query, which would make `DatabaseClient` a pure CRUD abstraction.
- `findOne` delegates to `find` with `limit: 1` — correct and efficient.

### `worker/src/routes/admin/entries.ts`

**Local `formatEntryWithZone` duplicate (lines 25–45)**
As noted above, this reimplements the same function that exists in `services/entryService.ts:52`. The two are currently identical, but they will drift.

**`Promise.all` with `await` on synchronous function (line 82–85)**
```ts
const formattedEntries = await Promise.all(entries.map(async (e: EntryRecord) => {
  const user = userMap.get(e.user_id) || null;
  return await formatEntryWithZone(e, user);   // formatEntryWithZone is synchronous
}));
```
`formatEntryWithZone` is a synchronous function. Wrapping it in `async` and `await` adds no value and slightly misleads the reader. Either remove both keywords, or use the synchronous `formatEntriesWithZone` helper from `entryService.ts`.

**Double-fetches entry in `PATCH /admin/entries/:id` (lines 96–104)**
```ts
const entry = await db.findOne<EntryRecord>('entries', { id: entryId }); // fetch 1
if (!entry) return c.json({ error: 'Not found' }, 404);
const before = { ...entry };
const formatted = await updateEntry(db, entryId, data, now);             // fetch 2 (inside updateEntry)
```
`updateEntry` in `entryService.ts` also calls `db.findOne` internally (line 209). So the entry is fetched twice on every PATCH. The route handler should either trust the service to return 404 context, or the service should accept the already-fetched record.

### `worker/src/routes/user.ts`

- Filter construction for date ranges is duplicated between this file (lines 104–108) and `admin/users.ts` (lines 125–129). Consider extracting a `buildDateFilter(from, to)` helper in a shared utility.
- `parseInt(c.req.query('page') || '1')` (line 66) does not validate that the result is a positive integer. `parseInt('abc')` returns `NaN`, which flows into `getUserEntries` as `page=NaN`, then `(NaN - 1) * pageSize = NaN`, and D1 receives `OFFSET NaN` which may error or return unexpected results.

### `worker/src/services/entryService.ts`

**`updateEntry` returns null zone (line 217)**
```ts
return updated ? formatEntryWithZone(updated, null) : null;
//                                           ^^^^
```
After an admin edits an entry, the response always has `zone: null` regardless of the user's `personalBest`. The route handler has the `entryId` and can fetch the user, or `updateEntry` should accept a `user` parameter.

**`getUserEntries` uses `any` extensively (lines 113–116, 142)**
```ts
export async function getUserEntries(
  db: {
    find: (table: string, filter: any, options?: any) => Promise<any[]>;
    count: (table: string, filter: any) => Promise<number>;
  },
```
The db parameter type mirrors `DatabaseClient` methods but doesn't reference the class. A simple `Pick<DatabaseClient, 'find' | 'count'>` would provide full type safety without coupling to a concrete class.

### `worker/src/services/userService.ts`

**`getLastEntryDates` typed as `any` (lines 76–81)**
```ts
export async function getLastEntryDates(db: any, userIds: string[]): Promise<Map<string, string>> {
  return db.getLastEntryDatesForUsers(userIds);
}
```
This thin wrapper exists only to allow mocking in tests. Its `db: any` parameter loses all type safety. The db parameter should be typed as `Pick<DatabaseClient, 'getLastEntryDatesForUsers'>`.

**`buildUserUpdates` uses `Record<string, any>` (line 66)**
```ts
const updates: Record<string, any> = { updated_at: now };
```
Same issue in `buildEntryUpdates` (`entryService.ts:100`). The return type should be an explicit interface or at least `Record<string, string | number | null>`.

### `worker/src/services/exportService.ts`

**Newlines in notes break CSV output (line 24)**
```ts
const note = (entry.note || '').replace(/"/g, '""');
```
If a note contains `\n` or `\r\n`, the CSV row splits across multiple lines. CSV parsers treat embedded newlines as a new record unless the field is properly quoted (which it is with `"..."`) — but only RFC 4180-compliant parsers handle this correctly. Microsoft Excel does not. Fix:
```ts
const note = (entry.note || '').replace(/"/g, '""').replace(/[\r\n]+/g, ' ');
```

### `worker/src/lib/peakFlow.ts`

**Null/empty input returns inconsistent shape (lines 18–28)**
```ts
export function parsePeakFlowReadings(readingsStr: string | null, fallback: number): PeakFlowReadings {
  let readings: number[];
  try {
    const parsed = JSON.parse(readingsStr || '[]');
    readings = Array.isArray(parsed) ? parsed : [fallback];
  } catch {
    readings = [fallback];
  }
  const best = readings.length > 0 ? Math.max(...readings) : fallback;
  return { readings, best };
}
```
When `readingsStr` is `null` or `''`, the expression `readingsStr || '[]'` evaluates to `'[]'`, so `readings = []`. The function then returns `{ readings: [], best: fallback }`. The `readings` array is empty but `best` is non-zero — a caller who reconstructs the best reading from `readings` (e.g., `Math.max(...readings)`) would get `-Infinity`. The inconsistency is documented in the new tests. The simplest fix:
```ts
const best = readings.length > 0 ? Math.max(...readings) : fallback;
// Optionally: if (readings.length === 0) readings = [fallback];
```

---

## Frontend

### `frontend/src/api/client.ts`

- `authHeaders()` sends an Authorization token that the backend never validates. This is fine for now (open-access design), but the function name implies security that doesn't exist. Consider renaming to `adminHeaders()` and adding a comment explaining it's a placeholder.

### `frontend/src/api/admin.tsx`

- File extension is `.tsx` but contains no JSX. Should be `.ts`. This won't cause a runtime error, but it is misleading.

### `frontend/src/utils/zone.ts`

The frontend duplicates the zone calculation from the backend. It is tested independently in `frontend/src/__tests__/zone.test.ts`. The test file inlines its own copy of the function rather than importing it — so the tests do not actually test the file they claim to cover. The test should import from `'../utils/zone'`.

### `frontend/src/components/EntryForm.tsx`

- Date validation uses string comparison (`date > today`) which works correctly for ISO `YYYY-MM-DD` format, but only because ISO dates sort lexicographically. A comment explaining this assumption would prevent future breakage if the date format changes.

---

## Type Safety

### `FormattedEntry.zone` typed as `string` instead of union

```ts
// worker/src/routes/admin/types.ts:94
zone: { zone: string; percentage: number } | null;
```

Should be:
```ts
zone: { zone: 'green' | 'orange' | 'yellow' | 'red'; percentage: number } | null;
```

The frontend type (`types/index.ts:38`) correctly defines `Zone = 'green' | 'orange' | 'yellow' | 'red'`, but the backend's `FormattedEntry` uses a plain `string`. Any consumer of the backend type gets no compile-time guarantee about valid zone values.

### Mismatched types between frontend `Entry` and `EntryListResult`

`frontend/src/types/index.ts:29` defines `peakFlowReadings: [number, number, number]` (tuple). The backend `entryService.ts:37` returns `peakFlowReadings: number[]` (array). The frontend type is stricter than the API actually guarantees — an entry created with valid 3 readings will always have exactly 3, but the types don't enforce this contract end-to-end.

### `EntryRecord.medicationTiming` typed as `string`

```ts
// worker/src/routes/admin/types.ts:44
medication_timing: string;
```

Should be `'before' | 'after'`. The Zod schema enforces it at the API boundary, but once it enters the DB record type, the constraint is lost.

### Same issue with `period` and `targetModel`, `action` in `AuditLogRecord`

All enums that are constrained at validation time relax back to `string` in the DB record interfaces. These should be typed as unions throughout.

---

## Test Coverage

### Before This Review

| Suite | Tests | Files covered |
|---|---|---|
| `worker/src/__tests__/api-flows.test.ts` | 32 | Schema validation, zone, audit log behaviours |
| `worker/src/__tests__/schemas.test.ts` | 17 | Zod schemas (duplicates api-flows schemas) |
| `worker/src/__tests__/zone.test.ts` | 10 | `calculateZone` |
| `worker/src/__tests__/rate-limit.test.ts` | 4 | Rate limit middleware |
| `worker/src/__tests__/database-validation.test.ts` | 7 | Allowlist assertions |
| `frontend/src/__tests__/date.test.ts` | — | Date formatting |
| `frontend/src/__tests__/zone.test.ts` | 7 | Zone (inline copy, not the actual file) |
| `frontend/src/__tests__/types.test.ts` | — | Type guards |

**Not covered:** `entryService.ts`, `userService.ts`, `exportService.ts`, `lib/peakFlow.ts`, `lib/audit.ts`.

### Tests Added in This Review

**`worker/src/__tests__/peakFlow.test.ts`** (11 tests)
- `parsePeakFlowReadings`: valid JSON, max selection, null input, empty string, invalid JSON, non-array JSON, single element
- Documents the null/empty → `readings=[]` quirk
- `getBestReading`: max, single, empty array, identical values

**`worker/src/__tests__/exportService.test.ts`** (13 tests)
- `generateCsvHeader`: correct column names
- `generateCsvEntry`: valid row, period fallback, double-quote escaping, newline bug (documented as known failure), best-reading selection, fallback on invalid JSON
- `generateCsv`: single entry, multiple entries, empty array
- `getSafeFileName`: basic, spaces, Thai characters, hyphens, empty strings

**`worker/src/__tests__/entryService.test.ts`** (27 tests)
- `formatEntryWithZone`: with/without personalBest, null user, empty period default, empty note, invalid readings JSON
- `formatEntriesWithZone`: multi-user map, missing user in map
- `buildEntryData`: max reading as peak_flow, JSON serialisation, timestamps, UUID format, note defaults
- `buildEntryUpdates`: always includes updated_at, field selection, JSON serialisation, snake_case mapping
- `getUserEntries`: pagination info, pageSize=0 behaviour, date filter application, no-filter case, page default
- `createUserEntry`: inserts and returns correct shape
- `updateEntry`: not found, update + re-fetch, null post-update
- `deleteEntry`: not found, successful delete

**`worker/src/__tests__/userService.test.ts`** (28 tests)
- `generateShortToken`: UUID format, uniqueness
- `generateShortCode`: 8-char hex, uniqueness
- `buildUserData`: field mapping, UUID, shortCode, deleted_at, click_count, personalBest, admin_note defaults
- `formatUser`: camelCase mapping, clickCount default, lastEntryDate, deletedAt preservation
- `buildUserUpdates`: always has updated_at, snake_case mapping, null personalBest
- `createUser`: inserts, calls audit, returns formatted
- `getUser`: found, not found
- `updateUser`: not found, soft-deleted guard, updates, audit call with before/after
- `deleteUser`: not found, soft-delete sets deleted_at, audit called

**Total after review: 179 tests (up from 70 counted in the worker suite).**

### Remaining Gaps

| Gap | Priority |
|---|---|
| `lib/audit.ts` — `writeAuditLog`, `writeCreateAudit`, etc. not tested | Medium |
| `frontend/src/__tests__/zone.test.ts` imports an inline copy, not the actual `utils/zone.ts` | Medium |
| `routes/redirect.ts` — short link redirect logic not tested | Medium |
| `routes/admin/audit.ts` — audit list endpoint not tested | Low |
| Rate limit test only covers allow/block; doesn't test window expiry or per-path keying | Low |
| No E2E tests (tracked as `T-06` in backlog) | Low |

---

## Bugs Found

### BUG-1: CSV export corrupts rows when notes contain newlines

**File:** `worker/src/services/exportService.ts:24`  
**Severity:** Medium — affects data integrity of exported clinical records

Notes from the WYSIWYG editor (`react-quill`) may contain `\n` characters within HTML. The current CSV escaping only handles double quotes:

```ts
const note = (entry.note || '').replace(/"/g, '""');
```

A note like `"line1\nline2"` produces a two-row CSV entry. Excel and Numbers will misparse this as a record split across two lines.

**Fix:**
```ts
const note = (entry.note || '').replace(/"/g, '""').replace(/[\r\n]+/g, ' ');
```

---

### BUG-2: `updateEntry` always returns `zone: null` after admin edit

**File:** `worker/src/services/entryService.ts:217`  
**Severity:** Medium — wrong data returned to the admin UI after editing an entry

```ts
return updated ? formatEntryWithZone(updated, null) : null;
```

The `null` user argument means `zone` is always `null` in the response, even when the patient has a `personalBest` set. The admin entry table will briefly show no zone after a save until the next full refresh.

**Fix:** The route handler at `worker/src/routes/admin/entries.ts:90–107` already fetches the entry before calling `updateEntry`. It can fetch the user and pass it:

```ts
// In entriesApp.patch('/admin/entries/:id')
const entry = await db.findOne<EntryRecord>('entries', { id: entryId });
if (!entry) return c.json({ error: 'Not found' }, 404);

const user = await db.findOne<UserRecord>('users', { id: entry.user_id });
const formatted = await updateEntry(db, entryId, data, now, user);  // pass user
```

Or add an optional `user` parameter to `updateEntry`.

---

### BUG-3: `parseInt` on query params can produce `NaN` silently

**File:** `worker/src/routes/user.ts:66`, `worker/src/routes/admin/entries.ts:49`  
**Severity:** Low — D1 will likely error with a clear message, but `NaN` should never reach the DB

```ts
const page = parseInt(c.req.query('page') || '1');
```

If a caller passes `?page=abc`, `parseInt('abc')` returns `NaN`. This flows into:
```ts
const offset = pageSize > 0 ? (page - 1) * pageSize : 0;
// (NaN - 1) * 20 = NaN
```

D1 would receive `OFFSET NaN`. The fix is one line:

```ts
const page = Math.max(1, parseInt(c.req.query('page') || '1') || 1);
```

---

### BUG-4: Double-fetch in `PATCH /admin/entries/:id`

**File:** `worker/src/routes/admin/entries.ts:96–104`  
**Severity:** Low — performance issue, not a correctness bug

The route fetches the entry (line 96), then `updateEntry` fetches it again internally (line 209 of `entryService.ts`). Two round-trips to D1 for every admin entry edit.

---

## Recommendations Summary

### Fix Now

| # | Action | File | Effort |
|---|---|---|---|
| R-1 | Escape newlines in CSV notes | `exportService.ts:24` | 1 line |
| R-2 | Pass user context to `updateEntry` to fix null zone | `entryService.ts:217`, `admin/entries.ts:100` | Small |
| R-3 | Guard `parseInt` results against `NaN` | `routes/user.ts:66`, `admin/entries.ts:49` | 2 lines |
| R-4 | Remove merge conflict marker from `AGENTS.md:688` | `AGENTS.md` | Trivial |
| R-5 | Delete duplicated file tree in `AGENTS.md:139–150` | `AGENTS.md` | Trivial |

### Fix Soon

| # | Action | File | Effort |
|---|---|---|---|
| R-6 | Delete local `formatEntryWithZone` in `entries.ts`, import from `entryService` | `admin/entries.ts:25–45` | Small |
| R-7 | Type `FormattedEntry.zone` as zone union, not `string` | `admin/types.ts:94` | Small |
| R-8 | Type `validateShortLink` properly, remove `any` params | `routes/user.ts:38` | Small |
| R-9 | Type `EntryRecord.medication_timing`, `period`, `AuditLogRecord.action` as unions | `admin/types.ts` | Small |
| R-10 | Fix `frontend/src/__tests__/zone.test.ts` to import from `utils/zone.ts` | `frontend/src/__tests__/zone.test.ts` | Trivial |
| R-11 | Add `lib/audit.ts` tests | new file | Small |
| R-12 | Change `admin.tsx` extension to `.ts` (no JSX in file) | `frontend/src/api/admin.tsx` | Trivial |

### Address as Backlog

| # | Action | Backlog Item |
|---|---|---|
| R-13 | Add backend HTML sanitization on notes before storage | T-11 |
| R-14 | Consolidate duplicate validation constants (frontend ↔ backend) | T-03 |
| R-15 | Enforce maximum `pageSize` in entry endpoints | New |
| R-16 | Replace timestamp-array rate limiter with sliding window counter | New |
| R-17 | Consider passing session/IP as `admin_id` in audit logs | New |
| R-18 | Add E2E tests (Playwright) for critical paths | T-06 |
| R-19 | Wire up `PeakFlowChart.tsx` and `SpO2Chart.tsx` | B-05 |

---

## Appendix — Files Reviewed

### Backend (`worker/src/`)
- `index.ts`
- `routes/user.ts`
- `routes/zone.ts`
- `routes/redirect.ts`
- `routes/admin/index.ts`
- `routes/admin/users.ts`
- `routes/admin/entries.ts`
- `routes/admin/audit.ts`
- `routes/admin/types.ts`
- `lib/database.ts`
- `lib/audit.ts`
- `lib/peakFlow.ts`
- `middleware/rateLimit.ts`
- `services/entryService.ts`
- `services/userService.ts`
- `services/exportService.ts`
- `constants/pagination.ts`
- `__tests__/api-flows.test.ts`
- `__tests__/schemas.test.ts`
- `__tests__/zone.test.ts`
- `__tests__/rate-limit.test.ts`
- `__tests__/database-validation.test.ts`

### Frontend (`frontend/src/`)
- `App.tsx`
- `types/index.ts`
- `constants/validation.ts`
- `api/client.ts`
- `api/admin.tsx`
- `api/user.ts`
- `utils/zone.ts`
- `utils/date.ts`
- `utils/entryGrouping.ts`
- `components/EntryForm.tsx`
- `components/DateFilter.tsx`
- `pages/AdminDashboard.tsx`
- `pages/AdminUserDetail.tsx`
- `pages/UserDashboard.tsx`
- `__tests__/zone.test.ts`

### Documentation
- `AGENTS.md`
- `BACKLOGS.md`
- `ISSUUETOFIX.md`
- `TESTING_GUIDE.md`
- `worker/RATE_LIMITING.md`
- `worker/TEST_PROTOCOL.md`
