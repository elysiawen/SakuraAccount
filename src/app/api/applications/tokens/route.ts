import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserTokens, revokeToken } from '@/lib/oauth2';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('account_session')?.value;

    if (!sessionId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
    const user = await getSession(sessionId, ip);

    if (!user) {
      return NextResponse.json({ error: '会话已过期' }, { status: 401 });
    }

    const tokens = await getUserTokens(user.id);

    return NextResponse.json({ tokens });
  } catch (error) {
    console.error('OAuth2 tokens error:', error);
    return NextResponse.json({ error: '获取授权列表失败' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('account_session')?.value;

    if (!sessionId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
    const user = await getSession(sessionId, ip);

    if (!user) {
      return NextResponse.json({ error: '会话已过期' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tokenId = searchParams.get('id');

    if (!tokenId) {
      return NextResponse.json({ error: '请指定授权ID' }, { status: 400 });
    }

    await revokeToken(tokenId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Revoke token error:', error);
    return NextResponse.json({ error: '撤销授权失败' }, { status: 500 });
  }
}
