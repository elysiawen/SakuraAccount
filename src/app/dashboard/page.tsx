import { requireSession } from '@/lib/require-session';
import { getUserSessions, getUserById } from '@/lib/auth';
import OverviewClient from './overview-client';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await requireSession();
  if (!user) return null;

  const sessions = await getUserSessions(user.id);
  const userDetails = await getUserById(user.id);
  const userCreatedAt = userDetails?.created_at || Date.now();

  return (
    <OverviewClient
      username={user.username}
      nickname={user.nickname}
      email={user.email}
      role={user.role}
      sessionsCount={sessions.length}
      userCreatedAt={userCreatedAt}
      emailVerified={user.emailVerified}
      twoFactorEnabled={user.twoFactorEnabled}
      bannerUrl={process.env.BANNER_BACKGROUND_URL || ''}
    />
  );
}
