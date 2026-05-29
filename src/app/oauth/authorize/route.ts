import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getClient, getConsentedScopes, generateAuthorizationCode } from '@/lib/oauth2';
import { cookies } from 'next/headers';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store',
  'Pragma': 'no-cache',
};

function htmlError(status: number, title: string, message: string): NextResponse {
  const body = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>${title}</title></head>
<body><h1>${title}</h1><p>${message}</p></body>
</html>`;
  return new NextResponse(body, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      ...NO_STORE_HEADERS,
    },
  });
}

function redirectWithError(redirectUri: string, error: string, state?: string | null, description?: string): NextResponse {
  const url = new URL(redirectUri);
  url.searchParams.set('error', error);
  if (description) url.searchParams.set('error_description', description);
  if (state) url.searchParams.set('state', state);
  return NextResponse.redirect(url, { headers: NO_STORE_HEADERS });
}

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

    // Non-redirectable errors: missing client_id or redirect_uri
    if (!clientId) {
      return htmlError(400, 'Invalid Request', 'Missing required parameter: client_id');
    }

    if (!redirectUri) {
      return htmlError(400, 'Invalid Request', 'Missing required parameter: redirect_uri');
    }

    if (!responseType) {
      return htmlError(400, 'Invalid Request', 'Missing required parameter: response_type');
    }

    // Validate client — non-redirectable if client_id is invalid
    const client = await getClient(clientId);
    if (!client) {
      return htmlError(400, 'Invalid Client', 'The provided client_id is invalid.');
    }

    if (client.status === 'disabled') {
      return htmlError(400, 'Client Disabled', 'This client has been disabled.');
    }

    // Validate redirect URI — non-redirectable if mismatch
    if (!client.redirectUris.includes(redirectUri)) {
      return htmlError(400, 'Invalid Redirect URI', 'The redirect_uri does not match any registered URI for this client.');
    }

    // From here, redirect_uri is validated — redirectable errors go back to client
    if (responseType !== 'code') {
      return redirectWithError(redirectUri, 'unsupported_response_type', state, 'Only response_type=code is supported.');
    }

    // Check if user is authenticated
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('account_session')?.value;

    const requestedScopes = scope ? scope.split(' ') : ['openid', 'profile'];

    // Helper: check if prior consent covers the requested scopes
    async function hasConsent(userId: string): Promise<boolean> {
      const consented = await getConsentedScopes(userId, clientId!);
      if (!consented) return false;
      return requestedScopes.every(s => consented.includes(s));
    }

    // Helper: issue authorization code and redirect to client
    async function issueCodeAndRedirect(userId: string): Promise<NextResponse> {
      const code = await generateAuthorizationCode(clientId!, userId, redirectUri!, requestedScopes, nonce || undefined);
      const callbackUrl = new URL(redirectUri!);
      callbackUrl.searchParams.set('code', code);
      if (state) callbackUrl.searchParams.set('state', state);
      return NextResponse.redirect(callbackUrl, { headers: NO_STORE_HEADERS });
    }

    // prompt=none: must have valid session, no interaction allowed
    if (prompt === 'none') {
      if (!sessionId) {
        return redirectWithError(redirectUri, 'login_required', state);
      }

      const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
      const user = await getSession(sessionId, ip);

      if (!user) {
        return redirectWithError(redirectUri, 'login_required', state);
      }

      // Check if prior consent exists
      if (!(await hasConsent(user.id))) {
        return redirectWithError(redirectUri, 'consent_required', state);
      }

      return issueCodeAndRedirect(user.id);
    }

    // Not logged in — redirect to login
    if (!sessionId) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('callbackUrl', request.url);
      return NextResponse.redirect(loginUrl, { headers: NO_STORE_HEADERS });
    }

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
    const user = await getSession(sessionId, ip);

    if (!user) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('callbackUrl', request.url);
      return NextResponse.redirect(loginUrl, { headers: NO_STORE_HEADERS });
    }

    // prompt=login: force re-authentication, clear existing session first
    if (prompt === 'login') {
      // Build callback URL WITHOUT prompt=login to avoid infinite loop
      const callbackUrl = new URL(request.url);
      callbackUrl.searchParams.delete('prompt');

      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('callbackUrl', callbackUrl.toString());
      loginUrl.searchParams.set('reauth', '1');
      const response = NextResponse.redirect(loginUrl, { headers: NO_STORE_HEADERS });
      response.cookies.delete('account_session');
      return response;
    }

    // Check if prior consent covers requested scopes — skip consent page if so
    if (prompt !== 'consent' && await hasConsent(user.id)) {
      return issueCodeAndRedirect(user.id);
    }

    // Redirect to consent page
    const consentUrl = new URL('/oauth/consent', request.url);
    consentUrl.searchParams.set('client_id', clientId);
    consentUrl.searchParams.set('redirect_uri', redirectUri);
    if (scope) consentUrl.searchParams.set('scope', scope);
    if (state) consentUrl.searchParams.set('state', state);
    if (nonce) consentUrl.searchParams.set('nonce', nonce);

    return NextResponse.redirect(consentUrl, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error('OAuth2 authorize error:', error);
    return htmlError(500, 'Server Error', 'An unexpected error occurred. Please try again later.');
  }
}
