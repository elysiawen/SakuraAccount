import { NextRequest, NextResponse } from 'next/server';
import { createSession, setSessionCookie, getRequestMetadata, logAudit, getUserById } from '@/lib/auth';
import { generateAuthentication, verifyAuthentication } from '@/lib/webauthn';
import { passkeyInvalidRequest, authPasskeyVerifyFailed, authUserNotFound, passkeyInvalidOperation, passkeyOperationFailed } from '@/lib/api-response';

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
        return passkeyInvalidRequest();
      }

      const verification = await verifyAuthentication(response, challenge);

      if (!verification.verified || !verification.userId) {
        return authPasskeyVerifyFailed();
      }

      const user = await getUserById(verification.userId);
      if (!user) {
        return authUserNotFound();
      }

      const { ip, userAgent } = getRequestMetadata(request);
      const sessionId = await createSession(user.id, ip, userAgent);
      await setSessionCookie(sessionId);
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

    return passkeyInvalidOperation();
  } catch (error) {
    console.error('WebAuthn login error:', error);
    return passkeyOperationFailed();
  }
}
