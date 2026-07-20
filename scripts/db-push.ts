/**
 * 部署后运行：npx tsx scripts/db-push.ts
 * 创建新增的表（已有表不受影响）
 */
import { db } from '../src/lib/db';

async function main() {
  console.log('Running DB migrations...');

  // pending_codes — 注册验证码
  await db.execute(`
    CREATE TABLE IF NOT EXISTS pending_codes (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      code VARCHAR(6) NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('Done. All migrations applied.');
  process.exit(0);
}

main().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});
