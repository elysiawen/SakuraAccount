import { cookies } from 'next/headers';
import { getSession, User } from '@/lib/auth';

export async function requireSession(): Promise<User | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('account_session')?.value;

  if (!sessionId) return null;

  return getSession(sessionId);
}
