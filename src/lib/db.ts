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
        ip_location ${varcharType(255)},
        isp ${varcharType(255)},
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

    // OAuth2 clients table
    // Schema: nano_id is PK (stable, never changes), client_id is UNIQUE (user-customizable OAuth2 identifier)
    await this.execute(`
      CREATE TABLE IF NOT EXISTS oauth2_clients (
        id ${varcharType(255)} PRIMARY KEY,
        nano_id ${varcharType(32)} UNIQUE NOT NULL,
        secret ${varcharType(255)} NOT NULL,
        name ${varcharType(255)} NOT NULL,
        description ${textType},
        icon ${textType},
        app_url ${textType},
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

    // OAuth2 tokens table
    await this.execute(`
      CREATE TABLE IF NOT EXISTS oauth2_tokens (
        id ${varcharType(255)} PRIMARY KEY,
        client_id ${varcharType(255)} NOT NULL,
        user_id ${varcharType(36)},
        access_token ${textType} UNIQUE NOT NULL,
        refresh_token ${textType},
        refresh_expires_at ${timestampType},
        scopes ${jsonType} NOT NULL,
        expires_at ${timestampType} NOT NULL,
        created_at ${timestampType} DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES oauth2_clients(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

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

    // Migrate oauth2_clients: nano_id → PK, id → client_id (rename)
    // This migration is idempotent: if old 'id' column doesn't exist, migration was already done.
    if (isPostgres) {
      const oldCol = await this.getOne(
        "SELECT 1 FROM information_schema.columns WHERE table_name = 'oauth2_clients' AND column_name = 'id'"
      );
      if (oldCol) {
        // 1. Drop FK constraints FIRST (before updating data, otherwise FK violation)
        await this.execute('ALTER TABLE oauth2_authorization_codes DROP CONSTRAINT IF EXISTS oauth2_authorization_codes_client_id_fkey');
        await this.execute('ALTER TABLE oauth2_tokens DROP CONSTRAINT IF EXISTS oauth2_tokens_client_id_fkey');
        await this.execute('ALTER TABLE oauth2_consents DROP CONSTRAINT IF EXISTS oauth2_consents_client_id_fkey');
        // 2. Update child table values: client_id = id → client_id = nano_id
        await this.execute(
          `UPDATE oauth2_authorization_codes c SET client_id = p.nano_id FROM oauth2_clients p WHERE c.client_id = p.id AND p.nano_id != p.id`
        );
        await this.execute(
          `UPDATE oauth2_tokens t SET client_id = p.nano_id FROM oauth2_clients p WHERE t.client_id = p.id AND p.nano_id != p.id`
        );
        await this.execute(
          `UPDATE oauth2_consents c SET client_id = p.nano_id FROM oauth2_clients p WHERE c.client_id = p.id AND p.nano_id != p.id`
        );
        // 3. Rename id → client_id, swap PK
        await this.execute('ALTER TABLE oauth2_clients RENAME COLUMN id TO client_id');
        await this.execute('ALTER TABLE oauth2_clients DROP CONSTRAINT oauth2_clients_pkey');
        await this.execute('ALTER TABLE oauth2_clients ADD PRIMARY KEY (nano_id)');
        await this.execute('ALTER TABLE oauth2_clients ADD CONSTRAINT oauth2_clients_client_id_unique UNIQUE (client_id)');
        // 4. Add new FK constraints → nano_id
        await this.execute('ALTER TABLE oauth2_authorization_codes ADD FOREIGN KEY (client_id) REFERENCES oauth2_clients(nano_id) ON DELETE CASCADE');
        await this.execute('ALTER TABLE oauth2_tokens ADD FOREIGN KEY (client_id) REFERENCES oauth2_clients(nano_id) ON DELETE CASCADE');
        await this.execute('ALTER TABLE oauth2_consents ADD FOREIGN KEY (client_id) REFERENCES oauth2_clients(nano_id) ON DELETE CASCADE');
        // 5. Update indexes
        await this.execute('DROP INDEX IF EXISTS idx_oauth2_clients_nano_id');
      }
    } else {
      // MySQL migration
      const oldCol = await this.getOne(
        "SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'oauth2_clients' AND column_name = 'id'"
      );
      if (oldCol) {
        // 1. Drop old FKs FIRST
        await this.execute('ALTER TABLE oauth2_authorization_codes DROP FOREIGN KEY oauth2_authorization_codes_ibfk_1');
        await this.execute('ALTER TABLE oauth2_tokens DROP FOREIGN KEY oauth2_tokens_ibfk_1');
        await this.execute('ALTER TABLE oauth2_consents DROP FOREIGN KEY oauth2_consents_ibfk_2');
        // 2. Add client_id column
        await this.execute('ALTER TABLE oauth2_clients ADD COLUMN client_id VARCHAR(255)');
        // 3. Copy data: client_id = id, and update child tables
        await this.execute('UPDATE oauth2_clients SET client_id = id');
        await this.execute(
          'UPDATE oauth2_authorization_codes c JOIN oauth2_clients p ON c.client_id = p.id SET c.client_id = p.nano_id WHERE p.nano_id != p.id'
        );
        await this.execute(
          'UPDATE oauth2_tokens t JOIN oauth2_clients p ON t.client_id = p.id SET t.client_id = p.nano_id WHERE p.nano_id != p.id'
        );
        await this.execute(
          'UPDATE oauth2_consents c JOIN oauth2_clients p ON c.client_id = p.id SET c.client_id = p.nano_id WHERE p.nano_id != p.id'
        );
        // 4. Make client_id NOT NULL + UNIQUE
        await this.execute('ALTER TABLE oauth2_clients MODIFY client_id VARCHAR(255) NOT NULL');
        await this.execute('ALTER TABLE oauth2_clients ADD CONSTRAINT oauth2_clients_client_id_unique UNIQUE (client_id)');
        // 5. Drop old id column (PK drops automatically)
        await this.execute('ALTER TABLE oauth2_clients DROP COLUMN id');
        // 6. nano_id → PK
        await this.execute('ALTER TABLE oauth2_clients ADD PRIMARY KEY (nano_id)');
        // 7. Add new FKs → nano_id
        await this.execute('ALTER TABLE oauth2_authorization_codes ADD FOREIGN KEY (client_id) REFERENCES oauth2_clients(nano_id) ON DELETE CASCADE');
        await this.execute('ALTER TABLE oauth2_tokens ADD FOREIGN KEY (client_id) REFERENCES oauth2_clients(nano_id) ON DELETE CASCADE');
        await this.execute('ALTER TABLE oauth2_consents ADD FOREIGN KEY (client_id) REFERENCES oauth2_clients(nano_id) ON DELETE CASCADE');
        // 8. Update indexes
        await this.execute('DROP INDEX idx_oauth2_clients_nano_id ON oauth2_clients');
      }
    }

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
      'CREATE INDEX IF NOT EXISTS idx_oauth2_clients_client_id ON oauth2_clients(client_id)',
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
    const entries = Object.entries(config);
    if (entries.length === 0) return;

    const isPostgres = this.config.type === 'postgres';
    const placeholders: string[] = [];
    const params: (string | null)[] = [];

    for (const [key, value] of entries) {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      placeholders.push('(?, ?, NOW())');
      params.push(key, stringValue);
    }

    const onConflict = isPostgres
      ? 'ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()'
      : 'ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = NOW()';

    await this.execute(
      `INSERT INTO global_config (key, value, updated_at) VALUES ${placeholders.join(', ')} ${onConflict}`,
      params
    );
  }
}

export const db = new Database();
