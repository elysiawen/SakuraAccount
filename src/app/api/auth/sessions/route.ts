import { NextRequest, NextResponse } from 'next/server';
import { getSession, getUserSessions, deleteSession, deleteUserSessions, logAudit } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('account_session')?.value;

    if (!sessionId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
    const user = await getSession(sessionId, ip);

    if (!user) {
      return NextResponse.json({ error: '会话已过期' }, { status: 401 });
    }

    const sessions = await getUserSessions(user.id);

    return NextResponse.json({ sessions, currentSessionId: sessionId });
  } catch (error) {
    console.error('Sessions error:', error);
    return NextResponse.json({ error: '获取会话列表失败' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('account_session')?.value;

    if (!sessionId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
    const user = await getSession(sessionId, ip);

    if (!user) {
      return NextResponse.json({ error: '会话已过期' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const targetSessionId = searchParams.get('id');
    const revokeAll = searchParams.get('all') === 'true';

    if (revokeAll) {
      await deleteUserSessions(user.id);
      // Re-create current session
      const newSessionId = await import('@/lib/auth').then(m => m.createSession(user.id, ip, request.headers.get('user-agent') || 'unknown'));
      cookieStore.set('account_session', newSessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: parseInt(process.env.SESSION_EXPIRY || '604800'),
        path: '/',
      });

      await logAudit(user.id, 'sessions_revoked_all', {}, ip, request.headers.get('user-agent') || 'unknown');

      return NextResponse.json({ success: true });
    }

    if (targetSessionId) {
      if (targetSessionId === sessionId) {
        return NextResponse.json({ error: '不能撤销当前会话' }, { status: 400 });
      }

      await deleteSession(targetSessionId);
      await logAudit(user.id, 'session_revoked', { sessionId: targetSessionId }, ip, request.headers.get('user-agent') || 'unknown');

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: '请指定会话ID' }, { status: 400 });
  } catch (error) {
    console.error('Delete session error:', error);
    return NextResponse.json({ error: '撤销会话失败' }, { status: 500 });
  }
}
