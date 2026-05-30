import { NextRequest, NextResponse } from 'next/server';
import { getClientByNanoId, updateClient, deleteClient } from '@/lib/oauth2';
import { requireAdmin } from '@/lib/require-session';
import { appNotFound, internalError, appUpdateFailed, appDeleteFailed } from '@/lib/api-response';
import { tApi } from '@/i18n/api-i18n';

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

    return NextResponse.json({ client });
  } catch (error) {
    console.error('Admin get OAuth2 client error:', error);
    return internalError(await tApi('app.getInfoFailed'));
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await requireAdmin();
    if ('error' in result) return result.error;

    const { id } = await params;
    const body = await request.json();
    const { name, description, icon, appUrl, redirectUris, grants, scopes, status } = body;

    const client = await getClientByNanoId(id);
    if (!client) {
      return appNotFound();
    }

    await updateClient(id, { name, description, icon, appUrl, redirectUris, grants, scopes, status });

    const updated = await getClientByNanoId(id);
    return NextResponse.json({ client: updated });
  } catch (error) {
    console.error('Admin update OAuth2 client error:', error);
    return appUpdateFailed();
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

    await deleteClient(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin delete OAuth2 client error:', error);
    return appDeleteFailed();
  }
}
