import { NextRequest, NextResponse } from 'next/server';
import { getAuditLogs } from '@/lib/auth';
import { requireAdmin } from '@/lib/require-session';
import { adminAuditLogFailed } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const result = await requireAdmin();
    if ('error' in result) return result.error;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const category = searchParams.get('category') || undefined;
    const search = searchParams.get('search') || undefined;

    const data = await getAuditLogs(page, limit, category, search);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Admin audit logs error:', error);
    return adminAuditLogFailed();
  }
}
