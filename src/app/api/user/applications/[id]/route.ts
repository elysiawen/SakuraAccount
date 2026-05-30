import { NextRequest, NextResponse } from 'next/server';
import { getClientByNanoId, updateClient, deleteClient } from '@/lib/oauth2';
import { requireAuthenticatedUser } from '@/lib/require-session';
import { appNotFound, appUpdateFailed, appDeleteFailed, adminPermissionDenied } from '@/lib/api-response';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await requireAuthenticatedUser();
    if ('error' in result) return result.error;

    const { user } = result;

    if (!['admin', 'developer'].includes(user.role)) {
      return await adminPermissionDenied();
    }

    const { id } = await params;
    const client = await getClientByNanoId(id);

    if (!client) {
      return appNotFound();
    }

    // Non-admin users can only view their own apps
    if (user.role !== 'admin' && client.userId !== user.id) {
      return appNotFound();
    }

    return NextResponse.json({ client });
  } catch (error) {
    console.error('User get OAuth2 client error:', error);
    return appNotFound();
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await requireAuthenticatedUser();
    if ('error' in result) return result.error;

    const { user } = result;

    if (!['admin', 'developer'].includes(user.role)) {
      return await adminPermissionDenied();
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, icon, appUrl, redirectUris, grants, scopes, status } = body;

    const client = await getClientByNanoId(id);
    if (!client) {
      return appNotFound();
    }

    // Non-admin users can only edit their own apps
    if (user.role !== 'admin' && client.userId !== user.id) {
      return appNotFound();
    }

    await updateClient(id, { name, description, icon, appUrl, redirectUris, grants, scopes, status });

    const updated = await getClientByNanoId(id);
    return NextResponse.json({ client: updated });
  } catch (error) {
    console.error('User update OAuth2 client error:', error);
    return appUpdateFailed();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await requireAuthenticatedUser();
    if ('error' in result) return result.error;

    const { user } = result;

    if (!['admin', 'developer'].includes(user.role)) {
      return await adminPermissionDenied();
    }

    const { id } = await params;

    const client = await getClientByNanoId(id);
    if (!client) {
      return appNotFound();
    }

    // Non-admin users can only delete their own apps
    if (user.role !== 'admin' && client.userId !== user.id) {
      return appNotFound();
    }

    await deleteClient(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('User delete OAuth2 client error:', error);
    return appDeleteFailed();
  }
}
