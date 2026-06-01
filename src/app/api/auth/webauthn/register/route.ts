import { NextRequest, NextResponse } from 'next/server';
import { generateRegistration, verifyRegistration } from '@/lib/webauthn';
import { requireAuthenticatedUser } from '@/lib/require-session';
import { passkeyInvalidRequest, passkeyInvalidOperation, passkeyOperationFailed } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    const result = await requireAuthenticatedUser();
    if ('error' in result) return result.error;
    const { user } = result;

    const body = await request.json();
    const { action, response, challengeId, credentialName } = body;

    if (action === 'generate') {
      const { options, challengeId } = await generateRegistration(user.id, user.username, user.nickname);
      return NextResponse.json({ options, challengeId });
    }

    if (action === 'verify') {
      if (!response || !challengeId) {
        return passkeyInvalidRequest();
      }

      const verification = await verifyRegistration(user.id, response, challengeId, credentialName);
      return NextResponse.json({ verified: verification.verified });
    }

    return passkeyInvalidOperation();
  } catch (error) {
    console.error('WebAuthn register error:', error);
    return passkeyOperationFailed();
  }
}
