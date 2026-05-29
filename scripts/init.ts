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
      const user = await createUser('admin', 'admin@sakura.local', 'admin123456', 'Administrator');
      await updateUserRole(user.id, 'admin');
      console.log('Default admin user created:');
      console.log('  Username: admin');
      console.log('  Password: admin123456');
      console.log('  Email: admin@sakura.local');
      console.log('');
      console.log('Please change the password after first login!');
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
