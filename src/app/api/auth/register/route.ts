import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserByUsername, getUserByEmail, createSession, setSessionCookie, getRequestMetadata, logAudit } from '@/lib/auth';
import { isValidEmail, isValidUsername, validatePassword, validateNickname, VALIDATION_KEY_MAP } from '@/lib/utils';
import { paramInvalid, authUsernameExists, authEmailExists, authWeakPassword, internalError } from '@/lib/api-response';
import { tApi } from '@/i18n/api-i18n';

async function translateValidationKey(key: string): Promise<string> {
  const mapped = VALIDATION_KEY_MAP[key];
  if (mapped) return tApi(mapped);
  return key;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, email, password, nickname } = body;

    if (!username || !email || !password) {
      return paramInvalid(await tApi('sys.paramInvalid'));
    }

    if (!isValidUsername(username)) {
      return paramInvalid(await tApi('sys.paramInvalid'));
    }

    if (!isValidEmail(email)) {
      return paramInvalid(await tApi('sys.paramInvalid'));
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return authWeakPassword(await translateValidationKey(passwordError));
    }

    const nicknameError = validateNickname(nickname);
    if (nicknameError) {
      return paramInvalid(await translateValidationKey(nicknameError));
    }

    const existingUser = await getUserByUsername(username);
    const existingEmail = await getUserByEmail(email);
    if (existingUser || existingEmail) {
      if (existingUser) return authUsernameExists();
      return authEmailExists();
    }

    const user = await createUser(username, email, password, nickname?.trim());
    const { ip, userAgent } = getRequestMetadata(request);
    const sessionId = await createSession(user.id, ip, userAgent);
    await setSessionCookie(sessionId);
    await logAudit(user.id, 'register', { username, email }, ip, userAgent, 'access');

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        nickname: user.nickname,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    return internalError();
  }
}
