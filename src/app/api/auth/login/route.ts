import { NextRequest, NextResponse } from 'next/server';
import { getUserByUsername, getUserByEmail, verifyPassword, createSession, setSessionCookie, getRequestMetadata, logAudit } from '@/lib/auth';
import { paramInvalid, authLoginFailed, internalError } from '@/lib/api-response';
import { tApi } from '@/i18n/api-i18n';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return paramInvalid(await tApi('auth.loginRequired'));
    }

    let user = await getUserByUsername(username);
    if (!user) {
      user = await getUserByEmail(username);
    }

    if (!user || !user.password_hash) {
      return authLoginFailed();
    }

    const { ip, userAgent } = getRequestMetadata(request);

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      await logAudit(user.id, 'login_failed', { reason: 'invalid_password' }, ip, userAgent, 'access');
      return authLoginFailed();
    }

    const sessionId = await createSession(user.id, ip, userAgent);
    await setSessionCookie(sessionId);
    await logAudit(user.id, 'login_success', { method: 'password' }, ip, userAgent, 'access');

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
    return internalError();
  }
}
