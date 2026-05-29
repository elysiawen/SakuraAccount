import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken, getTokenByAccessToken, ISSUER } from '@/lib/oauth2';
import { getUserById } from '@/lib/auth';

const NO_STORE_HEADERS: Record<string, string> = {
  'Cache-Control': 'no-store',
  'Pragma': 'no-cache',
};

function bearerError(status: number, error: string, description?: string): NextResponse {
  const challenge = description
    ? `Bearer error="${error}", error_description="${description}"`
    : `Bearer error="${error}"`;
  const body = description ? { error, error_description: description } : { error };
  return NextResponse.json(body, {
    status,
    headers: {
      ...NO_STORE_HEADERS,
      'WWW-Authenticate': challenge,
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return bearerError(401, 'invalid_token', 'Missing or malformed Authorization header.');
    }

    const accessToken = authHeader.substring(7);

    // Verify access token
    const payload = await verifyAccessToken(accessToken);
    if (!payload) {
      return bearerError(401, 'invalid_token', 'The access token is invalid or has expired.');
    }

    // Get token details
    const token = await getTokenByAccessToken(accessToken);
    if (!token) {
      return bearerError(401, 'invalid_token', 'The access token has been revoked or expired.');
    }

    // Get user details
    const user = await getUserById(token.userId);
    if (!user) {
      return bearerError(401, 'invalid_token', 'The resource owner is no longer available.');
    }

    // Build response based on scopes
    const scopes = token.scopes;
    const userinfo: any = {
      sub: user.id.toString(),
      iss: ISSUER,
    };

    if (scopes.includes('profile')) {
      userinfo.name = user.nickname || user.username;
      userinfo.preferred_username = user.username;
      userinfo.picture = user.avatar;
    }

    if (scopes.includes('email')) {
      userinfo.email = user.email;
      userinfo.email_verified = user.email_verified;
    }

    return NextResponse.json(userinfo, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error('OAuth2 userinfo error:', error);
    return bearerError(500, 'server_error', 'An unexpected error occurred.');
  }
}
