const ALLOWED_TABLES = ['users', 'entries', 'audit_logs'] as const;
const ALLOWED_ORDER_COLUMNS = [
  'id', 'first_name', 'last_name', 'nickname', 'created_at', 'updated_at',
  'date', 'peak_flow', 'spo2', 'medication_timing', 'period',
  'timestamp'
] as const;

function assertTable(table: string): asserts table is typeof ALLOWED_TABLES[number] {
  if (!ALLOWED_TABLES.includes(table as any)) {
    throw new Error(`Invalid table: ${table}`);
  }
}

function assertOrderColumn(column: string): asserts column is typeof ALLOWED_ORDER_COLUMNS[number] {
  if (!ALLOWED_ORDER_COLUMNS.includes(column as any)) {
    throw new Error(`Invalid order column: ${column}`);
  }
}

export class DatabaseClient {
  constructor(private env: any) {}

  async find<T>(table: string, filter: Record<string, any> = {}, options?: {
    orderBy?: string;
    order?: 'ASC' | 'DESC';
    limit?: number;
    offset?: number;
  }): Promise<T[]> {
    assertTable(table);
    if (options?.orderBy) {
      assertOrderColumn(options.orderBy);
    }

    let query = `SELECT * FROM ${table} WHERE 1=1`;
    const bindings: any[] = [];

    for (const [key, value] of Object.entries(filter)) {
      if (value === null) {
        query += ` AND ${key} IS NULL`;
      } else if (Array.isArray(value)) {
        if (value.length === 0) {
          query += ` AND 1=0`; // No results if empty array
        } else {
          const placeholders = value.map(() => '?').join(', ');
          query += ` AND ${key} IN (${placeholders})`;
          bindings.push(...value);
        }
      } else if (typeof value === 'string' && value.includes('%')) {
        query += ` AND ${key} LIKE ?`;
        bindings.push(value);
      } else {
        query += ` AND ${key} = ?`;
        bindings.push(value);
      }
    }

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

  async findOne<T>(table: string, filter: Record<string, any>): Promise<T | null> {
    const results = await this.find<T>(table, filter, { limit: 1 });
    return results[0] || null;
  }

  async count(table: string, filter: Record<string, any> = {}): Promise<number> {
    let query = `SELECT COUNT(*) as count FROM ${table} WHERE 1=1`;
    const bindings: any[] = [];

    for (const [key, value] of Object.entries(filter)) {
      if (value === null) {
        query += ` AND ${key} IS NULL`;
      } else {
        query += ` AND ${key} = ?`;
        bindings.push(value);
      }
    }

    const result = await this.env.DB.prepare(query).bind(...bindings).first();
    return result?.count || 0;
  }

  async insertOne(table: string, data: Record<string, any>): Promise<void> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');
    
    const query = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
    await this.env.DB.prepare(query).bind(...values).run();
  }

  async updateOne(table: string, filter: Record<string, any>, data: Record<string, any>): Promise<void> {
    const setClauses = Object.keys(data).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(data), ...Object.values(filter)];
    
    let query = `UPDATE ${table} SET ${setClauses} WHERE 1=1`;
    for (const [key, value] of Object.entries(filter)) {
      if (value === null) {
        query += ` AND ${key} IS NULL`;
      } else {
        query += ` AND ${key} = ?`;
      }
    }

    await this.env.DB.prepare(query).bind(...values).run();
  }

  async deleteOne(table: string, filter: Record<string, any>): Promise<void> {
    let query = `DELETE FROM ${table} WHERE 1=1`;
    const bindings: any[] = [];

    for (const [key, value] of Object.entries(filter)) {
      if (value === null) {
        query += ` AND ${key} IS NULL`;
      } else {
        query += ` AND ${key} = ?`;
        bindings.push(value);
      }
    }

    await this.env.DB.prepare(query).bind(...bindings).run();
  }
}
