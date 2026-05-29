import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getClient, generateAuthorizationCode } from '@/lib/oauth2';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const params = new URLSearchParams(body);

    const clientId = params.get('client_id');
    const redirectUri = params.get('redirect_uri');
    const scope = params.get('scope');
    const state = params.get('state');
    const nonce = params.get('nonce');
    const approved = params.get('approved') === 'true';

    if (!clientId || !redirectUri) {
      return NextResponse.json({ error: 'missing_parameters' }, { status: 400 });
    }

    // User denied
    if (!approved) {
      const errorUrl = new URL(redirectUri);
      errorUrl.searchParams.set('error', 'access_denied');
      if (state) errorUrl.searchParams.set('state', state);
      return NextResponse.json({ redirect: errorUrl.toString() });
    }

    // Verify user session
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('account_session')?.value;

    if (!sessionId) {
      return NextResponse.json({ error: 'login_required' }, { status: 401 });
    }

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
    const user = await getSession(sessionId, ip);

    if (!user) {
      return NextResponse.json({ error: 'login_required' }, { status: 401 });
    }

    // Validate client
    const client = await getClient(clientId);
    if (!client) {
      return NextResponse.json({ error: 'invalid_client' }, { status: 400 });
    }

    if (client.status === 'disabled') {
      return NextResponse.json({ error: 'client_disabled' }, { status: 400 });
    }

    if (!client.redirectUris.includes(redirectUri)) {
      return NextResponse.json({ error: 'invalid_redirect_uri' }, { status: 400 });
    }

    // Generate authorization code
    const scopes = scope ? scope.split(' ') : ['openid', 'profile'];
    const code = await generateAuthorizationCode(clientId, user.id, redirectUri, scopes, nonce || undefined);

    // Build redirect URL
    const callbackUrl = new URL(redirectUri);
    callbackUrl.searchParams.set('code', code);
    if (state) callbackUrl.searchParams.set('state', state);

    return NextResponse.json({ redirect: callbackUrl.toString() });
  } catch (error) {
    console.error('Consent error:', error);
    return NextResponse.json({ error: 'consent_failed' }, { status: 500 });
  }
}
