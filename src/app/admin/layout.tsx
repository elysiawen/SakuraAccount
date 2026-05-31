import { requireSession } from '@/lib/require-session';
import AdminShell from './shell';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSession();

  if (!user || user.role !== 'admin') {
    return <AdminShell sessionInvalid>{children}</AdminShell>;
  }

  return (
    <AdminShell username={user.username} nickname={user.nickname} avatar={user.avatar}>
      {children}
    </AdminShell>
  );
}
