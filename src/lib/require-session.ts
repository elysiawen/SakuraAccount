import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getSession, getRequestMetadata, User } from '@/lib/auth';
import { authNotLoggedIn, authTokenExpired, adminPermissionDenied } from '@/lib/api-response';
import { SESSION_COOKIE_NAME } from '@/lib/constants';

export async function requireSession(request?: Request): Promise<User | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionId) return null;

  const ip = request ? getRequestMetadata(request).ip : undefined;
  return getSession(sessionId, ip);
}

export async function requireAuthenticatedUser(request?: Request): Promise<
  | { user: User; sessionId: string }
  | { error: NextResponse }
> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionId) {
    return { error: await authNotLoggedIn() };
  }

  const ip = request ? getRequestMetadata(request).ip : undefined;
  const user = await getSession(sessionId, ip);

  if (!user) {
    return { error: await authTokenExpired() };
  }

  return { user, sessionId };
}

export async function requireAdmin(): Promise<
  | { user: User; sessionId: string }
  | { error: NextResponse }
> {
  const result = await requireAuthenticatedUser();

  if ('error' in result) return result;

  if (result.user.role !== 'admin') {
    return { error: await adminPermissionDenied() };
  }

  return result;
}

export async function requireDeveloperOrAdmin(): Promise<
  | { user: User; sessionId: string }
  | { error: NextResponse }
> {
  const result = await requireAuthenticatedUser();

  if ('error' in result) return result;

  if (!['admin', 'developer'].includes(result.user.role)) {
    return { error: await adminPermissionDenied() };
  }

  return result;
}
