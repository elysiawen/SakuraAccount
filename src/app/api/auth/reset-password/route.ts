import { NextRequest, NextResponse } from 'next/server';
import { verifyPasswordResetToken, getUserById, updateUserPassword, deleteUserSessions, logAudit, getRequestMetadata, createSession, setSessionCookie } from '@/lib/auth';
import { sendEmail } from '@/lib/email';
import { passwordChangedTemplate } from '@/lib/email-templates';
import { validatePassword, VALIDATION_KEY_MAP } from '@/lib/utils';
import { paramInvalid, internalError } from '@/lib/api-response';
import { tApi } from '@/i18n/api-i18n';

async function translateValidationKey(key: string): Promise<string> {
  const mapped = VALIDATION_KEY_MAP[key];
  if (mapped) return tApi(mapped);
  return key;
}

/**
 * POST /api/auth/reset-password
 * 重置密码
 * Body: { token: string, password: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = body;

    if (!token || !password) {
      return paramInvalid(await tApi('sys.paramInvalid'));
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json({
        code: 'AUTH_WEAK_PASSWORD',
        message: await translateValidationKey(passwordError),
      }, { status: 400 });
    }

    // 验证 Token
    const userId = await verifyPasswordResetToken(token);
    if (!userId) {
      return NextResponse.json({
        success: false,
        message: await tApi('email.resetTokenInvalid'),
      }, { status: 400 });
    }

    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json({
        success: false,
        message: await tApi('auth.userNotFound'),
      }, { status: 404 });
    }

    // 更新密码
    await updateUserPassword(userId, password);

    // 清除所有会话（安全措施）
    await deleteUserSessions(userId);

    const { ip, userAgent } = getRequestMetadata(request);
    await logAudit(userId, 'password_reset', { method: 'email' }, ip, userAgent, 'access');

    // 发送密码修改通知
    const { subject, html } = passwordChangedTemplate(user.username);
    sendEmail({ to: user.email, subject, html }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: await tApi('email.resetPasswordSuccess'),
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return internalError();
  }
}
