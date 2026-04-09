# PeakFlowStat - Changelog

## Current Version
v1.1.0 (2026-04-08)


| Date | Version | Change |
|------|---------|--------|
| 2026-04-07 | v33 | User dashboard table: same layout as admin (date/period/med grouping, 20 dates/page, pagination). Card view: 10 cards/page pagination. PF header shows (L/min), PF values use default color (no zone). Note icon only shows when entry has note. common.close added to th.json. |
| 2026-04-07 | v32 | Admin user detail table: grouped by date, period, medication timing. Separate PF/SpO2/Note columns. Note shows 📄 icon, click for modal. |
| 2026-04-07 | v31 | Added CORS_ORIGIN required check. Added console.warn to JSON.parse catch blocks. |
| 2026-04-07 | v30 | Fixed getBestReading() null on empty array. Admin entries excludes soft-deleted users. Admin note Zod validation max 5000. |
| 2026-04-07 | v29 | CSV filename sanitization. rehype-sanitize added to all ReactMarkdown usages. |
| 2026-04-07 | v28 | Fixed N+1 query in admin users list using batch subquery. |
| 2026-04-07 | v27 | Added $gte/$lte operators. peakFlowReadings validation fixed to array (not tuple). |
| 2026-04-07 | v26 | TABLE_COLUMNS whitelist prevents SQL injection. |
| 2026-04-07 | v25 | Flattened admin entries response. Added 20 sample users to D1. |
| 2026-04-07 | v24 | Fixed VITE_API_URL missing /api. Removed duplicate wrangler.toml files. |
| 2026-04-07 | v23 | Full Cloudflare redeployment. New D1, new domain peakflowstat.allergyclinic.cc |
| 2026-04-07 | v22 | Fixed short link 404 - _redirects and absolute FRONTEND_URL |
| 2026-04-07 | v21 | Deployed full-stack to Cloudflare |
