import { NextResponse } from 'next/server';
import { deleteUser, getRequestMetadata, logAudit } from '@/lib/auth';
import { requireAuthenticatedUser } from '@/lib/require-session';
import { cookies } from 'next/headers';
import { userDeleteFailed } from '@/lib/api-response';

export async function POST(request: Request) {
  try {
    const result = await requireAuthenticatedUser();
    if ('error' in result) return result.error;
    const { user } = result;

    const { ip, userAgent } = getRequestMetadata(request);
    await logAudit(user.id, 'account_deleted', {}, ip, userAgent);
    await deleteUser(user.id);

    const cookieStore = await cookies();
    cookieStore.delete('account_session');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete account error:', error);
    return userDeleteFailed();
  }
}
