import { NextResponse } from 'next/server';
import { deleteUser, getRequestMetadata, logAudit } from '@/lib/auth';
import { requireAuthenticatedUser } from '@/lib/require-session';
import { cookies } from 'next/headers';
import { userDeleteFailed, adminCannotDeleteSelf } from '@/lib/api-response';
import { SESSION_COOKIE_NAME } from '@/lib/constants';

export async function POST(request: Request) {
  try {
    const result = await requireAuthenticatedUser();
    if ('error' in result) return result.error;
    const { user } = result;

    if (user.role === 'admin') {
      return adminCannotDeleteSelf();
    }

    const { ip, userAgent } = getRequestMetadata(request);
    await logAudit(user.id, 'account_deleted', {}, ip, userAgent, 'operation');
    await deleteUser(user.id);

    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete account error:', error);
    return userDeleteFailed();
  }
}
