import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, getUserByUsername, completeUserRegistration, verifyEmailCode, createSession, setSessionCookie, getRequestMetadata, logAudit } from '@/lib/auth';
import { isValidEmail, isValidUsername, validatePassword, validateNickname, VALIDATION_KEY_MAP } from '@/lib/utils';
import { paramInvalid, authUsernameExists, authWeakPassword, internalError } from '@/lib/api-response';
import { tApi } from '@/i18n/api-i18n';

async function translateValidationKey(key: string): Promise<string> {
  const mapped = VALIDATION_KEY_MAP[key];
  if (mapped) return tApi(mapped);
  return key;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, email, password, nickname, code } = body;

    if (!username || !email || !password || !code) {
      return paramInvalid(await tApi('sys.paramInvalid'));
    }

    if (!isValidUsername(username)) {
      return paramInvalid(await tApi('sys.paramInvalid'));
    }

    if (!isValidEmail(email)) {
      return paramInvalid(await tApi('sys.paramInvalid'));
    }

    if (!/^\d{6}$/.test(code)) {
      return paramInvalid(await tApi('email.invalidCode'));
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return authWeakPassword(await translateValidationKey(passwordError));
    }

    const nicknameError = validateNickname(nickname);
    if (nicknameError) {
      return paramInvalid(await translateValidationKey(nicknameError));
    }

    // Check username uniqueness (excluding the pending user)
    const existingUsername = await getUserByUsername(username);
    const existingUser = await getUserByEmail(email);

    if (!existingUser) {
      return authUsernameExists();
    }

    if (existingUsername && existingUsername.id !== existingUser.id) {
      return authUsernameExists();
    }

    // If already verified and has password, this is a duplicate registration
    if (existingUser.email_verified && existingUser.password_hash) {
      return authUsernameExists();
    }

    // Verify the code (matches by code + email)
    const verifiedUserId = await verifyEmailCode(code, email);
    if (!verifiedUserId || verifiedUserId !== existingUser.id) {
      return NextResponse.json({
        success: false,
        message: await tApi('email.verifyFailed'),
      }, { status: 400 });
    }

    // Complete registration: set username, password, nickname, mark verified
    await completeUserRegistration(existingUser.id, username, password, nickname?.trim());

    // Create session and login
    const { ip, userAgent } = getRequestMetadata(request);
    const sessionId = await createSession(existingUser.id, ip, userAgent);
    await setSessionCookie(sessionId);
    await logAudit(existingUser.id, 'register', { username, email }, ip, userAgent, 'access');

    return NextResponse.json({
      success: true,
      user: {
        id: existingUser.id,
        username,
        email: existingUser.email,
        nickname: nickname?.trim() || username,
        role: existingUser.role,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    return internalError();
  }
}
