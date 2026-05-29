import { NextRequest, NextResponse } from 'next/server';
import { getSession, updateUser, logAudit } from '@/lib/auth';
import { isValidEmail } from '@/lib/utils';
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

    const body = await request.json();
    const { nickname, email } = body;

    if (email && !isValidEmail(email)) {
      return NextResponse.json({ error: '请输入有效的邮箱地址' }, { status: 400 });
    }

    await updateUser(user.id, { nickname, email });

    await logAudit(user.id, 'profile_updated', { nickname, email }, ip, request.headers.get('user-agent') || 'unknown');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}
