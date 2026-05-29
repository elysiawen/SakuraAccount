import * as fs from 'fs';
import * as path from 'path';

// Load .env.local BEFORE any other imports that depend on env vars
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

async function init() {
  // Dynamic imports so env vars are loaded before module evaluation
  const { db } = await import('../src/lib/db');
  const { createUser, getUserByUsername, updateUserRole } = await import('../src/lib/auth');

  console.log('Initializing Sakura Account database...');
  console.log('Database host:', process.env.POSTGRES_HOST);

  try {
    // Initialize database tables
    await db.initialize();
    console.log('Database tables created successfully.');

    // Check if admin user exists
    const adminUser = await getUserByUsername('admin');

    if (!adminUser) {
      // Create default admin user
      const { randomBytes } = await import('crypto');
      const adminPassword = process.env.ADMIN_PASSWORD || randomBytes(24).toString('base64url');
      const user = await createUser('admin', 'admin@sakura.local', adminPassword, 'Administrator');
      await updateUserRole(user.id, 'admin');
      console.log('Default admin user created:');
      console.log('  Username: admin');
      if (!process.env.ADMIN_PASSWORD) {
        console.log(`  Password: ${adminPassword}`);
        console.log('  *** SAVE THIS PASSWORD - it will NOT be shown again! ***');
      } else {
        console.log('  Password: (from ADMIN_PASSWORD env var)');
      }
      console.log('  Email: admin@sakura.local');
    } else {
      console.log('Admin user already exists.');
    }

    console.log('');
    console.log('Initialization completed successfully!');
    console.log('You can now start the application with: npm run dev');
  } catch (error) {
    console.error('Initialization failed:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

init();
