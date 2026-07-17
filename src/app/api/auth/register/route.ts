import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserByEmail, getUserByUsername, verifyPendingCode, createSession, setSessionCookie, getRequestMetadata, logAudit } from '@/lib/auth';
import { db } from '@/lib/db';
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

    // Check username already taken
    const existingUsername = await getUserByUsername(username);
    if (existingUsername) {
      return authUsernameExists();
    }

    // Check email already registered (as completed user)
    const existingUser = await getUserByEmail(email);
    if (existingUser && existingUser.password_hash) {
      return authUsernameExists();
    }

    // Clean up legacy pending user from old flow (no password = incomplete registration)
    if (existingUser && !existingUser.password_hash) {
      await db.execute('DELETE FROM email_verifications WHERE user_id = ?', [existingUser.id]);
      await db.execute('DELETE FROM users WHERE id = ?', [existingUser.id]);
    }

    // Check if email verification is required
    const requireVerification = await db.getGlobalConfigValue('require_email_verification');
    const needVerification = requireVerification !== false; // default true (enabled)

    // Verify the pending code (skip if verification is disabled)
    if (needVerification) {
      if (!code || !/^\d{6}$/.test(code)) {
        return paramInvalid(await tApi('email.invalidCode'));
      }
      const verified = await verifyPendingCode(code, email);
      if (!verified) {
        return NextResponse.json({
          success: false,
          message: await tApi('email.verifyFailed'),
        }, { status: 400 });
      }
    }

    // Create user. If verification is disabled, email_verified stays false (default)
    const user = await createUser(username, email, password, nickname?.trim());
    if (needVerification) {
      await db.execute('UPDATE users SET email_verified = TRUE WHERE id = ?', [user.id]);
    }

    // Create session and login
    const { ip, userAgent } = getRequestMetadata(request);
    const sessionId = await createSession(user.id, ip, userAgent);
    await setSessionCookie(sessionId);
    await logAudit(user.id, 'register', { username, email }, ip, userAgent, 'access');

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username,
        email,
        nickname: nickname?.trim() || username,
        role: user.role,
        emailVerified: needVerification,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    return internalError();
  }
}
