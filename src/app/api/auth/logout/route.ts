import { NextRequest, NextResponse } from 'next/server';
import { deleteSession, logAudit } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('account_session')?.value;

    if (sessionId) {
      await deleteSession(sessionId);
      await logAudit(null, 'logout', { sessionId }, request.headers.get('x-forwarded-for') || 'unknown', request.headers.get('user-agent') || 'unknown');
    }

    cookieStore.delete('account_session');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: '登出失败' }, { status: 500 });
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

    const callbackUrl = request.nextUrl.searchParams.get('callbackUrl') || '/';
    return NextResponse.redirect(new URL(callbackUrl, request.url));
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.redirect(new URL('/', request.url));
  }
}
