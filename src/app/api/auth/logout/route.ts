import { NextRequest, NextResponse } from 'next/server';
import { deleteSession, getRequestMetadata, logAudit } from '@/lib/auth';
import { cookies } from 'next/headers';
import { internalError } from '@/lib/api-response';
import { tApi } from '@/i18n/api-i18n';
import { SESSION_COOKIE_NAME } from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (sessionId) {
      const { ip, userAgent } = getRequestMetadata(request);
      await deleteSession(sessionId);
      await logAudit(null, 'logout', { sessionId }, ip, userAgent, 'access');
    }

    cookieStore.delete(SESSION_COOKIE_NAME);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return internalError(await tApi('auth.logoutFailed'));
  }
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (sessionId) {
      await deleteSession(sessionId);
    }

    cookieStore.delete(SESSION_COOKIE_NAME);

    const rawCallback = request.nextUrl.searchParams.get('callbackUrl') || '/';
    // Only allow safe relative paths: starts with /, no protocol scheme, no double-slash prefix
    const callbackUrl = rawCallback.startsWith('/') && !rawCallback.startsWith('//') && !rawCallback.includes('://')
      ? rawCallback
      : '/';
    return NextResponse.redirect(new URL(callbackUrl, request.url));
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.redirect(new URL('/', request.url));
  }
}
