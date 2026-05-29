import { requireSession } from '@/lib/require-session';
import DashboardLayoutClient from './layout-client';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSession();

  return (
    <DashboardLayoutClient
      username={user?.username}
      role={user?.role}
      nickname={user?.nickname}
      avatar={user?.avatar}
      sessionInvalid={!user}
    >
      {children}
    </DashboardLayoutClient>
  );
}
