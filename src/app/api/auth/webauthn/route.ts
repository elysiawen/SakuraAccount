import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserCredentials, removeCredential } from '@/lib/webauthn';
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

    const credentials = await getUserCredentials(user.id);

    return NextResponse.json({ credentials });
  } catch (error) {
    console.error('WebAuthn credentials error:', error);
    return NextResponse.json({ error: '获取 Passkey 列表失败' }, { status: 500 });
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
    const credentialId = searchParams.get('id');

    if (!credentialId) {
      return NextResponse.json({ error: '请指定 Passkey ID' }, { status: 400 });
    }

    const removed = await removeCredential(credentialId, user.id);

    if (!removed) {
      return NextResponse.json({ error: 'Passkey 不存在或无权删除' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete WebAuthn credential error:', error);
    return NextResponse.json({ error: '删除 Passkey 失败' }, { status: 500 });
  }
}
