# API Reference — PeakFlowStat

**Base URL (prod):** `https://api.peakflowstat.allergyclinic.cc`  
**Last updated:** 2026-05-15

All request/response bodies are JSON unless noted. Dates are ISO-8601 strings.

---

## Health

### GET /api/health
Returns worker status.

**Response 200**
```json
{ "status": "ok" }
```

---

## Short-Link Redirect

### GET /s/:code
Resolves an 8-character hex short code to the patient dashboard. Increments `click_count`.

| Param | Type | Description |
|---|---|---|
| `code` | path | 8-char hex `short_code` |

**Response:** `302` redirect to `{FRONTEND_URL}/u/{short_token}`  
**Response 302 (not found):** redirect to `/`

---

## Patient Routes (`/api/u/:token`)

All patient routes require `:token` = user's `short_token` (UUID v4). Returns 404 if token is unknown or user is soft-deleted.

Rate limit: **100 req / 15 min per IP**. Exceeded → `429` with `{ error, code: "RATE_LIMIT_EXCEEDED" }`.

---

### GET /api/u/:token
Returns patient's profile.

**Response 200**
```json
{
  "_id": "uuid",
  "firstName": "string",
  "lastName": "string",
  "nickname": "string",
  "personalBest": 450,        // integer L/min, or null
  "instructionBox": "<html>", // WYSIWYG HTML from admin
  "userNote": "string"        // patient-editable note
}
```

---

### PATCH /api/u/:token
Patient updates their own note.

**Body**
```json
{ "userNote": "string" }
```

**Response 200**
```json
{ "success": true }
```

---

### GET /api/u/:token/entries
Returns paginated entries for the patient.

**Query params**

| Param | Default | Description |
|---|---|---|
| `page` | `1` | Page number |
| `pageSize` | `0` (all) | Records per page. `0` = no limit. |
| `from` | — | ISO date `YYYY-MM-DD`, inclusive lower bound |
| `to` | — | ISO date `YYYY-MM-DD`, inclusive upper bound |

**Response 200**
```json
{
  "entries": [
    {
      "entry": {
        "_id": "uuid",
        "userId": "uuid",
        "date": "2026-05-15",
        "peakFlowReadings": [420, 430, 425],
        "spO2": 98,
        "medicationTiming": "before",
        "period": "morning",
        "note": "string",
        "createdAt": "2026-05-15T06:00:00.000Z",
        "updatedAt": "2026-05-15T06:00:00.000Z"
      },
      "zone": { "zone": "green", "percentage": 95 }  // null if no personalBest
    }
  ],
  "total": 42,
  "page": 1,
  "pageSize": 0
}
```

**Zone values:** `green` | `orange` | `yellow` | `red`

---

### POST /api/u/:token/entries
Creates a new peak flow entry.

**Body**
```json
{
  "date": "2026-05-15",
  "peakFlowReadings": [420, 430, 425],   // tuple of exactly 3 integers
  "spO2": 98,                            // integer 0–100
  "medicationTiming": "before",          // "before" | "after"
  "period": "morning",                   // "morning" | "evening"
  "note": "optional free text"
}
```

**Validation errors → 400** (Zod)

**Response 201**
```json
{
  "_id": "uuid",
  "userId": "uuid",
  "date": "2026-05-15",
  "peakFlowReadings": [420, 430, 425],
  "spO2": 98,
  "medicationTiming": "before",
  "period": "morning",
  "note": "",
  "createdAt": "...",
  "updatedAt": "..."
}
```

---

### GET /api/u/:token/export
Downloads all entries as CSV (respects `from`/`to` date filters).

**Query params:** `from`, `to` (same as entries endpoint)

**Response 200**  
`Content-Type: text/csv`  
`Content-Disposition: attachment; filename="<FirstName><LastName>-entries.csv"`

CSV columns: `date`, `period`, `medicationTiming`, `peakFlow1`, `peakFlow2`, `peakFlow3`, `bestPeakFlow`, `spO2`, `note`

---

## Admin Routes (`/api/admin`)

No authentication required. Rate limit: **300 req / 15 min per IP**.

---

### GET /api/admin/users
Paginated user list with last entry date.

**Query params**

| Param | Default | Description |
|---|---|---|
| `page` | `1` | Page number |
| `q` | — | Search query (matches first/last name, nickname) |

Page size is fixed at `DEFAULT_PAGE_SIZE` (20).

**Response 200**
```json
{
  "users": [
    {
      "_id": "uuid",
      "firstName": "string",
      "lastName": "string",
      "nickname": "string",
      "shortToken": "uuid",
      "shortCode": "a1b2c3d4",
      "clickCount": 5,
      "personalBest": 450,
      "adminNote": "<html>",
      "instructionBox": "<html>",
      "userNote": "string",
      "deletedAt": null,
      "createdAt": "...",
      "updatedAt": "...",
      "lastEntryDate": "2026-05-14"  // or null
    }
  ],
  "total": 100,
  "page": 1,
  "pageSize": 20
}
```

---

### POST /api/admin/users
Creates a new patient.

**Body**
```json
{
  "firstName": "string",
  "lastName": "string",
  "nickname": "string",
  "personalBest": 450,       // integer 50–900, or null
  "adminNote": "string",     // optional HTML
  "instructionBox": "string" // optional HTML
}
```

Auto-generates: `id` (UUID v4), `short_token` (UUID v4), `short_code` (8-char hex), `created_at`, `updated_at`.

**Response 201** — same shape as user object in list above.

---

### GET /api/admin/users/:id
Returns single user.

**Response 200** — same shape as user object.  
**Response 404** — `{ "error": "Not found" }`

---

### PATCH /api/admin/users/:id
Updates user profile fields.

**Body** (all fields optional)
```json
{
  "firstName": "string",
  "lastName": "string",
  "nickname": "string",
  "personalBest": 450    // integer 50–900, or null
}
```

Writes audit log entry. Cannot update soft-deleted user → `400 { "error": "User is deleted" }`.

**Response 200** — updated user object.

---

### DELETE /api/admin/users/:id
Soft-deletes user (sets `deleted_at`). Writes audit log entry.

**Response 200** `{ "success": true }`  
**Response 404** `{ "error": "Not found" }`

---

### PATCH /api/admin/users/:id/note
Replaces admin note (WYSIWYG HTML, max 5000 chars). Writes audit log.

**Body** `{ "adminNote": "<p>...</p>" }`  
**Response 200** — full updated user object.

---

### PATCH /api/admin/users/:id/instruction
Replaces instruction box (WYSIWYG HTML, max 5000 chars). Writes audit log.

**Body** `{ "instructionBox": "<p>...</p>" }`  
**Response 200** — full updated user object.

---

### PATCH /api/admin/users/:id/user-note
Admin overwrites the patient's self-editable note (max 5000 chars). Writes audit log.

**Body** `{ "userNote": "string" }`  
**Response 200** — full updated user object.

---

### GET /api/admin/users/:id/export
Downloads entries for a specific user as CSV.

**Query params:** `from`, `to` (ISO date, optional)

**Response 200** — same CSV format as patient export.

---

### GET /api/admin/entries
Paginated, filterable entry list across all users.

**Query params**

| Param | Default | Description |
|---|---|---|
| `page` | `1` | Page number |
| `pageSize` | `20` | Records per page. `0` = all (⚠ DoS risk on large datasets) |
| `userId` | — | Filter to a single user |
| `from` | — | ISO date lower bound |
| `to` | — | ISO date upper bound |

**Response 200**
```json
{
  "entries": [
    {
      "_id": "uuid",
      "userId": "uuid",
      "date": "2026-05-15",
      "peakFlowReadings": [420, 430, 425],
      "spO2": 98,
      "medicationTiming": "before",
      "period": "morning",
      "note": "string",
      "zone": { "zone": "green", "percentage": 95 },
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "total": 200,
  "page": 1,
  "pageSize": 20
}
```

---

### PATCH /api/admin/entries/:id
Admin updates an existing entry. Writes audit log.

**Body** (all optional)
```json
{
  "date": "2026-05-15",
  "peakFlowReadings": [400, 410, 420],
  "spO2": 97,
  "medicationTiming": "after",
  "period": "evening",
  "note": "string"
}
```

**Response 200** — updated entry object (with zone).

---

### DELETE /api/admin/entries/:id
Hard-deletes an entry. Writes audit log.

**Response 200** `{ "success": true }`  
**Response 404** `{ "error": "Not found" }`

---

### GET /api/admin/audit
Paginated audit log, newest first.

**Query params**

| Param | Default | Description |
|---|---|---|
| `page` | `1` | |
| `userId` | — | Filter by `target_id` |
| `action` | — | `CREATE` \| `UPDATE` \| `DELETE` |

Page size fixed at 20.

**Response 200**
```json
{
  "logs": [
    {
      "_id": "uuid",
      "adminId": "admin",
      "targetId": "uuid",
      "targetModel": "User",          // "User" | "Entry"
      "action": "UPDATE",             // "CREATE" | "UPDATE" | "DELETE"
      "diff": {
        "before": { "adminNote": "old" },
        "after":  { "adminNote": "new" }
      },
      "timestamp": "2026-05-15T10:00:00.000Z"
    }
  ],
  "total": 500,
  "page": 1,
  "pageSize": 20
}
```

---

## Rate Limit Response Headers

All rate-limited routes return:

```
X-RateLimit-Limit: 100          (or 300 for admin)
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1747300800000
```

When limit exceeded:
```
HTTP 429
Retry-After: 243  (seconds)
{ "error": "Too many requests", "code": "RATE_LIMIT_EXCEEDED" }
```

---

## Error Shape

```json
{ "error": "Human-readable description" }
```

Common HTTP status codes: `400` (validation), `404` (not found), `429` (rate limit), `500` (internal).
