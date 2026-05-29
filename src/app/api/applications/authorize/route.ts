import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getClient } from '@/lib/oauth2';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('client_id');
    const redirectUri = searchParams.get('redirect_uri');
    const responseType = searchParams.get('response_type');
    const scope = searchParams.get('scope');
    const state = searchParams.get('state');
    const nonce = searchParams.get('nonce');
    const prompt = searchParams.get('prompt');

    // Validate required parameters
    if (!clientId || !redirectUri || !responseType) {
      return NextResponse.json({ error: 'missing_required_parameters' }, { status: 400 });
    }

    if (responseType !== 'code') {
      return NextResponse.json({ error: 'unsupported_response_type' }, { status: 400 });
    }

    // Validate client
    const client = await getClient(clientId);
    if (!client) {
      return NextResponse.json({ error: 'invalid_client_id' }, { status: 400 });
    }

    if (client.status === 'disabled') {
      return NextResponse.json({ error: 'client_disabled' }, { status: 400 });
    }

    // Validate redirect URI
    if (!client.redirectUris.includes(redirectUri)) {
      return NextResponse.json({ error: 'invalid_redirect_uri' }, { status: 400 });
    }

    // Check if user is authenticated
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('account_session')?.value;

    // prompt=none: must have valid session, no interaction allowed
    if (prompt === 'none') {
      if (!sessionId) {
        const errorUrl = new URL(redirectUri);
        errorUrl.searchParams.set('error', 'login_required');
        if (state) errorUrl.searchParams.set('state', state);
        return NextResponse.redirect(errorUrl);
      }

      const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
      const user = await getSession(sessionId, ip);

      if (!user) {
        const errorUrl = new URL(redirectUri);
        errorUrl.searchParams.set('error', 'login_required');
        if (state) errorUrl.searchParams.set('state', state);
        return NextResponse.redirect(errorUrl);
      }

      const errorUrl = new URL(redirectUri);
      errorUrl.searchParams.set('error', 'consent_required');
      if (state) errorUrl.searchParams.set('state', state);
      return NextResponse.redirect(errorUrl);
    }

    // Not logged in — redirect to login
    if (!sessionId) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('callbackUrl', request.url);
      return NextResponse.redirect(loginUrl);
    }

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
    const user = await getSession(sessionId, ip);

    if (!user) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('callbackUrl', request.url);
      return NextResponse.redirect(loginUrl);
    }

    // prompt=login: force re-authentication
    if (prompt === 'login') {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('callbackUrl', request.url);
      return NextResponse.redirect(loginUrl);
    }

    // Redirect to consent page
    const consentUrl = new URL('/oauth/consent', request.url);
    consentUrl.searchParams.set('client_id', clientId);
    consentUrl.searchParams.set('redirect_uri', redirectUri);
    if (scope) consentUrl.searchParams.set('scope', scope);
    if (state) consentUrl.searchParams.set('state', state);
    if (nonce) consentUrl.searchParams.set('nonce', nonce);

    return NextResponse.redirect(consentUrl);
  } catch (error) {
    console.error('OAuth2 authorize error:', error);
    return NextResponse.json({ error: 'authorization_failed' }, { status: 500 });
  }
}
