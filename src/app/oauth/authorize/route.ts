import { NextRequest, NextResponse } from 'next/server';
import { getRequestMetadata, getSession } from '@/lib/auth';
import { getClient, getConsentedScopes, generateAuthorizationCode, ISSUER } from '@/lib/oauth2';
import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME, LOGIN_PATH } from '@/lib/constants';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store',
  'Pragma': 'no-cache',
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function htmlError(status: number, title: string, message: string): NextResponse {
  const safeTitle = escapeHtml(title);
  const safeMessage = escapeHtml(message);
  const body = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>${safeTitle}</title></head>
<body><h1>${safeTitle}</h1><p>${safeMessage}</p></body>
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
    const codeChallenge = searchParams.get('code_challenge');
    const codeChallengeMethod = searchParams.get('code_challenge_method');

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

    // PKCE validation (RFC 7636)
    // If code_challenge is provided, method must be S256 or plain (defaults to S256)
    let validatedCodeChallenge: string | undefined;
    let validatedCodeChallengeMethod: 'S256' | 'plain' | undefined;
    if (codeChallenge) {
      if (codeChallenge.length < 43 || codeChallenge.length > 128) {
        return redirectWithError(redirectUri, 'invalid_request', state, 'code_challenge length must be between 43 and 128 characters.');
      }
      // RFC 7636 §4.2: code_challenge must be unreserved chars (same as code_verifier)
      if (!/^[A-Za-z0-9._~-]+$/.test(codeChallenge)) {
        return redirectWithError(redirectUri, 'invalid_request', state, 'code_challenge contains invalid characters.');
      }
      if (codeChallengeMethod && codeChallengeMethod !== 'S256' && codeChallengeMethod !== 'plain') {
        return redirectWithError(redirectUri, 'invalid_request', state, 'code_challenge_method must be "S256" or "plain".');
      }
      // Per RFC 7636 §4.3, S256 is Mandatory To Implement (MTI)
      // Default to S256 when code_challenge_method is not provided
      validatedCodeChallenge = codeChallenge;
      validatedCodeChallengeMethod = (codeChallengeMethod as 'S256' | 'plain') || 'S256';
    }

    // Check if user is authenticated
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const { ip } = getRequestMetadata(request);

    const requestedScopes = scope ? scope.split(/[,\s]+/) : ['openid', 'profile'];

    // Helper: check if prior consent covers the requested scopes
    async function hasConsent(userId: string): Promise<boolean> {
      const consented = await getConsentedScopes(userId, client!.nanoId);
      if (!consented) return false;
      return requestedScopes.every(s => consented.includes(s));
    }

    // Helper: issue authorization code and redirect to client
    async function issueCodeAndRedirect(userId: string): Promise<NextResponse> {
      const code = await generateAuthorizationCode(
        client!.nanoId, userId, redirectUri!, requestedScopes,
        nonce || undefined,
        validatedCodeChallenge,
        validatedCodeChallengeMethod
      );
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

    // Build the current authorize URL using ISSUER as base (not request.url,
    // which may be localhost:3000 when running behind a reverse proxy).
    const currentUrl = new URL(request.nextUrl.pathname + request.nextUrl.search, ISSUER);

    // Not logged in — redirect to login
    if (!sessionId) {
      const loginUrl = new URL(LOGIN_PATH, ISSUER);
      loginUrl.searchParams.set('callbackUrl', currentUrl.toString());
      return NextResponse.redirect(loginUrl, { headers: NO_STORE_HEADERS });
    }

    const user = await getSession(sessionId, ip);

    if (!user) {
      const loginUrl = new URL(LOGIN_PATH, ISSUER);
      loginUrl.searchParams.set('callbackUrl', currentUrl.toString());
      return NextResponse.redirect(loginUrl, { headers: NO_STORE_HEADERS });
    }

    // prompt=login: force re-authentication, clear existing session first
    if (prompt === 'login') {
      // Build callback URL WITHOUT prompt=login to avoid infinite loop
      const callbackUrl = new URL(currentUrl.toString());
      callbackUrl.searchParams.delete('prompt');

      const loginUrl = new URL(LOGIN_PATH, ISSUER);
      loginUrl.searchParams.set('callbackUrl', callbackUrl.toString());
      loginUrl.searchParams.set('reauth', '1');
      const response = NextResponse.redirect(loginUrl, { headers: NO_STORE_HEADERS });
      response.cookies.delete(SESSION_COOKIE_NAME);
      return response;
    }

    // Check if prior consent covers requested scopes — skip consent page if so
    if (prompt !== 'consent' && await hasConsent(user.id)) {
      return issueCodeAndRedirect(user.id);
    }

    // Redirect to consent page
    const consentUrl = new URL('/oauth/consent', ISSUER);
    consentUrl.searchParams.set('client_id', clientId);
    consentUrl.searchParams.set('redirect_uri', redirectUri);
    if (scope) consentUrl.searchParams.set('scope', scope);
    if (state) consentUrl.searchParams.set('state', state);
    if (nonce) consentUrl.searchParams.set('nonce', nonce);
    if (validatedCodeChallenge) consentUrl.searchParams.set('code_challenge', validatedCodeChallenge);
    if (validatedCodeChallengeMethod) consentUrl.searchParams.set('code_challenge_method', validatedCodeChallengeMethod);

    return NextResponse.redirect(consentUrl, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error('OAuth2 authorize error:', error);
    return htmlError(500, 'Server Error', 'An unexpected error occurred. Please try again later.');
  }
}
