import { NextRequest, NextResponse } from 'next/server';
import {
  validateClient,
  getAuthorizationCode,
  deleteAuthorizationCode,
  generateAccessToken,
  getTokenByRefreshToken,
  revokeToken,
} from '@/lib/oauth2';
import { generateIdToken } from '@/lib/oidc';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const params = new URLSearchParams(body);

    const grantType = params.get('grant_type');
    const clientId = params.get('client_id');
    const clientSecret = params.get('client_secret');

    if (!grantType || !clientId) {
      return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
    }

    // Validate client
    const client = await validateClient(clientId, clientSecret || undefined);
    if (!client) {
      return NextResponse.json({ error: 'invalid_client' }, { status: 401 });
    }

    if (grantType === 'authorization_code') {
      const code = params.get('code');
      const redirectUri = params.get('redirect_uri');

      if (!code || !redirectUri) {
        return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
      }

      // Get and validate authorization code
      const authCode = await getAuthorizationCode(code);
      if (!authCode) {
        return NextResponse.json({ error: 'invalid_grant' }, { status: 400 });
      }

      if (authCode.clientId !== clientId) {
        return NextResponse.json({ error: 'invalid_grant' }, { status: 400 });
      }

      if (authCode.redirectUri !== redirectUri) {
        return NextResponse.json({ error: 'invalid_grant' }, { status: 400 });
      }

      // Delete authorization code (one-time use)
      await deleteAuthorizationCode(code);

      // Generate access token
      const token = await generateAccessToken(clientId, authCode.userId, authCode.scopes);

      const response: Record<string, any> = {
        access_token: token.accessToken,
        token_type: 'Bearer',
        expires_in: parseInt(process.env.OAUTH2_ACCESS_TOKEN_EXPIRY || '3600'),
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

      return NextResponse.json(response);
    }

    if (grantType === 'refresh_token') {
      const refreshToken = params.get('refresh_token');

      if (!refreshToken) {
        return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
      }

      // Get token by refresh token
      const token = await getTokenByRefreshToken(refreshToken);
      if (!token) {
        return NextResponse.json({ error: 'invalid_grant' }, { status: 400 });
      }

      if (token.clientId !== clientId) {
        return NextResponse.json({ error: 'invalid_grant' }, { status: 400 });
      }

      // Revoke old token
      await revokeToken(token.id);

      // Generate new access token
      const newToken = await generateAccessToken(clientId, token.userId, token.scopes);

      const response: Record<string, any> = {
        access_token: newToken.accessToken,
        token_type: 'Bearer',
        expires_in: parseInt(process.env.OAUTH2_ACCESS_TOKEN_EXPIRY || '3600'),
        refresh_token: newToken.refreshToken,
        scope: token.scopes.join(' '),
      };

      // OIDC: include id_token when openid scope is present
      if (token.scopes.includes('openid')) {
        response.id_token = await generateIdToken(token.userId, clientId, undefined, token.scopes);
      }

      return NextResponse.json(response);
    }

    if (grantType === 'client_credentials') {
      // Client credentials grant — no user, token belongs to the client itself
      const scope = params.get('scope');
      const scopes = scope ? scope.split(' ') : client.scopes;

      const token = await generateAccessToken(clientId, clientId, scopes);

      return NextResponse.json({
        access_token: token.accessToken,
        token_type: 'Bearer',
        expires_in: parseInt(process.env.OAUTH2_ACCESS_TOKEN_EXPIRY || '3600'),
        scope: scopes.join(' '),
      });
    }

    return NextResponse.json({ error: 'unsupported_grant_type' }, { status: 400 });
  } catch (error) {
    console.error('OAuth2 token error:', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
