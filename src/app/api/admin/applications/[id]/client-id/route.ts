import { NextRequest, NextResponse } from 'next/server';
import { getClientByNanoId, changeClientId } from '@/lib/oauth2';
import { requireAdmin } from '@/lib/require-session';
import { appNotFound, appClientIdDuplicate, appClientIdInvalid, internalError } from '@/lib/api-response';
import { tApi } from '@/i18n/api-i18n';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await requireAdmin();
    if ('error' in result) return result.error;

    const { id } = await params;
    const body = await request.json();
    const { newClientId } = body;

    if (!newClientId || typeof newClientId !== 'string') {
      return appClientIdInvalid();
    }

    const client = await getClientByNanoId(id);
    if (!client) {
      return appNotFound();
    }

    const changeResult = await changeClientId(id, newClientId);

    if (!changeResult.success) {
      if (changeResult.error === 'duplicate') {
        return appClientIdDuplicate();
      }
      if (changeResult.error === 'invalid') {
        return appClientIdInvalid();
      }
      if (changeResult.error === 'not_found') {
        return appNotFound();
      }
    }

    const updated = await getClientByNanoId(id);
    return NextResponse.json({ client: updated });
  } catch (error) {
    console.error('Admin change client_id error:', error);
    return internalError(await tApi('app.updateFailed'));
  }
}
