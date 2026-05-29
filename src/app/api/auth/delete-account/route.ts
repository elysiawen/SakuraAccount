import { NextRequest, NextResponse } from 'next/server';
import { getSession, deleteUser, logAudit } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
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

    // Log before deleting
    await logAudit(user.id, 'account_deleted', {}, ip, request.headers.get('user-agent') || 'unknown');

    // Delete user (cascading deletes will handle sessions, credentials, etc.)
    await deleteUser(user.id);

    // Clear cookie
    cookieStore.delete('account_session');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete account error:', error);
    return NextResponse.json({ error: '删除账号失败' }, { status: 500 });
  }
}
