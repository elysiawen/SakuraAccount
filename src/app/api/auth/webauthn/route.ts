import { NextRequest, NextResponse } from 'next/server';
import { getUserCredentials, removeCredential } from '@/lib/webauthn';
import { requireAuthenticatedUser } from '@/lib/require-session';
import { passkeyListFailed, passkeyIdRequired, authPasskeyNotFound, passkeyDeleteFailed } from '@/lib/api-response';

export async function GET() {
  try {
    const result = await requireAuthenticatedUser();
    if ('error' in result) return result.error;

    const credentials = await getUserCredentials(result.user.id);
    return NextResponse.json({ credentials });
  } catch (error) {
    console.error('WebAuthn credentials error:', error);
    return passkeyListFailed();
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const result = await requireAuthenticatedUser();
    if ('error' in result) return result.error;

    const { searchParams } = new URL(request.url);
    const credentialId = searchParams.get('id');

    if (!credentialId) {
      return passkeyIdRequired();
    }

    const removed = await removeCredential(credentialId, result.user.id);

    if (!removed) {
      return authPasskeyNotFound();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete WebAuthn credential error:', error);
    return passkeyDeleteFailed();
  }
}
