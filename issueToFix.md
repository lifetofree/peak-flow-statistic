# PeakFlowStatX — Issues

All previously tracked issues have been resolved as of 2026-04-07 (v11).

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
