import { NextRequest, NextResponse } from 'next/server';
import { getClientByNanoId, changeSecret } from '@/lib/oauth2';
import { requireAdmin } from '@/lib/require-session';
import { appNotFound, appSecretInvalid, internalError } from '@/lib/api-response';
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
    const { newSecret } = body;

    if (!newSecret || typeof newSecret !== 'string') {
      return appSecretInvalid();
    }

    const client = await getClientByNanoId(id);
    if (!client) {
      return appNotFound();
    }

    const changeResult = await changeSecret(id, newSecret);

    if (!changeResult.success) {
      if (changeResult.error === 'invalid') {
        return appSecretInvalid();
      }
      if (changeResult.error === 'not_found') {
        return appNotFound();
      }
    }

    const updated = await getClientByNanoId(id);
    return NextResponse.json({ client: updated });
  } catch (error) {
    console.error('Admin change secret error:', error);
    return internalError(await tApi('app.updateFailed'));
  }
}
