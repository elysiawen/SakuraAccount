import * as fs from 'fs';
import * as path from 'path';

// Load .env.local manually
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
}

import { Pool } from 'pg';
import { uuidv7 } from 'uuidv7';

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'sakura_account',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || '',
});

async function migrate() {
  console.log('Starting UUID migration...');

  try {
    // Check if users table exists and has integer id
    const tableInfo = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'id'
    `);

    if (tableInfo.rows.length === 0) {
      console.log('Users table does not exist. Run db:init first.');
      return;
    }

    const idType = tableInfo.rows[0].data_type;
    console.log('Current users.id type:', idType);

    if (idType === 'character varying') {
      console.log('Users table already uses UUID. No migration needed.');
      return;
    }

    // Step 1: Add UUID columns to all tables
    console.log('Adding UUID columns...');

    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS uuid VARCHAR(36)');
    await pool.query('ALTER TABLE sessions ADD COLUMN IF NOT EXISTS user_uuid VARCHAR(36)');
    await pool.query('ALTER TABLE webauthn_credentials ADD COLUMN IF NOT EXISTS user_uuid VARCHAR(36)');
    await pool.query('ALTER TABLE oauth2_clients ADD COLUMN IF NOT EXISTS user_uuid VARCHAR(36)');
    await pool.query('ALTER TABLE oauth2_authorization_codes ADD COLUMN IF NOT EXISTS user_uuid VARCHAR(36)');
    await pool.query('ALTER TABLE oauth2_tokens ADD COLUMN IF NOT EXISTS user_uuid VARCHAR(36)');
    await pool.query('ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_uuid VARCHAR(36)');
    await pool.query('ALTER TABLE email_verifications ADD COLUMN IF NOT EXISTS user_uuid VARCHAR(36)');
    await pool.query('ALTER TABLE password_resets ADD COLUMN IF NOT EXISTS user_uuid VARCHAR(36)');

    // Step 2: Generate UUIDs for existing users
    console.log('Generating UUIDs for existing users...');
    const users = await pool.query('SELECT id FROM users');
    for (const user of users.rows) {
      const uuid = uuidv7();
      await pool.query('UPDATE users SET uuid = $1 WHERE id = $2', [uuid, user.id]);
    }

    // Step 3: Update foreign keys
    console.log('Updating foreign keys...');
    await pool.query(`
      UPDATE sessions SET user_uuid = (SELECT uuid FROM users WHERE users.id = sessions.user_id)
    `);
    await pool.query(`
      UPDATE webauthn_credentials SET user_uuid = (SELECT uuid FROM users WHERE users.id = webauthn_credentials.user_id)
    `);
    await pool.query(`
      UPDATE oauth2_clients SET user_uuid = (SELECT uuid FROM users WHERE users.id = oauth2_clients.user_id)
    `);
    await pool.query(`
      UPDATE oauth2_authorization_codes SET user_uuid = (SELECT uuid FROM users WHERE users.id = oauth2_authorization_codes.user_id)
    `);
    await pool.query(`
      UPDATE oauth2_tokens SET user_uuid = (SELECT uuid FROM users WHERE users.id = oauth2_tokens.user_id)
    `);
    await pool.query(`
      UPDATE audit_logs SET user_uuid = (SELECT uuid FROM users WHERE users.id = audit_logs.user_id)
    `);
    await pool.query(`
      UPDATE email_verifications SET user_uuid = (SELECT uuid FROM users WHERE users.id = email_verifications.user_id)
    `);
    await pool.query(`
      UPDATE password_resets SET user_uuid = (SELECT uuid FROM users WHERE users.id = password_resets.user_id)
    `);

    // Step 4: Drop old columns and rename new ones
    console.log('Replacing columns...');

    // Drop foreign key constraints first
    const constraints = await pool.query(`
      SELECT constraint_name, table_name
      FROM information_schema.table_constraints
      WHERE constraint_type = 'FOREIGN KEY'
      AND table_name IN ('sessions', 'webauthn_credentials', 'oauth2_clients', 'oauth2_authorization_codes', 'oauth2_tokens', 'audit_logs', 'email_verifications', 'password_resets')
    `);

    for (const constraint of constraints.rows) {
      await pool.query(`ALTER TABLE ${constraint.table_name} DROP CONSTRAINT IF EXISTS ${constraint.constraint_name}`);
    }

    // Drop old columns
    await pool.query('ALTER TABLE sessions DROP COLUMN IF EXISTS user_id');
    await pool.query('ALTER TABLE webauthn_credentials DROP COLUMN IF EXISTS user_id');
    await pool.query('ALTER TABLE oauth2_clients DROP COLUMN IF EXISTS user_id');
    await pool.query('ALTER TABLE oauth2_authorization_codes DROP COLUMN IF EXISTS user_id');
    await pool.query('ALTER TABLE oauth2_tokens DROP COLUMN IF EXISTS user_id');
    await pool.query('ALTER TABLE audit_logs DROP COLUMN IF EXISTS user_id');
    await pool.query('ALTER TABLE email_verifications DROP COLUMN IF EXISTS user_id');
    await pool.query('ALTER TABLE password_resets DROP COLUMN IF EXISTS user_id');

    // Rename UUID columns
    await pool.query('ALTER TABLE sessions RENAME COLUMN user_uuid TO user_id');
    await pool.query('ALTER TABLE webauthn_credentials RENAME COLUMN user_uuid TO user_id');
    await pool.query('ALTER TABLE oauth2_clients RENAME COLUMN user_uuid TO user_id');
    await pool.query('ALTER TABLE oauth2_authorization_codes RENAME COLUMN user_uuid TO user_id');
    await pool.query('ALTER TABLE oauth2_tokens RENAME COLUMN user_uuid TO user_id');
    await pool.query('ALTER TABLE audit_logs RENAME COLUMN user_uuid TO user_id');
    await pool.query('ALTER TABLE email_verifications RENAME COLUMN user_uuid TO user_id');
    await pool.query('ALTER TABLE password_resets RENAME COLUMN user_uuid TO user_id');

    // Rename users.uuid to users.id
    await pool.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_pkey');
    await pool.query('ALTER TABLE users DROP COLUMN IF EXISTS id');
    await pool.query('ALTER TABLE users RENAME COLUMN uuid TO id');
    await pool.query('ALTER TABLE users ADD PRIMARY KEY (id)');

    // Step 5: Add foreign key constraints
    console.log('Adding foreign key constraints...');
    await pool.query('ALTER TABLE sessions ADD CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE');
    await pool.query('ALTER TABLE webauthn_credentials ADD CONSTRAINT fk_webauthn_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE');
    await pool.query('ALTER TABLE oauth2_clients ADD CONSTRAINT fk_oauth2_clients_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL');
    await pool.query('ALTER TABLE oauth2_authorization_codes ADD CONSTRAINT fk_oauth2_codes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE');
    await pool.query('ALTER TABLE oauth2_tokens ADD CONSTRAINT fk_oauth2_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE');
    await pool.query('ALTER TABLE audit_logs ADD CONSTRAINT fk_audit_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL');
    await pool.query('ALTER TABLE email_verifications ADD CONSTRAINT fk_email_verify_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE');
    await pool.query('ALTER TABLE password_resets ADD CONSTRAINT fk_password_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE');

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
