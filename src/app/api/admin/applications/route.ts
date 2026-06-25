import { NextRequest, NextResponse } from 'next/server';
import { createClient, getAllClientsSummary } from '@/lib/oauth2';
import { requireAdmin } from '@/lib/require-session';
import { appListFailed, paramInvalid, appCreateFailed } from '@/lib/api-response';
import { tApi } from '@/i18n/api-i18n';

export async function GET() {
  try {
    const result = await requireAdmin();
    if ('error' in result) return result.error;

    const clients = await getAllClientsSummary();
    return NextResponse.json({ clients });
  } catch (error) {
    console.error('Admin OAuth2 error:', error);
    return appListFailed();
  }
}

export async function POST(request: NextRequest) {
  try {
    const result = await requireAdmin();
    if ('error' in result) return result.error;
    const { user: admin } = result;

    const body = await request.json();
    const { name, description, appUrl, redirectUris, grants, scopes, userId } = body;

    if (!name || !redirectUris || !redirectUris.length) {
      return paramInvalid(await tApi('app.fieldsRequired'));
    }

    // Admin can create apps under any user; defaults to self
    const targetUserId = userId || admin.id;

    const client = await createClient({
      name,
      description,
      appUrl: appUrl || undefined,
      redirectUris,
      grants: grants || ['authorization_code', 'refresh_token'],
      scopes: scopes || ['profile', 'email'],
      userId: targetUserId,
    });

    return NextResponse.json({ client });
  } catch (error) {
    console.error('Admin create OAuth2 client error:', error);
    return appCreateFailed();
  }
}
