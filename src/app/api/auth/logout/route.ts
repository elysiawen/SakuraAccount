import { NextRequest, NextResponse } from 'next/server';
import { deleteSession, getRequestMetadata, logAudit } from '@/lib/auth';
import { cookies } from 'next/headers';
import { internalError } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('account_session')?.value;

    if (sessionId) {
      const { ip, userAgent } = getRequestMetadata(request);
      await deleteSession(sessionId);
      await logAudit(null, 'logout', { sessionId }, ip, userAgent, 'access');
    }

    cookieStore.delete('account_session');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return internalError('登出失败');
  }
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('account_session')?.value;

    if (sessionId) {
      await deleteSession(sessionId);
    }

    cookieStore.delete('account_session');

    const rawCallback = request.nextUrl.searchParams.get('callbackUrl') || '/';
    const callbackUrl = rawCallback.startsWith('/') && !rawCallback.startsWith('//')
      ? rawCallback
      : '/';
    return NextResponse.redirect(new URL(callbackUrl, request.url));
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.redirect(new URL('/', request.url));
  }
}
