import { db } from '@/lib/db';
import AdminOverviewClient from './overview-client';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const [userCount, sessionCount, auditLogCount] = await Promise.all([
    db.getOne('SELECT COUNT(*) as count FROM users'),
    db.getOne('SELECT COUNT(*) as count FROM sessions WHERE expires_at > NOW()'),
    db.getOne('SELECT COUNT(*) as count FROM audit_logs'),
  ]);

  return (
    <AdminOverviewClient
      userCount={userCount?.count || 0}
      sessionCount={sessionCount?.count || 0}
      auditLogCount={auditLogCount?.count || 0}
    />
  );
}
