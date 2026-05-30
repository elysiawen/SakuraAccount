import { NextRequest, NextResponse } from 'next/server';
import { deleteConsent } from '@/lib/oauth2';
import { requireAuthenticatedUser } from '@/lib/require-session';
import { db } from '@/lib/db';
import { tokenListFailed, tokenAppRequired, tokenRevokeFailed } from '@/lib/api-response';

interface TokenAppRow extends Record<string, unknown> {
  client_id: string;
  consented_scopes: string | string[] | null;
  consented_at: string;
  client_name: string | null;
  client_description: string | null;
  icon: string | null;
  app_url: string | null;
  token_count: number | string | null;
  latest_token_at: string | null;
}

function parseScopes(value: TokenAppRow['consented_scopes']): string[] {
  if (Array.isArray(value)) return value.filter((scope): scope is string => typeof scope === 'string');
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter((scope): scope is string => typeof scope === 'string') : [];
    } catch {
      return [];
    }
  }
  return [];
}

export async function GET() {
  try {
    const result = await requireAuthenticatedUser();
    if ('error' in result) return result.error;

    const rows = await db.query<TokenAppRow>(
      `SELECT
         con.client_id,
         con.scopes as consented_scopes,
         con.created_at as consented_at,
         c.name as client_name, c.description as client_description, c.icon, c.app_url,
         COUNT(t.id) as token_count,
         MAX(t.created_at) as latest_token_at
       FROM oauth2_consents con
       LEFT JOIN oauth2_clients c ON con.client_id = c.id
       LEFT JOIN oauth2_tokens t ON t.client_id = con.client_id AND t.user_id = con.user_id
       WHERE con.user_id = ?
       GROUP BY con.client_id, con.scopes, con.created_at, c.name, c.description, c.icon, c.app_url
       ORDER BY con.created_at DESC`,
      [result.user.id]
    );

    const apps = rows.map((row) => ({
      clientId: row.client_id,
      name: row.client_name || row.client_id,
      description: row.client_description || '',
      icon: row.icon || undefined,
      appUrl: row.app_url || undefined,
      scopes: parseScopes(row.consented_scopes),
      tokenCount: Number(row.token_count) || 0,
      latestCreatedAt: row.latest_token_at || row.consented_at,
    }));

    return NextResponse.json({ apps });
  } catch (error) {
    console.error('OAuth2 tokens error:', error);
    return tokenListFailed();
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const result = await requireAuthenticatedUser();
    if ('error' in result) return result.error;

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    if (!clientId) {
      return tokenAppRequired();
    }

    await db.execute(
      'DELETE FROM oauth2_tokens WHERE client_id = ? AND user_id = ?',
      [clientId, result.user.id]
    );

    await deleteConsent(result.user.id, clientId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Revoke token error:', error);
    return tokenRevokeFailed();
  }
}
