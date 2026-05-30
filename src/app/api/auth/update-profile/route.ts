import { NextRequest, NextResponse } from 'next/server';
import { updateUser, getRequestMetadata, logAudit } from '@/lib/auth';
import { requireAuthenticatedUser } from '@/lib/require-session';
import { isValidEmail, validateNickname } from '@/lib/utils';
import { paramInvalid, userUpdateFailed } from '@/lib/api-response';
import { tApi } from '@/i18n/api-i18n';

const VALIDATION_KEY_MAP: Record<string, string> = {
  'NICKNAME_EMPTY': 'validation.nicknameEmpty',
  'NICKNAME_TOO_LONG': 'validation.nicknameTooLong',
};

export async function POST(request: NextRequest) {
  try {
    const result = await requireAuthenticatedUser();
    if ('error' in result) return result.error;
    const { user } = result;

    const body = await request.json();
    const { nickname, email } = body;

    const nicknameError = validateNickname(nickname);
    if (nicknameError) {
      const mapped = VALIDATION_KEY_MAP[nicknameError];
      return paramInvalid(mapped ? await tApi(mapped) : nicknameError);
    }

    if (email && !isValidEmail(email)) {
      return paramInvalid(await tApi('sys.paramInvalid'));
    }

    await updateUser(user.id, { nickname: nickname?.trim(), email });

    const { ip, userAgent } = getRequestMetadata(request);
    await logAudit(user.id, 'profile_updated', { nickname, email }, ip, userAgent, 'operation');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update profile error:', error);
    return userUpdateFailed();
  }
}
