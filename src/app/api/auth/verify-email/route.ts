import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, createPendingUser, createEmailVerificationCode } from '@/lib/auth';
import { sendEmail } from '@/lib/email';
import { emailVerificationTemplate } from '@/lib/email-templates';
import { isValidEmail } from '@/lib/utils';
import { paramInvalid, internalError, authUsernameExists } from '@/lib/api-response';
import { tApi } from '@/i18n/api-i18n';

/**
 * POST /api/auth/verify-email
 * 发送邮箱验证码（支持已登录和未登录用户）
 * Body: { email: string, registration?: boolean }  // registration=true 时允许未注册邮箱
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, registration } = body;

    if (!email || !isValidEmail(email)) {
      return paramInvalid(await tApi('sys.paramInvalid'));
    }

    // Check if user exists
    const existingUser = await getUserByEmail(email);

    if (existingUser) {
      // Email already registered
      if (existingUser.email_verified && registration) {
        // For registration flow, don't allow re-registration
        return authUsernameExists();
      }
      if (existingUser.email_verified) {
        return NextResponse.json({
          success: true,
          message: await tApi('email.alreadyVerified'),
        });
      }

      // Unverified existing user (pending registration) - send new code
      const code = await createEmailVerificationCode(existingUser.id);
      const expiryMinutes = Math.floor(parseInt(process.env.EMAIL_VERIFICATION_EXPIRY || '600') / 60);
      const { subject, html } = emailVerificationTemplate(code, expiryMinutes);
      const result = await sendEmail({ to: email, subject, html });
      if (!result.success) return internalError(await tApi('email.sendFailed'));

      return NextResponse.json({
        success: true,
        message: await tApi('email.verificationSent'),
      });
    }

    // No existing user - create a pending user for registration flow
    if (registration) {
      const pendingUser = await createPendingUser(email);
      const code = await createEmailVerificationCode(pendingUser.id);
      const expiryMinutes = Math.floor(parseInt(process.env.EMAIL_VERIFICATION_EXPIRY || '600') / 60);
      const { subject, html } = emailVerificationTemplate(code, expiryMinutes);
      const result = await sendEmail({ to: email, subject, html });
      if (!result.success) return internalError(await tApi('email.sendFailed'));

      return NextResponse.json({
        success: true,
        message: await tApi('email.verificationSent'),
      });
    }

    // Forward to session-based send (existing logic for logged-in users)
    const { requireSession } = await import('@/lib/require-session');
    const user = await requireSession(request);
    if (user && !existingUser) {
      return NextResponse.json({ success: false, message: await tApi('sys.resourceNotFound') }, { status: 404 });
    }

    // For non-registration, unregistered email: return gracefully to prevent enumeration
    return NextResponse.json({
      success: true,
      message: await tApi('email.verificationSent'),
    });
  } catch (error) {
    console.error('Send verification email error:', error);
    return internalError();
  }
}
