import { NextRequest, NextResponse } from 'next/server';
import { getUserById, verifyPassword, updateUserPassword, getRequestMetadata, logAudit } from '@/lib/auth';
import { requireAuthenticatedUser } from '@/lib/require-session';
import { validatePassword, VALIDATION_KEY_MAP } from '@/lib/utils';
import { paramInvalid, authWeakPassword, userPasswordNotSet, authPasswordWrong, userPasswordChangeFailed } from '@/lib/api-response';
import { tApi } from '@/i18n/api-i18n';

export async function POST(request: NextRequest) {
  try {
    const result = await requireAuthenticatedUser();
    if ('error' in result) return result.error;
    const { user } = result;

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return paramInvalid(await tApi('sys.paramInvalid'));
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      const mapped = VALIDATION_KEY_MAP[passwordError];
      return authWeakPassword(mapped ? await tApi(mapped) : passwordError);
    }

    const userDetails = await getUserById(user.id);
    if (!userDetails?.password_hash) {
      return userPasswordNotSet();
    }

    const isValid = await verifyPassword(currentPassword, userDetails.password_hash);
    if (!isValid) {
      return authPasswordWrong();
    }

    await updateUserPassword(user.id, newPassword);

    const { ip, userAgent } = getRequestMetadata(request);
    await logAudit(user.id, 'password_changed', {}, ip, userAgent, 'operation');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Change password error:', error);
    return userPasswordChangeFailed();
  }
}
