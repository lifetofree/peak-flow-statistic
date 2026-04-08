export class DatabaseClient {
  constructor(private env: any) {}

  async find<T>(table: string, filter: Record<string, any> = {}, options?: {
    orderBy?: string;
    order?: 'ASC' | 'DESC';
    limit?: number;
    offset?: number;
  }): Promise<T[]> {
    let query = `SELECT * FROM ${table} WHERE 1=1`;
    const bindings: any[] = [];

    for (const [key, value] of Object.entries(filter)) {
      if (value === null) {
        query += ` AND ${key} IS NULL`;
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

    if (options?.limit) {
      query += ` LIMIT ?`;
      bindings.push(options.limit);
    }

    if (options?.offset) {
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
