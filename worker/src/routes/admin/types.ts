/**
 * Admin Module Type Definitions.
 * 
 * DatabaseRecord types: Raw database column names (snake_case).
 * Formatted types: API response format (camelCase).
 */

/**
 * Base interface for all database records.
 */
export interface DatabaseRecord {
  id: string;
  created_at: string;
  updated_at: string;
}

/**
 * User record as stored in the database.
 * short_token is UUID v4 for dashboard URL (/u/:token).
 * short_code is 8-char hex for short link (/s/:code).
 */
export interface UserRecord extends DatabaseRecord {
  first_name: string;
  last_name: string;
  nickname: string;
  short_token: string;
  short_code: string;
  click_count: number;
  personal_best: number | null;
  admin_note: string;
  deleted_at: string | null;
}

/**
 * Entry record as stored in the database.
 * peak_flow_readings is stored as JSON string.
 */
export interface EntryRecord extends DatabaseRecord {
  user_id: string;
  date: string;
  peak_flow_readings: string;
  peak_flow: number;
  spo2: number;
  medication_timing: string;
  period: string;
  note: string;
}

/**
 * Audit log record as stored in the database.
 * Append-only - no UPDATE or DELETE operations allowed.
 */
export interface AuditLogRecord extends DatabaseRecord {
  admin_id: string;
  target_id: string;
  target_model: string;
  action: string;
  diff: string;
  timestamp: string;
}

/**
 * Formatted user for API responses.
 */
export interface FormattedUser {
  _id: string;
  firstName: string;
  lastName: string;
  nickname: string;
  shortToken: string;
  shortCode: string;
  clickCount: number;
  personalBest: number | null;
  adminNote: string;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  lastEntryDate?: string | null;
}

/**
 * Formatted entry for API responses.
 * Includes zone calculation based on user's personalBest.
 */
export interface FormattedEntry {
  _id: string;
  userId: string;
  date: string;
  peakFlowReadings: number[];
  spO2: number;
  medicationTiming: string;
  period: string;
  note: string;
  zone: { zone: string; percentage: number } | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Formatted audit log for API responses.
 */
export interface FormattedAuditLog {
  _id: string;
  adminId: string;
  targetId: string;
  targetModel: string;
  action: string;
  diff: { before: Record<string, unknown> | null; after: Record<string, unknown> | null };
  timestamp: string;
}
