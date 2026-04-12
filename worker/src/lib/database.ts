import type { Env } from '../index';

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

interface RangeOperators {
  $gte?: string | number;
  $lte?: string | number;
}

function isRangeOperators(value: unknown): value is RangeOperators {
  return typeof value === 'object' && value !== null && ('$gte' in value || '$lte' in value);
}

type FilterValue = string | number | null | undefined | (string | number)[] | RangeOperators;
type Filter = Record<string, FilterValue>;

function buildWhereClause(filter: Filter): { where: string; bindings: (string | number | null)[] } {
  const parts: string[] = [];
  const bindings: (string | number | null)[] = [];

  for (const [key, value] of Object.entries(filter)) {
    assertColumn(key);
    if (value === undefined) continue;
    if (value === null) {
      parts.push(`${key} IS NULL`);
    } else if (isRangeOperators(value)) {
      if (value.$gte !== undefined) {
        parts.push(`${key} >= ?`);
        bindings.push(value.$gte);
      }
      if (value.$lte !== undefined) {
        parts.push(`${key} <= ?`);
        bindings.push(value.$lte);
      }
    } else if (Array.isArray(value)) {
      if (value.length === 0) {
        parts.push('1=0');
      } else {
        const placeholders = value.map(() => '?').join(', ');
        parts.push(`${key} IN (${placeholders})`);
        bindings.push(...value);
      }
    } else if (typeof value === 'string' && value.includes('%')) {
      parts.push(`${key} LIKE ?`);
      bindings.push(value);
    } else {
      parts.push(`${key} = ?`);
      bindings.push(value);
    }
  }

  const where = parts.length > 0 ? ` AND ${parts.join(' AND ')}` : '';
  return { where, bindings };
}

export class DatabaseClient {
  constructor(private env: Env) {}

  async find<T>(table: string, filter: Filter = {}, options?: {
    orderBy?: string;
    order?: 'ASC' | 'DESC';
    limit?: number;
    offset?: number;
  }): Promise<T[]> {
    assertTable(table);
    if (options?.orderBy) assertOrderColumn(options.orderBy);

    const { where, bindings } = buildWhereClause(filter);
    let query = `SELECT * FROM ${table} WHERE 1=1${where}`;

    if (options?.orderBy) {
      query += ` ORDER BY ${options.orderBy} ${options.order || 'ASC'}`;
    }

    if (options?.limit !== undefined) {
      query += ` LIMIT ?`;
      bindings.push(options.limit);
    }

    if (options?.offset !== undefined) {
      query += ` OFFSET ?`;
      bindings.push(options.offset);
    }

    const result = await this.env.DB.prepare(query).bind(...bindings).all();
    return result.results as T[];
  }

  async findOne<T>(table: string, filter: Filter): Promise<T | null> {
    const results = await this.find<T>(table, filter, { limit: 1 });
    return results[0] || null;
  }

  async count(table: string, filter: Filter = {}): Promise<number> {
    assertTable(table);
    const { where, bindings } = buildWhereClause(filter);
    const query = `SELECT COUNT(*) as count FROM ${table} WHERE 1=1${where}`;
    const result = await this.env.DB.prepare(query).bind(...bindings).first();
    return (result?.count as number) || 0;
  }

  async insertOne(table: string, data: Record<string, unknown>): Promise<void> {
    assertTable(table);
    const keys = Object.keys(data);
    keys.forEach(assertColumn);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');
    const query = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
    await this.env.DB.prepare(query).bind(...values).run();
  }

  async updateOne(table: string, filter: Filter, data: Record<string, unknown>): Promise<void> {
    assertTable(table);
    Object.keys(data).forEach(assertColumn);
    Object.keys(filter).forEach(assertColumn);

    const setClauses = Object.keys(data).map(key => `${key} = ?`).join(', ');
    const setValues = Object.values(data);
    const { where, bindings: filterBindings } = buildWhereClause(filter);

    const query = `UPDATE ${table} SET ${setClauses} WHERE 1=1${where}`;
    await this.env.DB.prepare(query).bind(...setValues, ...filterBindings).run();
  }

  async deleteOne(table: string, filter: Filter): Promise<void> {
    assertTable(table);
    const { where, bindings } = buildWhereClause(filter);
    const query = `DELETE FROM ${table} WHERE 1=1${where}`;
    await this.env.DB.prepare(query).bind(...bindings).run();
  }
}
