import { NextRequest, NextResponse } from 'next/server';
import { getSession, getAuditLogs } from '@/lib/auth';
import { cookies } from 'next/headers';

async function requireAdmin() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('account_session')?.value;

  if (!sessionId) return null;

  const user = await getSession(sessionId);
  if (!user || user.role !== 'admin') return null;

  return user;
}

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const result = await getAuditLogs(page, limit);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Admin audit logs error:', error);
    return NextResponse.json({ error: '获取审计日志失败' }, { status: 500 });
  }
}
