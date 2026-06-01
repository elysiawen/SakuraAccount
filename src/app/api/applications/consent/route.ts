import { NextRequest, NextResponse } from 'next/server';
import { getClient, generateAuthorizationCode, saveConsent } from '@/lib/oauth2';
import { requireAuthenticatedUser } from '@/lib/require-session';
import { logAudit, getRequestMetadata } from '@/lib/auth';

const NO_STORE_HEADERS: Record<string, string> = {
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const params = new URLSearchParams(body);

    const clientId = params.get('client_id');
    const redirectUri = params.get('redirect_uri');
    const scope = params.get('scope');
    const state = params.get('state');
    const nonce = params.get('nonce');
    const codeChallenge = params.get('code_challenge');
    const codeChallengeMethod = params.get('code_challenge_method') as 'S256' | 'plain' | null;
    const approved = params.get('approved') === 'true';

    // Non-redirectable: missing parameters
    if (!clientId) {
      return htmlError(400, 'Invalid Request', 'Missing required parameter: client_id');
    }

    if (!redirectUri) {
      return htmlError(400, 'Invalid Request', 'Missing required parameter: redirect_uri');
    }

    // Non-redirectable: client validation
    const client = await getClient(clientId);
    if (!client) {
      return htmlError(400, 'Invalid Client', 'The provided client_id is invalid.');
    }

    if (client.status === 'disabled') {
      return htmlError(400, 'Client Disabled', 'This client has been disabled.');
    }

    // Non-redirectable: redirect_uri mismatch
    if (!client.redirectUris.includes(redirectUri)) {
      return htmlError(400, 'Invalid Redirect URI', 'The redirect_uri does not match any registered URI for this client.');
    }

    // Redirectable: return JSON with redirect URL (SPA calls this via fetch, not browser navigation)
    if (!approved) {
      const errorUrl = new URL(redirectUri);
      errorUrl.searchParams.set('error', 'access_denied');
      errorUrl.searchParams.set('error_description', 'The user denied the authorization request.');
      if (state) errorUrl.searchParams.set('state', state);
      return NextResponse.json({ redirect: errorUrl.toString() }, { headers: NO_STORE_HEADERS });
    }

    const result = await requireAuthenticatedUser();
    if ('error' in result) {
      return htmlError(401, 'Login Required', 'You must be logged in to authorize an application.');
    }

    const scopes = scope ? scope.split(/[,\s]+/) : ['openid', 'profile'];

    // Save consent so future requests can skip the consent page (store nanoId as FK)
    await saveConsent(result.user.id, client.nanoId, scopes);

    const code = await generateAuthorizationCode(
      client.nanoId, result.user.id, redirectUri, scopes,
      nonce || undefined,
      codeChallenge || undefined,
      (codeChallengeMethod === 'S256' || codeChallengeMethod === 'plain') ? codeChallengeMethod : undefined
    );

    // Log authorization event
    const { ip, userAgent } = getRequestMetadata(request);
    await logAudit(result.user.id, 'oauth_authorize', { clientId, scopes, approved: true }, ip, userAgent, 'auth');

    const callbackUrl = new URL(redirectUri);
    callbackUrl.searchParams.set('code', code);
    if (state) callbackUrl.searchParams.set('state', state);

    return NextResponse.json({ redirect: callbackUrl.toString() }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error('Consent error:', error);
    return htmlError(500, 'Server Error', 'An unexpected error occurred. Please try again later.');
  }
}
