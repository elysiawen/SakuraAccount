import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { generateRegistration, verifyRegistration } from '@/lib/webauthn';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { action, response, challenge } = body;

    if (action === 'generate') {
      const options = await generateRegistration(user.id, user.username, user.nickname);
      return NextResponse.json({ options });
    }

    if (action === 'verify') {
      if (!response || !challenge) {
        return NextResponse.json({ error: '无效的请求' }, { status: 400 });
      }

      const verification = await verifyRegistration(user.id, response, challenge);

      return NextResponse.json({
        verified: verification.verified,
      });
    }

    return NextResponse.json({ error: '无效的操作' }, { status: 400 });
  } catch (error) {
    console.error('WebAuthn register error:', error);
    return NextResponse.json({ error: '操作失败' }, { status: 500 });
  }
}
