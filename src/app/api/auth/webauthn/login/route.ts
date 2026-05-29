import { NextRequest, NextResponse } from 'next/server';
import { createSession, logAudit, getUserById } from '@/lib/auth';
import { generateAuthentication, verifyAuthentication } from '@/lib/webauthn';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, response, challenge, userId } = body;

    if (action === 'generate') {
      const options = await generateAuthentication(userId);
      return NextResponse.json({ options });
    }

    if (action === 'verify') {
      if (!response || !challenge) {
        return NextResponse.json({ error: '无效的请求' }, { status: 400 });
      }

      const verification = await verifyAuthentication(response, challenge);

      if (!verification.verified || !verification.userId) {
        return NextResponse.json({ error: '认证失败' }, { status: 401 });
      }

      const user = await getUserById(verification.userId);
      if (!user) {
        return NextResponse.json({ error: '用户不存在' }, { status: 404 });
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
      await logAudit(user.id, 'login_success', { method: 'webauthn' }, ip, userAgent);

      return NextResponse.json({
        verified: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          nickname: user.nickname,
          role: user.role,
        },
      });
    }

    return NextResponse.json({ error: '无效的操作' }, { status: 400 });
  } catch (error) {
    console.error('WebAuthn login error:', error);
    return NextResponse.json({ error: '操作失败' }, { status: 500 });
  }
}
