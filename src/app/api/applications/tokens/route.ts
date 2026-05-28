import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { revokeToken } from '@/lib/oauth2';
import { db } from '@/lib/db';
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

    const rows = await db.query(
      `SELECT t.id as token_id, t.client_id, t.scopes, t.expires_at, t.created_at,
              c.name as client_name, c.description as client_description, c.icon, c.app_url
       FROM oauth2_tokens t
       LEFT JOIN oauth2_clients c ON t.client_id = c.id
       WHERE t.user_id = ?
       ORDER BY t.created_at DESC`,
      [user.id]
    );

    // Group by client
    const appMap = new Map<string, any>();
    for (const row of rows) {
      const clientId = row.client_id;
      if (!appMap.has(clientId)) {
        appMap.set(clientId, {
          clientId,
          name: row.client_name || clientId,
          description: row.client_description || '',
          icon: row.icon || undefined,
          appUrl: row.app_url || undefined,
          redirectUris: [],
          scopes: typeof row.scopes === 'string' ? JSON.parse(row.scopes) : row.scopes,
          tokenCount: 0,
          latestCreatedAt: row.created_at,
        });
      }
      const app = appMap.get(clientId);
      app.tokenCount++;
    }

    return NextResponse.json({ apps: Array.from(appMap.values()) });
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
    const clientId = searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json({ error: '请指定应用' }, { status: 400 });
    }

    await db.execute(
      'DELETE FROM oauth2_tokens WHERE client_id = ? AND user_id = ?',
      [clientId, user.id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Revoke token error:', error);
    return NextResponse.json({ error: '撤销授权失败' }, { status: 500 });
  }
}
