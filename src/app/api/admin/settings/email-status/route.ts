import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/require-session';
import { isEmailConfigured } from '@/lib/email';
import { internalError } from '@/lib/api-response';
import { tApi } from '@/i18n/api-i18n';

export async function GET() {
  try {
    const result = await requireAdmin();
    if ('error' in result) return result.error;

    return NextResponse.json({
      configured: isEmailConfigured(),
    });
  } catch (error) {
    console.error('Email status error:', error);
    return internalError(await tApi('sys.internalError'));
  }
}
