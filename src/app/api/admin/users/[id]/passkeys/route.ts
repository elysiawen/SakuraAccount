import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/require-session';
import { db } from '@/lib/db';
import { getAuthenticatorInfo } from '@/lib/aaguids';
import { adminUserIdRequired, authPasskeyNotFound, passkeyDeleteFailed, passkeyListFailed } from '@/lib/api-response';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: PageProps) {
  try {
    const result = await requireAdmin();
    if ('error' in result) return result.error;

    const { id: userId } = await params;

    const rows = await db.query(
      'SELECT id, name, device_type, aaguid, created_at, last_used FROM webauthn_credentials WHERE user_id = ?',
      [userId]
    );

    const credentials = rows.map((cred: any) => {
      const info = getAuthenticatorInfo(cred.aaguid);
      return {
        id: cred.id,
        name: cred.name || null,
        device_type: cred.device_type,
        aaguid: cred.aaguid || null,
        providerName: info.name,
        providerIcon: info.icon,
        created_at: cred.created_at,
        last_used: cred.last_used,
      };
    });

    return NextResponse.json({ credentials });
  } catch (error) {
    console.error('Admin list passkeys error:', error);
    return passkeyListFailed();
  }
}

export async function DELETE(request: NextRequest, { params }: PageProps) {
  try {
    const result = await requireAdmin();
    if ('error' in result) return result.error;

    const { id: userId } = await params;
    const { searchParams } = new URL(request.url);
    const credentialId = searchParams.get('id');

    if (!credentialId) {
      return adminUserIdRequired();
    }

    const dbResult = await db.execute(
      'DELETE FROM webauthn_credentials WHERE id = ? AND user_id = ?',
      [credentialId, userId]
    );

    const affected = dbResult.affectedRows > 0 || dbResult.rowCount > 0;
    if (!affected) {
      return authPasskeyNotFound();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin delete passkey error:', error);
    return passkeyDeleteFailed();
  }
}
