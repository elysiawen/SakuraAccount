import { Pool as PgPool } from 'pg';
import mysql from 'mysql2/promise';

type DbType = 'postgres' | 'mysql';

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
  private initPromise: Promise<void> | null = null;
  private initializing = false;

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

  async query(sql: string, params?: any[]): Promise<any[]> {
    await this.ensureInitialized();
    if (this.config.type === 'postgres') {
      const pool = this.getPgPool();
      const pgSql = this.convertPlaceholders(sql);
      const result = await pool.query(pgSql, params);
      return result.rows;
    } else {
      const pool = this.getMysqlPool();
      const [rows] = await pool.execute(sql, params);
      return rows as any[];
    }
  }

  async getOne(sql: string, params?: any[]): Promise<any | null> {
    const rows = await this.query(sql, params);
    return rows[0] || null;
  }

  async execute(sql: string, params?: any[]): Promise<any> {
    await this.ensureInitialized();
    if (this.config.type === 'postgres') {
      const pool = this.getPgPool();
      const pgSql = this.convertPlaceholders(sql);
      return await pool.query(pgSql, params);
    } else {
      const pool = this.getMysqlPool();
      return await pool.execute(sql, params);
    }
  }

  async initialize(): Promise<void> {
    await this.createTables();
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initializing) return;
    if (!this.initPromise) {
      this.initializing = true;
      this.initPromise = this.createTables().catch(e => {
        console.error('Database initialization failed:', e);
        this.initPromise = null;
      }).finally(() => {
        this.initializing = false;
      });
    }
    return this.initPromise;
  }

  private async createTables(): Promise<void> {
    const isPostgres = this.config.type === 'postgres';
    const jsonType = isPostgres ? 'JSONB' : 'JSON';
    const timestampType = isPostgres ? 'TIMESTAMP' : 'DATETIME';
    const textType = isPostgres ? 'TEXT' : 'TEXT';
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
        created_at ${timestampType} DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

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
    } catch (e: any) {
      // Column already exists is fine (PostgreSQL: 42701, MySQL: 1060)
      if (e?.code !== '42701' && e?.errno !== 1060) {
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
          await this.execute('UPDATE oauth2_clients SET nano_id = ? WHERE id = ?', [nanoid(32), row.id]);
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
    } catch (e: any) {
      if (e?.code !== '42701' && e?.errno !== 1060) {
        console.error('Failed to add nonce column:', e);
      }
    }

    // OAuth2 tokens table
    await this.execute(`
      CREATE TABLE IF NOT EXISTS oauth2_tokens (
        id ${varcharType(255)} PRIMARY KEY,
        client_id ${varcharType(255)} NOT NULL,
        user_id ${varcharType(36)} NOT NULL,
        access_token ${textType} UNIQUE NOT NULL,
        refresh_token ${textType},
        scopes ${jsonType} NOT NULL,
        expires_at ${timestampType} NOT NULL,
        created_at ${timestampType} DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES oauth2_clients(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Audit logs table
    await this.execute(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id ${varcharType(36)},
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
}

export const db = new Database();
