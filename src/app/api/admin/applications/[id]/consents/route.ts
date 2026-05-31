import { NextRequest, NextResponse } from 'next/server';
import { getClientByNanoId } from '@/lib/oauth2';
import { requireAdmin } from '@/lib/require-session';
import { appNotFound, internalError, paramInvalid, tokenRevokeFailed } from '@/lib/api-response';
import { db } from '@/lib/db';
import { tApi } from '@/i18n/api-i18n';

interface ConsentUserRow extends Record<string, unknown> {
  user_id: string;
  username: string;
  nickname: string | null;
  avatar: string | null;
  scopes: string | string[];
  consented_at: string;
}

function parseScopes(value: ConsentUserRow['scopes']): string[] {
  if (Array.isArray(value)) return value.filter((s): s is string => typeof s === 'string');
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === 'string') : [];
    } catch {
      return [];
    }
  }
  return [];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await requireAdmin();
    if ('error' in result) return result.error;

    const { id } = await params;
    const client = await getClientByNanoId(id);

    if (!client) {
      return appNotFound();
    }

    const rows = await db.query<ConsentUserRow>(
      `SELECT
         con.user_id,
         u.username,
         u.nickname,
         u.avatar,
         con.scopes,
         con.created_at as consented_at
       FROM oauth2_consents con
       LEFT JOIN users u ON con.user_id = u.id
       WHERE con.client_id = ?
       ORDER BY con.created_at DESC`,
      [client.nanoId]
    );

    const users = rows.map((row) => ({
      userId: row.user_id,
      username: row.username,
      nickname: row.nickname || row.username,
      avatar: row.avatar || null,
      scopes: parseScopes(row.scopes),
      consentedAt: row.consented_at,
    }));

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Admin get app consents error:', error);
    return internalError(await tApi('app.getInfoFailed'));
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await requireAdmin();
    if ('error' in result) return result.error;

    const { id } = await params;
    const client = await getClientByNanoId(id);

    if (!client) {
      return appNotFound();
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return paramInvalid();
    }

    await db.execute(
      'DELETE FROM oauth2_consents WHERE user_id = ? AND client_id = ?',
      [userId, client.nanoId]
    );

    await db.execute(
      'DELETE FROM oauth2_tokens WHERE user_id = ? AND client_id = ?',
      [userId, client.nanoId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin revoke app consent error:', error);
    return tokenRevokeFailed();
  }
}
