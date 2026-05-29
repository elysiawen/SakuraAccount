import { NextRequest, NextResponse } from 'next/server';
import { getSession, getUserById, verifyPassword, updateUserPassword, logAudit } from '@/lib/auth';
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
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: '请填写所有字段' }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: '新密码长度至少8位' }, { status: 400 });
    }

    const userDetails = await getUserById(user.id);
    if (!userDetails?.password_hash) {
      return NextResponse.json({ error: '该账号未设置密码' }, { status: 400 });
    }

    const isValid = await verifyPassword(currentPassword, userDetails.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: '当前密码错误' }, { status: 401 });
    }

    await updateUserPassword(user.id, newPassword);

    await logAudit(user.id, 'password_changed', {}, ip, request.headers.get('user-agent') || 'unknown');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json({ error: '密码修改失败' }, { status: 500 });
  }
}
