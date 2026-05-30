import { NextRequest, NextResponse } from 'next/server';
import { cleanupAuditLogs } from '@/lib/auth';
import { requireAdmin } from '@/lib/require-session';
import { adminAuditLogFailed } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    const result = await requireAdmin();
    if ('error' in result) return result.error;

    const { days, categories } = await request.json();
    const retentionDays = parseInt(days);

    if (isNaN(retentionDays) || retentionDays < 0) {
      return NextResponse.json({ error: 'Invalid retention days' }, { status: 400 });
    }

    const { deleted } = await cleanupAuditLogs(retentionDays, categories);
    return NextResponse.json({ success: true, deleted });
  } catch (error) {
    console.error('Admin audit log cleanup error:', error);
    return adminAuditLogFailed();
  }
}
