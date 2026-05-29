import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserByUsername, getUserByEmail, createSession, logAudit } from '@/lib/auth';
import { isValidEmail, isValidUsername } from '@/lib/utils';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, email, password, nickname } = body;

    // Validation
    if (!username || !email || !password) {
      return NextResponse.json({ error: '请填写所有必填字段' }, { status: 400 });
    }

    if (!isValidUsername(username)) {
      return NextResponse.json({ error: '用户名只能包含字母、数字、下划线和连字符，长度3-50' }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: '请输入有效的邮箱地址' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: '密码长度至少8位' }, { status: 400 });
    }

    // Check if user exists
    const existingUser = await getUserByUsername(username);
    if (existingUser) {
      return NextResponse.json({ error: '用户名已存在' }, { status: 409 });
    }

    const existingEmail = await getUserByEmail(email);
    if (existingEmail) {
      return NextResponse.json({ error: '邮箱已被注册' }, { status: 409 });
    }

    // Create user
    const user = await createUser(username, email, password, nickname);

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
    await logAudit(user.id, 'register', { username, email }, ip, userAgent);

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
    console.error('Register error:', error);
    return NextResponse.json({ error: '注册失败，请稍后重试' }, { status: 500 });
  }
}
