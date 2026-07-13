import { NextRequest, NextResponse } from 'next/server';
import { verifyEmailCode } from '@/lib/auth';
import { isValidEmail } from '@/lib/utils';
import { paramInvalid, internalError } from '@/lib/api-response';
import { tApi } from '@/i18n/api-i18n';

/**
 * POST /api/auth/verify-email/confirm
 * 提交验证码完成邮箱验证
 * Body: { email: string, code: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code } = body;

    if (!email || !isValidEmail(email) || !code) {
      return paramInvalid(await tApi('sys.paramInvalid'));
    }

    if (!/^\d{6}$/.test(code)) {
      return paramInvalid(await tApi('email.invalidCode'));
    }

    const userId = await verifyEmailCode(code, email);

    if (!userId) {
      return NextResponse.json({
        success: false,
        message: await tApi('email.verifyFailed'),
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: await tApi('email.verifySuccess'),
    });
  } catch (error) {
    console.error('Verify email code error:', error);
    return internalError();
  }
}
