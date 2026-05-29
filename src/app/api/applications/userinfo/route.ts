import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken, getTokenByAccessToken } from '@/lib/oauth2';
import { getUserById } from '@/lib/auth';

const ISSUER = process.env.OAUTH2_ISSUER || 'http://localhost:3000';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'invalid_token' }, { status: 401 });
    }

    const accessToken = authHeader.substring(7);

    // Verify access token
    const payload = await verifyAccessToken(accessToken);
    if (!payload) {
      return NextResponse.json({ error: 'invalid_token' }, { status: 401 });
    }

    // Get token details
    const token = await getTokenByAccessToken(accessToken);
    if (!token) {
      return NextResponse.json({ error: 'invalid_token' }, { status: 401 });
    }

    // Get user details
    const user = await getUserById(token.userId);
    if (!user) {
      return NextResponse.json({ error: 'user_not_found' }, { status: 404 });
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

    return NextResponse.json(userinfo);
  } catch (error) {
    console.error('OAuth2 userinfo error:', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
