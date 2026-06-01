// Migration: Add PKCE columns (code_challenge, code_challenge_method) to oauth2_authorization_codes
const fs = require('fs');
const path = require('path');

// Manually load .env.local (same pattern as scripts/init.ts)
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

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.POSTGRES_HOST || '127.0.0.1',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'exp',
  user: process.env.POSTGRES_USER || 'exp',
  password: process.env.POSTGRES_PASSWORD || 'exp',
  connectionTimeoutMillis: 5000,
});

async function migrate() {
  console.log('=== PKCE Migration ===');
  console.log('Connecting to PostgreSQL...');

  try {
    const client = await pool.connect();
    console.log('Connected!');
    client.release();
  } catch (e) {
    console.error('Connection failed:', e.message);
    await pool.end();
    process.exit(1);
  }

  // Check if migration is needed
  const hasChallenge = await pool.query(
    "SELECT 1 FROM information_schema.columns WHERE table_name = 'oauth2_authorization_codes' AND column_name = 'code_challenge'"
  );
  if (hasChallenge.rows.length > 0) {
    console.log('Migration already applied (code_challenge column exists).');
    await pool.end();
    return;
  }

  console.log('Adding PKCE columns...');

  // PostgreSQL
  await pool.query('ALTER TABLE oauth2_authorization_codes ADD COLUMN code_challenge TEXT');
  await pool.query('ALTER TABLE oauth2_authorization_codes ADD COLUMN code_challenge_method VARCHAR(10)');

  console.log('PKCE migration complete!');

  // Verify
  const cols = await pool.query(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'oauth2_authorization_codes' ORDER BY ordinal_position"
  );
  console.log('Columns:', cols.rows.map(r => `${r.column_name} (${r.data_type})`));

  await pool.end();
}

migrate().catch(e => { console.error('Migration failed:', e); process.exit(1); });
