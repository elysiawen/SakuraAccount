import { NextRequest, NextResponse } from 'next/server';
import { getUserByUsername, getUserByEmail, verifyPassword, createSession, logAudit } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: '请输入用户名和密码' }, { status: 400 });
    }

    // Try to find user by username or email
    let user = await getUserByUsername(username);
    if (!user) {
      user = await getUserByEmail(username);
    }

    if (!user) {
      return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 });
    }

    if (!user.password_hash) {
      return NextResponse.json({ error: '该账号未设置密码，请使用其他方式登录' }, { status: 400 });
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      await logAudit(user.id, 'login_failed', { reason: 'invalid_password' }, request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown', request.headers.get('user-agent') || 'unknown');
      return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 });
    }

    // Create session
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const sessionId = await createSession(user.id, ip, userAgent);

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set('account_session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: parseInt(process.env.SESSION_EXPIRY || '604800'),
      path: '/',
    });

    // Log audit
    await logAudit(user.id, 'login_success', { method: 'password' }, ip, userAgent);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        nickname: user.nickname,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: '登录失败，请稍后重试' }, { status: 500 });
  }
}
