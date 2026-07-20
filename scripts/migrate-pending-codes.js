// Migration: Add pending_codes table for email verification codes during registration
const fs = require('fs');
const path = require('path');

// Manually load .env.local
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

const isPostgres = (process.env.DB_TYPE || 'postgres') === 'postgres';
let pool;

if (isPostgres) {
  const { Pool } = require('pg');
  pool = new Pool({
    host: process.env.POSTGRES_HOST || '127.0.0.1',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'aot',
    user: process.env.POSTGRES_USER || 'aot',
    password: process.env.POSTGRES_PASSWORD || '',
    connectionTimeoutMillis: 5000,
  });
} else {
  const mysql = require('mysql2/promise');
  pool = mysql.createPool({
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    database: process.env.MYSQL_DATABASE || 'aot',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    connectionTimeoutMillis: 5000,
  });
}

async function migrate() {
  console.log('=== Pending Codes Migration ===');
  console.log(`Connecting to ${isPostgres ? 'PostgreSQL' : 'MySQL'}...`);

  try {
    if (isPostgres) {
      const client = await pool.connect();
      console.log('Connected!');
      client.release();
    } else {
      const conn = await pool.getConnection();
      console.log('Connected!');
      conn.release();
    }
  } catch (e) {
    console.error('Connection failed:', e.message);
    await pool.end();
    process.exit(1);
  }

  // Check if migration is needed
  const checkSql = isPostgres
    ? "SELECT 1 FROM information_schema.tables WHERE table_name = 'pending_codes'"
    : "SELECT 1 FROM information_schema.tables WHERE table_name = 'pending_codes' AND table_schema = DATABASE()";
  
  const check = isPostgres
    ? await pool.query(checkSql)
    : await pool.execute(checkSql);

  const alreadyExists = isPostgres ? check.rows.length > 0 : check[0].length > 0;

  if (alreadyExists) {
    console.log('Migration already applied (pending_codes table exists).');
    await pool.end();
    return;
  }

  console.log('Creating pending_codes table...');

  if (isPostgres) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pending_codes (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        code VARCHAR(6) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } else {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS pending_codes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        code VARCHAR(6) NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  console.log('Migration complete!');

  // Verify
  const verifySql = isPostgres
    ? "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'pending_codes' ORDER BY ordinal_position"
    : "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'pending_codes' AND table_schema = DATABASE() ORDER BY ordinal_position";
  
  const verify = isPostgres
    ? await pool.query(verifySql)
    : await pool.execute(verifySql);
  
  const rows = isPostgres ? verify.rows : verify[0];
  console.log('Columns:', rows.map(r => `${r.column_name} (${r.data_type})`));

  await pool.end();
}

migrate().catch(e => { console.error('Migration failed:', e); process.exit(1); });
