import { db } from '@/lib/db';
import AdminOverviewClient from './overview-client';

export const dynamic = 'force-dynamic';

interface CountRow extends Record<string, unknown> {
  count: number | string;
}

export default async function AdminPage() {
  const [userCount, sessionCount, auditLogCount] = await Promise.all([
    db.getOne<CountRow>('SELECT COUNT(*) as count FROM users'),
    db.getOne<CountRow>('SELECT COUNT(*) as count FROM sessions WHERE expires_at > NOW()'),
    db.getOne<CountRow>('SELECT COUNT(*) as count FROM audit_logs'),
  ]);

  return (
    <AdminOverviewClient
      userCount={Number(userCount?.count) || 0}
      sessionCount={Number(sessionCount?.count) || 0}
      auditLogCount={Number(auditLogCount?.count) || 0}
    />
  );
}
