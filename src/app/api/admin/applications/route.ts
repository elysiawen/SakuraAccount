import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient, getAllClientsSummary } from '@/lib/oauth2';

async function requireAdmin() {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('account_session')?.value;

  if (!sessionId) return null;

  const user = await getSession(sessionId);
  if (!user || user.role !== 'admin') return null;

  return user;
}

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const clients = await getAllClientsSummary();

    return NextResponse.json({ clients });
  } catch (error) {
    console.error('Admin OAuth2 error:', error);
    return NextResponse.json({ error: '获取应用列表失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, redirectUris, grants, scopes } = body;

    if (!name || !redirectUris || !redirectUris.length) {
      return NextResponse.json({ error: '请填写必要字段' }, { status: 400 });
    }

    const client = await createClient({
      name,
      description,
      redirectUris,
      grants: grants || ['authorization_code', 'refresh_token'],
      scopes: scopes || ['profile', 'email'],
      userId: admin.id,
    });

    return NextResponse.json({ client });
  } catch (error) {
    console.error('Admin create OAuth2 client error:', error);
    return NextResponse.json({ error: '创建应用失败' }, { status: 500 });
  }
}
