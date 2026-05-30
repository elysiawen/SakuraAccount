import { Pool as PgPool } from 'pg';
import mysql from 'mysql2/promise';

type DbType = 'postgres' | 'mysql';
export type SqlValue = string | number | boolean | null | Date | Buffer;
export type SqlParams = SqlValue[];
export type SqlRow = Record<string, unknown>;

interface PgResultLike {
  rows?: SqlRow[];
  rowCount?: number | null;
}

interface MysqlResultLike {
  affectedRows?: number;
}

export type ExecuteResult = PgResultLike | MysqlResultLike;

export function isExecuteWithAffectedRows(result: ExecuteResult): result is { affectedRows: number } {
  return 'affectedRows' in result && typeof result.affectedRows === 'number';
}

export function isExecuteWithRowCount(result: ExecuteResult): result is { rowCount: number | null } {
  return 'rowCount' in result;
}

function isColumnExistsError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const knownError = error as { code?: string; errno?: number };
  return knownError.code === '42701' || knownError.errno === 1060;
}

interface DatabaseConfig {
  type: DbType;
  postgres?: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  };
  mysql?: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  };
}

class Database {
  private config: DatabaseConfig;
  private pgPool: PgPool | null = null;
  private mysqlPool: mysql.Pool | null = null;

  constructor() {
    const dbType = (process.env.DB_TYPE || 'postgres') as DbType;

    this.config = {
      type: dbType,
      postgres: {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: parseInt(process.env.POSTGRES_PORT || '5432'),
        database: process.env.POSTGRES_DB || 'sakura_account',
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD || '',
      },
      mysql: {
        host: process.env.MYSQL_HOST || 'localhost',
        port: parseInt(process.env.MYSQL_PORT || '3306'),
        database: process.env.MYSQL_DATABASE || 'sakura_account',
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || '',
      },
    };
  }

  private getPgPool(): PgPool {
    if (!this.pgPool) {
      this.pgPool = new PgPool({
        host: this.config.postgres!.host,
        port: this.config.postgres!.port,
        database: this.config.postgres!.database,
        user: this.config.postgres!.user,
        password: this.config.postgres!.password,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });
    }
    return this.pgPool;
  }

  private getMysqlPool(): mysql.Pool {
    if (!this.mysqlPool) {
      this.mysqlPool = mysql.createPool({
        host: this.config.mysql!.host,
        port: this.config.mysql!.port,
        database: this.config.mysql!.database,
        user: this.config.mysql!.user,
        password: this.config.mysql!.password,
        waitForConnections: true,
        connectionLimit: 20,
        queueLimit: 0,
      });
    }
    return this.mysqlPool;
  }

  private convertPlaceholders(sql: string): string {
    if (this.config.type !== 'postgres') return sql;
    let index = 0;
    return sql.replace(/\?/g, () => `$${++index}`);
  }

  async query<T extends SqlRow = SqlRow>(sql: string, params?: SqlParams): Promise<T[]> {
    if (this.config.type === 'postgres') {
      const pool = this.getPgPool();
      const pgSql = this.convertPlaceholders(sql);
      const result = await pool.query(pgSql, params);
      return result.rows as T[];
    } else {
      const pool = this.getMysqlPool();
      const [rows] = await pool.execute(sql, params);
      return rows as T[];
    }
  }

  async getOne<T extends SqlRow = SqlRow>(sql: string, params?: SqlParams): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows[0] || null;
  }

  async execute(sql: string, params?: SqlParams): Promise<ExecuteResult> {
    if (this.config.type === 'postgres') {
      const pool = this.getPgPool();
      const pgSql = this.convertPlaceholders(sql);
      return await pool.query(pgSql, params);
    } else {
      const pool = this.getMysqlPool();
      const [result] = await pool.execute(sql, params);
      return result as unknown as ExecuteResult;
    }
  }

  async initialize(): Promise<void> {
    await this.createTables();
  }

  private async createTables(): Promise<void> {
    const isPostgres = this.config.type === 'postgres';
    const jsonType = isPostgres ? 'JSONB' : 'JSON';
    const timestampType = isPostgres ? 'TIMESTAMP' : 'DATETIME';
    const textType = 'TEXT';
    const varcharType = (len: number) => `VARCHAR(${len})`;

    // Users table - using UUID v7 as primary key
    await this.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id ${varcharType(36)} PRIMARY KEY,
        username ${varcharType(50)} UNIQUE NOT NULL,
        email ${varcharType(255)} UNIQUE NOT NULL,
        password_hash ${varcharType(255)},
        nickname ${varcharType(100)},
        avatar ${textType},
        role ${varcharType(20)} DEFAULT 'user',
        email_verified BOOLEAN DEFAULT FALSE,
        two_factor_enabled BOOLEAN DEFAULT FALSE,
        two_factor_secret ${varcharType(255)},
        created_at ${timestampType} DEFAULT CURRENT_TIMESTAMP,
        updated_at ${timestampType} DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Sessions table
    await this.execute(`
      CREATE TABLE IF NOT EXISTS sessions (
        id ${varcharType(255)} PRIMARY KEY,
        user_id ${varcharType(36)} NOT NULL,
        ip ${varcharType(45)},
        user_agent ${textType},
        expires_at ${timestampType} NOT NULL,
        created_at ${timestampType} DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // WebAuthn credentials table
    await this.execute(`
      CREATE TABLE IF NOT EXISTS webauthn_credentials (
        id ${varcharType(255)} PRIMARY KEY,
        user_id ${varcharType(36)} NOT NULL,
        credential_id ${textType} UNIQUE NOT NULL,
        public_key ${textType} NOT NULL,
        counter BIGINT DEFAULT 0,
        device_type ${varcharType(100)},
        backup_eligible BOOLEAN DEFAULT FALSE,
        backup_state BOOLEAN DEFAULT FALSE,
        transports ${textType},
        name ${varcharType(255)},
        aaguid ${varcharType(36)},
        last_used ${timestampType} DEFAULT CURRENT_TIMESTAMP,
        created_at ${timestampType} DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Migration: add new columns to existing webauthn_credentials tables
    for (const col of [
      { name: 'name', def: `${varcharType(255)}` },
      { name: 'aaguid', def: `${varcharType(36)}` },
      { name: 'last_used', def: `${timestampType} DEFAULT CURRENT_TIMESTAMP` },
    ]) {
      try {
        await this.execute(`ALTER TABLE webauthn_credentials ADD COLUMN ${col.name} ${col.def}`);
      } catch (e: unknown) {
        if (!isColumnExistsError(e)) {
          console.error(`Failed to add ${col.name} column:`, e);
        }
      }
    }

    // OAuth2 clients table
    await this.execute(`
      CREATE TABLE IF NOT EXISTS oauth2_clients (
        id ${varcharType(255)} PRIMARY KEY,
        nano_id ${varcharType(32)} UNIQUE NOT NULL,
        secret ${varcharType(255)} NOT NULL,
        name ${varcharType(255)} NOT NULL,
        description ${textType},
        redirect_uris ${jsonType} NOT NULL,
        grants ${jsonType} NOT NULL,
        scopes ${jsonType} NOT NULL,
        status ${varcharType(20)} DEFAULT 'active',
        user_id ${varcharType(36)},
        created_at ${timestampType} DEFAULT CURRENT_TIMESTAMP,
        updated_at ${timestampType} DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Add status column to existing oauth2_clients tables
    try {
      await this.execute(`ALTER TABLE oauth2_clients ADD COLUMN status ${varcharType(20)} DEFAULT 'active'`);
      console.log('Added status column to oauth2_clients');
    } catch (e: unknown) {
      // Column already exists is fine (PostgreSQL: 42701, MySQL: 1060)
      if (!isColumnExistsError(e)) {
        console.error('Failed to add status column:', e);
      }
    }

    // Add nano_id column to existing oauth2_clients tables
    try {
      // Check if column exists first
      const checkCol = await this.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'oauth2_clients' AND column_name = 'nano_id'`
      );
      if (checkCol.length === 0) {
        await this.execute(`ALTER TABLE oauth2_clients ADD COLUMN nano_id ${varcharType(32)}`);
        // Backfill existing rows with generated nano_ids
        const { nanoid } = await import('nanoid');
        const rows = await this.query('SELECT id FROM oauth2_clients WHERE nano_id IS NULL');
        for (const row of rows) {
          await this.execute('UPDATE oauth2_clients SET nano_id = ? WHERE id = ?', [nanoid(32), String(row.id)]);
        }
        // Add unique constraint after backfill
        await this.execute('ALTER TABLE oauth2_clients ADD CONSTRAINT uq_oauth2_clients_nano_id UNIQUE (nano_id)');
      }
    } catch (e) {
      console.error('Failed to add nano_id column:', e);
    }

    // OAuth2 authorization codes table
    await this.execute(`
      CREATE TABLE IF NOT EXISTS oauth2_authorization_codes (
        id ${varcharType(255)} PRIMARY KEY,
        client_id ${varcharType(255)} NOT NULL,
        user_id ${varcharType(36)} NOT NULL,
        redirect_uri ${textType} NOT NULL,
        scopes ${jsonType} NOT NULL,
        nonce ${textType},
        expires_at ${timestampType} NOT NULL,
        created_at ${timestampType} DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES oauth2_clients(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Add nonce column to existing oauth2_authorization_codes tables
    try {
      await this.execute(`ALTER TABLE oauth2_authorization_codes ADD COLUMN nonce ${textType}`);
      console.log('Added nonce column to oauth2_authorization_codes');
    } catch (e: unknown) {
      if (!isColumnExistsError(e)) {
        console.error('Failed to add nonce column:', e);
      }
    }

    // Add icon column to existing oauth2_clients tables
    try {
      await this.execute(`ALTER TABLE oauth2_clients ADD COLUMN icon ${textType}`);
      console.log('Added icon column to oauth2_clients');
    } catch (e: unknown) {
      if (!isColumnExistsError(e)) {
        console.error('Failed to add icon column:', e);
      }
    }

    // Add app_url column to existing oauth2_clients tables
    try {
      await this.execute(`ALTER TABLE oauth2_clients ADD COLUMN app_url ${textType}`);
      console.log('Added app_url column to oauth2_clients');
    } catch (e: unknown) {
      if (!isColumnExistsError(e)) {
        console.error('Failed to add app_url column:', e);
      }
    }

    // Add ip_location and isp columns to sessions table
    try {
      await this.execute(`ALTER TABLE sessions ADD COLUMN ip_location ${varcharType(255)}`);
    } catch (e: unknown) {
      if (!isColumnExistsError(e)) {
        console.error('Failed to add ip_location column:', e);
      }
    }
    try {
      await this.execute(`ALTER TABLE sessions ADD COLUMN isp ${varcharType(255)}`);
    } catch (e: unknown) {
      if (!isColumnExistsError(e)) {
        console.error('Failed to add isp column:', e);
      }
    }

    // OAuth2 tokens table
    await this.execute(`
      CREATE TABLE IF NOT EXISTS oauth2_tokens (
        id ${varcharType(255)} PRIMARY KEY,
        client_id ${varcharType(255)} NOT NULL,
        user_id ${varcharType(36)},
        access_token ${textType} UNIQUE NOT NULL,
        refresh_token ${textType},
        scopes ${jsonType} NOT NULL,
        expires_at ${timestampType} NOT NULL,
        created_at ${timestampType} DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES oauth2_clients(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Add refresh_expires_at column to existing oauth2_tokens tables
    try {
      await this.execute(`ALTER TABLE oauth2_tokens ADD COLUMN refresh_expires_at ${timestampType}`);
    } catch (e: unknown) {
      if (!isColumnExistsError(e)) {
        console.error('Failed to add refresh_expires_at column:', e);
      }
    }

    // Make user_id nullable for client_credentials (no user context)
    try {
      if (this.config.type === 'mysql') {
        await this.execute(`ALTER TABLE oauth2_tokens MODIFY user_id ${varcharType(36)}`);
      } else {
        await this.execute(`ALTER TABLE oauth2_tokens ALTER COLUMN user_id DROP NOT NULL`);
      }
    } catch {
      // Column may already be nullable — ignore
    }

    // Update FK constraint to SET NULL on delete (for client_credentials tokens)
    try {
      if (this.config.type === 'mysql') {
        const fkRows = await this.query(
          `SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
           WHERE TABLE_NAME = 'oauth2_tokens' AND COLUMN_NAME = 'user_id'
           AND REFERENCED_TABLE_NAME = 'users' AND CONSTRAINT_SCHEMA = DATABASE()`
        );
        if (fkRows.length > 0) {
          await this.execute(`ALTER TABLE oauth2_tokens DROP FOREIGN KEY \`${fkRows[0].CONSTRAINT_NAME}\``);
          await this.execute(`ALTER TABLE oauth2_tokens ADD FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL`);
        }
      } else {
        const fkRows = await this.query(
          `SELECT constraint_name FROM information_schema.table_constraints
           WHERE table_name = 'oauth2_tokens' AND constraint_type = 'FOREIGN KEY'
           AND constraint_name LIKE '%user_id%'`
        );
        if (fkRows.length > 0) {
          await this.execute(`ALTER TABLE oauth2_tokens DROP CONSTRAINT "${fkRows[0].constraint_name}"`);
          await this.execute(`ALTER TABLE oauth2_tokens ADD FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL`);
        }
      }
    } catch {
      // Constraint may already be updated — ignore
    }

    // OAuth2 consents table
    await this.execute(`
      CREATE TABLE IF NOT EXISTS oauth2_consents (
        id SERIAL PRIMARY KEY,
        user_id ${varcharType(36)} NOT NULL,
        client_id ${varcharType(255)} NOT NULL,
        scopes ${jsonType} NOT NULL,
        created_at ${timestampType} DEFAULT CURRENT_TIMESTAMP,
        updated_at ${timestampType} DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, client_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (client_id) REFERENCES oauth2_clients(id) ON DELETE CASCADE
      )
    `);

    // Audit logs table
    await this.execute(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id ${varcharType(36)},
        category ${varcharType(50)} DEFAULT 'operation',
        action ${varcharType(100)} NOT NULL,
        details ${jsonType},
        ip ${varcharType(45)},
        user_agent ${textType},
        created_at ${timestampType} DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Add category column to existing audit_logs tables
    try {
      await this.execute(`ALTER TABLE audit_logs ADD COLUMN category ${varcharType(50)} DEFAULT 'operation'`);
    } catch (e: unknown) {
      if (!isColumnExistsError(e)) {
        console.error('Failed to add category column:', e);
      }
    }

    // Email verification tokens table
    await this.execute(`
      CREATE TABLE IF NOT EXISTS email_verifications (
        id SERIAL PRIMARY KEY,
        user_id ${varcharType(36)} NOT NULL,
        token ${varcharType(255)} UNIQUE NOT NULL,
        expires_at ${timestampType} NOT NULL,
        created_at ${timestampType} DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Password reset tokens table
    await this.execute(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id SERIAL PRIMARY KEY,
        user_id ${varcharType(36)} NOT NULL,
        token ${varcharType(255)} UNIQUE NOT NULL,
        expires_at ${timestampType} NOT NULL,
        created_at ${timestampType} DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Global config table
    await this.execute(`
      CREATE TABLE IF NOT EXISTS global_config (
        key ${varcharType(255)} PRIMARY KEY,
        value ${textType},
        updated_at ${timestampType} DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Migrate old icon format: {"mode":"upload","url":"..."} -> new format
    try {
      const rows = await this.query("SELECT id, icon FROM oauth2_clients WHERE icon LIKE '{%}'");
      for (const row of rows) {
        try {
          const icon = String(row.icon);
          const parsed = JSON.parse(icon);
          const id = String(row.id);
          if (parsed.mode === 'upload' && parsed.url) {
            await this.execute('UPDATE oauth2_clients SET icon = ? WHERE id = ?', [parsed.url, id]);
            console.log(`Migrated icon for client ${id}: upload -> ${parsed.url}`);
          } else if (parsed.mode === 'auto') {
            await this.execute('UPDATE oauth2_clients SET icon = ? WHERE id = ?', ['auto', id]);
            console.log(`Migrated icon for client ${id}: auto`);
          } else if (parsed.mode === 'default') {
            await this.execute('UPDATE oauth2_clients SET icon = ? WHERE id = ?', ['default', id]);
            console.log(`Migrated icon for client ${id}: default`);
          }
        } catch {
          // Skip invalid JSON
        }
      }
      // Also migrate NULL to 'default'
      await this.execute("UPDATE oauth2_clients SET icon = 'default' WHERE icon IS NULL");
    } catch (e) {
      // Migration may fail if table doesn't exist yet, that's ok
      console.log('Icon migration skipped:', (e as Error).message);
    }

    // Create indexes
    await this.createIndexes();
  }

  private async createIndexes(): Promise<void> {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)',
      'CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_user_id ON webauthn_credentials(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_oauth2_tokens_access_token ON oauth2_tokens(access_token)',
      'CREATE INDEX IF NOT EXISTS idx_oauth2_tokens_user_id ON oauth2_tokens(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_oauth2_clients_nano_id ON oauth2_clients(nano_id)',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON audit_logs(category)',
      'CREATE INDEX IF NOT EXISTS idx_email_verifications_token ON email_verifications(token)',
      'CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token)',
    ];

    for (const index of indexes) {
      await this.execute(index);
    }
  }

  async close(): Promise<void> {
    if (this.pgPool) {
      await this.pgPool.end();
    }
    if (this.mysqlPool) {
      await this.mysqlPool.end();
    }
  }

  // Global config methods
  async getGlobalConfig(): Promise<Record<string, unknown>> {
    const rows = await this.query('SELECT key, value FROM global_config');
    const config: Record<string, unknown> = {};
    for (const row of rows) {
      try {
        config[String(row.key)] = JSON.parse(String(row.value));
      } catch {
        config[String(row.key)] = row.value;
      }
    }
    return config;
  }

  async getGlobalConfigValue(key: string): Promise<unknown | null> {
    const row = await this.getOne('SELECT value FROM global_config WHERE key = ?', [key]);
    if (!row) return null;
    try {
      return JSON.parse(String(row.value));
    } catch {
      return row.value;
    }
  }

  async setGlobalConfig(key: string, value: unknown): Promise<void> {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    const isPostgres = this.config.type === 'postgres';
    
    if (isPostgres) {
      await this.execute(
        `INSERT INTO global_config (key, value, updated_at) VALUES (?, ?, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [key, stringValue]
      );
    } else {
      await this.execute(
        `INSERT INTO global_config (key, value, updated_at) VALUES (?, ?, NOW())
         ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = NOW()`,
        [key, stringValue]
      );
    }
  }

  async setGlobalConfigBatch(config: Record<string, unknown>): Promise<void> {
    for (const [key, value] of Object.entries(config)) {
      await this.setGlobalConfig(key, value);
    }
  }
}

export const db = new Database();
