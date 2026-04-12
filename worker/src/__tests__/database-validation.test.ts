import { describe, it, expect } from 'vitest';

const ALLOWED_TABLES = ['users', 'entries', 'audit_logs'] as const;

const ALLOWED_COLUMNS = [
  'id', 'first_name', 'last_name', 'nickname', 'short_token', 'short_code',
  'click_count', 'personal_best', 'admin_note', 'deleted_at',
  'created_at', 'updated_at',
  'user_id', 'date', 'peak_flow_readings', 'peak_flow', 'spo2',
  'medication_timing', 'period', 'note',
  'admin_id', 'target_id', 'target_model', 'action', 'diff', 'timestamp',
] as const;

const ALLOWED_ORDER_COLUMNS = [
  'id', 'first_name', 'last_name', 'nickname', 'created_at', 'updated_at',
  'date', 'peak_flow', 'spo2', 'medication_timing', 'period', 'timestamp',
] as const;

function assertTable(table: string): void {
  if (!(ALLOWED_TABLES as readonly string[]).includes(table)) {
    throw new Error(`Invalid table: ${table}`);
  }
}

function assertColumn(column: string): void {
  if (!(ALLOWED_COLUMNS as readonly string[]).includes(column)) {
    throw new Error(`Invalid column: ${column}`);
  }
}

function assertOrderColumn(column: string): void {
  if (!(ALLOWED_ORDER_COLUMNS as readonly string[]).includes(column)) {
    throw new Error(`Invalid order column: ${column}`);
  }
}

describe('DatabaseClient validation', () => {
  describe('assertTable', () => {
    it('accepts valid tables', () => {
      expect(() => assertTable('users')).not.toThrow();
      expect(() => assertTable('entries')).not.toThrow();
      expect(() => assertTable('audit_logs')).not.toThrow();
    });

    it('rejects invalid tables', () => {
      expect(() => assertTable('evil_table')).toThrow('Invalid table');
      expect(() => assertTable('')).toThrow('Invalid table');
      expect(() => assertTable('users; DROP TABLE users--')).toThrow('Invalid table');
    });
  });

  describe('assertColumn', () => {
    it('accepts valid columns', () => {
      expect(() => assertColumn('id')).not.toThrow();
      expect(() => assertColumn('first_name')).not.toThrow();
      expect(() => assertColumn('user_id')).not.toThrow();
      expect(() => assertColumn('created_at')).not.toThrow();
    });

    it('rejects invalid columns', () => {
      expect(() => assertColumn('evil_column')).toThrow('Invalid column');
      expect(() => assertColumn('id; DROP TABLE users--')).toThrow('Invalid column');
      expect(() => assertColumn('1=1')).toThrow('Invalid column');
    });
  });

  describe('assertOrderColumn', () => {
    it('accepts valid order columns', () => {
      expect(() => assertOrderColumn('date')).not.toThrow();
      expect(() => assertOrderColumn('created_at')).not.toThrow();
      expect(() => assertOrderColumn('timestamp')).not.toThrow();
    });

    it('rejects invalid order columns', () => {
      expect(() => assertOrderColumn('evil')).toThrow('Invalid order column');
      expect(() => assertOrderColumn('date DESC; --')).toThrow('Invalid order column');
    });
  });
});
