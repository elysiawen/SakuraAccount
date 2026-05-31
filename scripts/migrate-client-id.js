const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.POSTGRES_HOST || '127.0.0.1',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'aot',
  user: process.env.POSTGRES_USER || 'aot',
  password: process.env.POSTGRES_PASSWORD || '123456wen',
  connectionTimeoutMillis: 5000,
});

async function migrate() {
  console.log('Connecting to database...');
  try {
    const client = await pool.connect();
    console.log('Connected!');
    client.release();
  } catch (e) {
    console.error('Connection failed:', e.message);
    await pool.end();
    process.exit(1);
  }

  console.log('Starting migration...');

  // Check if migration is needed
  const oldCol = await pool.query(
    "SELECT 1 FROM information_schema.columns WHERE table_name = 'oauth2_clients' AND column_name = 'id'"
  );
  if (!oldCol.rows.length) {
    console.log('Migration already done (no id column found)');
    await pool.end();
    return;
  }

  console.log('Old schema detected, migrating...');

  // Step 1: Drop FK constraints FIRST
  console.log('Step 1: Dropping old FKs...');
  await pool.query('ALTER TABLE oauth2_authorization_codes DROP CONSTRAINT IF EXISTS oauth2_authorization_codes_client_id_fkey');
  await pool.query('ALTER TABLE oauth2_tokens DROP CONSTRAINT IF EXISTS oauth2_tokens_client_id_fkey');
  await pool.query('ALTER TABLE oauth2_consents DROP CONSTRAINT IF EXISTS oauth2_consents_client_id_fkey');

  // Step 2: Update child table values
  console.log('Step 2: Updating child table values...');
  const r1 = await pool.query('UPDATE oauth2_authorization_codes c SET client_id = p.nano_id FROM oauth2_clients p WHERE c.client_id = p.id AND p.nano_id != p.id');
  console.log('  auth codes updated:', r1.rowCount);
  const r2 = await pool.query('UPDATE oauth2_tokens t SET client_id = p.nano_id FROM oauth2_clients p WHERE t.client_id = p.id AND p.nano_id != p.id');
  console.log('  tokens updated:', r2.rowCount);
  const r3 = await pool.query('UPDATE oauth2_consents c SET client_id = p.nano_id FROM oauth2_clients p WHERE c.client_id = p.id AND p.nano_id != p.id');
  console.log('  consents updated:', r3.rowCount);

  // Step 3: Rename id -> client_id
  console.log('Step 3: Renaming id to client_id...');
  await pool.query('ALTER TABLE oauth2_clients RENAME COLUMN id TO client_id');

  // Step 4: Swap PK
  console.log('Step 4: Swapping PK...');
  await pool.query('ALTER TABLE oauth2_clients DROP CONSTRAINT oauth2_clients_pkey');
  await pool.query('ALTER TABLE oauth2_clients ADD PRIMARY KEY (nano_id)');
  await pool.query('ALTER TABLE oauth2_clients ADD CONSTRAINT oauth2_clients_client_id_unique UNIQUE (client_id)');

  // Step 5: Add new FKs
  console.log('Step 5: Adding new FKs...');
  await pool.query('ALTER TABLE oauth2_authorization_codes ADD FOREIGN KEY (client_id) REFERENCES oauth2_clients(nano_id) ON DELETE CASCADE');
  await pool.query('ALTER TABLE oauth2_tokens ADD FOREIGN KEY (client_id) REFERENCES oauth2_clients(nano_id) ON DELETE CASCADE');
  await pool.query('ALTER TABLE oauth2_consents ADD FOREIGN KEY (client_id) REFERENCES oauth2_clients(nano_id) ON DELETE CASCADE');

  // Step 6: Cleanup
  console.log('Step 6: Cleanup indexes...');
  await pool.query('DROP INDEX IF EXISTS idx_oauth2_clients_nano_id');

  console.log('Migration complete!');

  // Verify
  const cols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'oauth2_clients' ORDER BY ordinal_position");
  console.log('Columns:', cols.rows.map(r => r.column_name));

  const pk = await pool.query("SELECT a.attname FROM pg_index i JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey) WHERE i.indrelid = 'oauth2_clients'::regclass AND i.indisprimary");
  console.log('PK:', pk.rows.map(r => r.attname));

  await pool.end();
}

migrate().catch(e => { console.error('Migration failed:', e); process.exit(1); });
