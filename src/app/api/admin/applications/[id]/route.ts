import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getClientByNanoId, updateClient, deleteClient } from '@/lib/oauth2';

async function requireAdmin() {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('account_session')?.value;

  if (!sessionId) return null;

  const user = await getSession(sessionId);
  if (!user || user.role !== 'admin') return null;

  return user;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const { id } = await params;
    const client = await getClientByNanoId(id);

    if (!client) {
      return NextResponse.json({ error: '应用不存在' }, { status: 404 });
    }

    return NextResponse.json({ client });
  } catch (error) {
    console.error('Admin get OAuth2 client error:', error);
    return NextResponse.json({ error: '获取应用信息失败' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, icon, appUrl, redirectUris, grants, scopes, status } = body;

    const client = await getClientByNanoId(id);
    if (!client) {
      return NextResponse.json({ error: '应用不存在' }, { status: 404 });
    }

    await updateClient(id, { name, description, icon, appUrl, redirectUris, grants, scopes, status });

    const updated = await getClientByNanoId(id);
    return NextResponse.json({ client: updated });
  } catch (error) {
    console.error('Admin update OAuth2 client error:', error);
    return NextResponse.json({ error: '更新应用失败' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const { id } = await params;

    const client = await getClientByNanoId(id);
    if (!client) {
      return NextResponse.json({ error: '应用不存在' }, { status: 404 });
    }

    await deleteClient(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin delete OAuth2 client error:', error);
    return NextResponse.json({ error: '删除应用失败' }, { status: 500 });
  }
}
