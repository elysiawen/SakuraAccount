import { NextRequest, NextResponse } from 'next/server';
import { validateClient, revokeTokenByValue } from '@/lib/oauth2';

const NO_STORE_HEADERS: Record<string, string> = {
  'Cache-Control': 'no-store',
  'Pragma': 'no-cache',
};

function jsonError(status: number, error: string, description: string, extraHeaders?: Record<string, string>): NextResponse {
  return NextResponse.json(
    { error, error_description: description },
    { status, headers: { ...NO_STORE_HEADERS, ...extraHeaders } }
  );
}

function checkBasicAuth(request: NextRequest): { clientId: string; clientSecret: string } | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Basic ')) return null;
  try {
    const decoded = atob(authHeader.substring(6));
    const colonIndex = decoded.indexOf(':');
    if (colonIndex === -1) return null;
    return {
      clientId: decoded.substring(0, colonIndex),
      clientSecret: decoded.substring(colonIndex + 1),
    };
  } catch {
    return null;
  }
}

/**
 * Token Revocation Endpoint (RFC 7009)
 *
 * POST /oauth/revoke
 *
 * Revokes an access token or refresh token.
 * Per RFC 7009 §2.2, the endpoint always returns HTTP 200 OK
 * even if the token is invalid or unknown, unless client authentication fails.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const params = new URLSearchParams(body);

    const token = params.get('token');
    const tokenTypeHint = params.get('token_type_hint') as 'access_token' | 'refresh_token' | null;

    // Support both client_secret_basic (Authorization header) and client_secret_post (body params)
    const basicAuth = checkBasicAuth(request);
    const clientId = basicAuth?.clientId || params.get('client_id');
    const clientSecret = basicAuth?.clientSecret || params.get('client_secret');

    if (!clientId) {
      return jsonError(400, 'invalid_request', 'Missing required parameter: client_id');
    }

    // Validate client
    const client = await validateClient(clientId, clientSecret || undefined);
    if (!client) {
      return jsonError(401, 'invalid_client', 'Client authentication failed.', {
        'WWW-Authenticate': 'Basic realm="oauth2"',
      });
    }

    // RFC 7009 §2.2: If no token provided, return 200 OK (no action)
    if (!token) {
      return new NextResponse(null, {
        status: 200,
        headers: NO_STORE_HEADERS,
      });
    }

    // Revoke the token
    // Only revoke if the token belongs to this client
    const revoked = await revokeTokenByValue(token, tokenTypeHint || undefined);

    // RFC 7009 §2.2: Always return 200 OK
    console.log(`[Revoke] Token revoked=${revoked} hint=${tokenTypeHint || 'none'}`);
    return new NextResponse(null, {
      status: 200,
      headers: NO_STORE_HEADERS,
    });
  } catch (error) {
    console.error('OAuth2 revoke error:', error);
    return jsonError(500, 'server_error', 'An unexpected error occurred. Please try again later.');
  }
}
