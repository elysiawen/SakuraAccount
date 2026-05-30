import { NextRequest, NextResponse } from 'next/server';
import { createClient, getUserClientsSummary } from '@/lib/oauth2';
import { requireAuthenticatedUser } from '@/lib/require-session';
import { appListFailed, paramInvalid, appCreateFailed, adminPermissionDenied } from '@/lib/api-response';
import { tApi } from '@/i18n/api-i18n';

export async function GET() {
  try {
    const result = await requireAuthenticatedUser();
    if ('error' in result) return result.error;

    const { user } = result;

    if (!['admin', 'developer'].includes(user.role)) {
      return await adminPermissionDenied();
    }

    const clients = await getUserClientsSummary(user.id);
    return NextResponse.json({ clients });
  } catch (error) {
    console.error('User OAuth2 list error:', error);
    return appListFailed();
  }
}

export async function POST(request: NextRequest) {
  try {
    const result = await requireAuthenticatedUser();
    if ('error' in result) return result.error;

    const { user } = result;

    if (!['admin', 'developer'].includes(user.role)) {
      return await adminPermissionDenied();
    }

    const body = await request.json();
    const { name, description, appUrl, redirectUris, grants, scopes } = body;

    if (!name || !redirectUris || !redirectUris.length) {
      return paramInvalid(await tApi('app.fieldsRequired'));
    }

    const client = await createClient({
      name,
      description,
      appUrl: appUrl || undefined,
      redirectUris,
      grants: grants || ['authorization_code', 'refresh_token'],
      scopes: scopes || ['profile', 'email'],
      userId: user.id,
    });

    return NextResponse.json({ client });
  } catch (error) {
    console.error('User create OAuth2 client error:', error);
    return appCreateFailed();
  }
}
