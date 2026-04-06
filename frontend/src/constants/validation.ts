// ⚠️ IMPORTANT: These constants MUST match backend/src/validators/common.ts exactly.
// Update both files together to prevent validation drift between client and server.
export const PEAK_FLOW_MIN = 50;
export const PEAK_FLOW_MAX = 900;
export const SPO2_MIN = 70;
export const SPO2_MAX = 100;
export const PERSONAL_BEST_MIN = 50;
export const PERSONAL_BEST_MAX = 900;
export const PAGE_SIZE = 20;
