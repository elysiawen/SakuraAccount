import { NextRequest, NextResponse } from 'next/server';
import {
  validateClient,
  getAuthorizationCode,
  deleteAuthorizationCode,
  generateAccessToken,
  getTokenByRefreshToken,
  revokeToken,
  getConsentedScopes,
  ACCESS_TOKEN_EXPIRY,
} from '@/lib/oauth2';
import { generateIdToken } from '@/lib/oidc';

const NO_STORE_HEADERS: Record<string, string> = {
  'Cache-Control': 'no-store',
  'Pragma': 'no-cache',
};

interface TokenResponseBody {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token?: string;
  scope: string;
  id_token?: string;
}

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const params = new URLSearchParams(body);

    const grantType = params.get('grant_type');

    // Support both client_secret_basic (Authorization header) and client_secret_post (body params)
    const basicAuth = checkBasicAuth(request);
    const clientId = basicAuth?.clientId || params.get('client_id');
    const clientSecret = basicAuth?.clientSecret || params.get('client_secret');

    if (!grantType || !clientId) {
      return jsonError(400, 'invalid_request', 'Missing required parameter: grant_type or client_id');
    }

    // Validate client
    const client = await validateClient(clientId, clientSecret || undefined);
    if (!client) {
      return jsonError(401, 'invalid_client', 'Client authentication failed.', {
        'WWW-Authenticate': 'Basic realm="oauth2"',
      });
    }

    if (grantType === 'authorization_code') {
      const code = params.get('code');
      const redirectUri = params.get('redirect_uri');

      if (!code || !redirectUri) {
        return jsonError(400, 'invalid_request', 'Missing required parameter: code or redirect_uri');
      }

      // Get and validate authorization code
      const authCode = await getAuthorizationCode(code);
      if (!authCode) {
        console.warn(`[Token] Code not found or expired: ${code.substring(0, 8)}...`);
        return jsonError(400, 'invalid_grant', 'Authorization code is invalid or has expired.');
      }

      // authCode.clientId stores nanoId (FK value), compare with client.nanoId
      if (authCode.clientId !== client.nanoId) {
        return jsonError(400, 'invalid_grant', 'Authorization code was not issued to this client.');
      }

      if (authCode.redirectUri !== redirectUri) {
        return jsonError(400, 'invalid_grant', 'redirect_uri does not match the original request.');
      }

      // Verify consent still exists (user may have revoked between authorize and token exchange)
      const consentedScopes = await getConsentedScopes(authCode.userId, client.nanoId);
      if (!consentedScopes || !authCode.scopes.every(s => consentedScopes.includes(s))) {
        return jsonError(400, 'invalid_grant', 'Consent has been revoked.');
      }

      // Delete authorization code (one-time use)
      await deleteAuthorizationCode(code);

      // Generate access token (nanoId for FK storage, clientId for JWT claim)
      const token = await generateAccessToken(client.nanoId, authCode.userId, authCode.scopes, clientId);

      const response: TokenResponseBody = {
        access_token: token.accessToken,
        token_type: 'Bearer',
        expires_in: ACCESS_TOKEN_EXPIRY,
        refresh_token: token.refreshToken,
        scope: authCode.scopes.join(' '),
      };

      // OIDC: include id_token when openid scope is present
      if (authCode.scopes.includes('openid')) {
        response.id_token = await generateIdToken(
          authCode.userId,
          clientId,
          authCode.nonce,
          authCode.scopes
        );
      }

      return NextResponse.json(response, { headers: NO_STORE_HEADERS });
    }

    if (grantType === 'refresh_token') {
      const refreshToken = params.get('refresh_token');

      if (!refreshToken) {
        return jsonError(400, 'invalid_request', 'Missing required parameter: refresh_token');
      }

      // Get token by refresh token
      const token = await getTokenByRefreshToken(refreshToken);
      if (!token) {
        return jsonError(400, 'invalid_grant', 'Refresh token is invalid or has expired.');
      }

      // token.clientId stores nanoId (FK value), compare with client.nanoId
      if (token.clientId !== client.nanoId) {
        return jsonError(400, 'invalid_grant', 'Refresh token was not issued to this client.');
      }

      // Revoke old token
      await revokeToken(token.id);

      // Generate new access token (nanoId for FK storage, clientId for JWT claim)
      const newToken = await generateAccessToken(client.nanoId, token.userId, token.scopes, clientId);

      const response: TokenResponseBody = {
        access_token: newToken.accessToken,
        token_type: 'Bearer',
        expires_in: ACCESS_TOKEN_EXPIRY,
        refresh_token: newToken.refreshToken,
        scope: token.scopes.join(' '),
      };

      // OIDC: include id_token when openid scope is present
      if (token.scopes.includes('openid')) {
        response.id_token = await generateIdToken(token.userId, clientId, undefined, token.scopes);
      }

      return NextResponse.json(response, { headers: NO_STORE_HEADERS });
    }

    if (grantType === 'client_credentials') {
      // Client credentials is a confidential grant — client must authenticate
      if (!clientSecret) {
        return jsonError(401, 'invalid_client', 'Client authentication required for client_credentials grant.', {
          'WWW-Authenticate': 'Basic realm="oauth2"',
        });
      }

      const scope = params.get('scope');
      const scopes = scope ? scope.split(/[,\s]+/) : client.scopes;

      const token = await generateAccessToken(client.nanoId, null, scopes, clientId);

      return NextResponse.json({
        access_token: token.accessToken,
        token_type: 'Bearer',
        expires_in: ACCESS_TOKEN_EXPIRY,
        scope: scopes.join(' '),
      }, { headers: NO_STORE_HEADERS });
    }

    return jsonError(400, 'unsupported_grant_type', `Grant type "${grantType}" is not supported.`);
  } catch (error) {
    console.error('OAuth2 token error:', error);
    return jsonError(500, 'server_error', 'An unexpected error occurred. Please try again later.');
  }
}
