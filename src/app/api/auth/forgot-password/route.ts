import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, createPasswordResetToken } from '@/lib/auth';
import { sendEmail } from '@/lib/email';
import { passwordResetTemplate } from '@/lib/email-templates';
import { isValidEmail } from '@/lib/utils';
import { paramInvalid, internalError } from '@/lib/api-response';
import { tApi } from '@/i18n/api-i18n';

/**
 * POST /api/auth/forgot-password
 * 发送密码重置邮件
 * Body: { email: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || !isValidEmail(email)) {
      return paramInvalid(await tApi('sys.paramInvalid'));
    }

    const user = await getUserByEmail(email);
    if (!user) {
      // 为防止用户枚举，即使用户不存在也返回成功
      return NextResponse.json({
        success: true,
        message: await tApi('email.resetPasswordSent'),
      });
    }

    // 生成重置 Token
    const token = await createPasswordResetToken(user.id);

    // 发送重置邮件
    const expiryMinutes = Math.floor(parseInt(process.env.PASSWORD_RESET_EXPIRY || '1800') / 60);
    const { subject, html } = passwordResetTemplate(token, user.username, expiryMinutes);
    const result = await sendEmail({ to: email, subject, html });

    if (!result.success) {
      return internalError(await tApi('email.sendFailed'));
    }

    return NextResponse.json({
      success: true,
      message: await tApi('email.resetPasswordSent'),
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return internalError();
  }
}
