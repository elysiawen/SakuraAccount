import { NextRequest, NextResponse } from 'next/server';
import { getAllSessions, deleteSession, logAudit, getRequestMetadata } from '@/lib/auth';
import { requireAdmin } from '@/lib/require-session';
import { internalError } from '@/lib/api-response';
import { tApi } from '@/i18n/api-i18n';

export async function GET(request: NextRequest) {
  try {
    const result = await requireAdmin();
    if ('error' in result) return result.error;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';

    const data = await getAllSessions(page, limit, search || undefined);
    return NextResponse.json({ ...data, currentSessionId: result.sessionId });
  } catch (e) {
    console.error('Admin sessions list error:', e);
    return internalError(await tApi('session.listFailed'));
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const result = await requireAdmin();
    if ('error' in result) return result.error;

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('id');

    if (!sessionId) {
      return NextResponse.json({ message: 'Session ID required' }, { status: 400 });
    }

    if (sessionId === result.sessionId) {
      return NextResponse.json({ message: 'Cannot revoke own session' }, { status: 400 });
    }

    const { ip, userAgent } = getRequestMetadata(request);
    await deleteSession(sessionId);
    await logAudit(result.user.id, 'admin_revoke_session', { sessionId }, ip, userAgent, 'operation');

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Admin revoke session error:', e);
    return internalError(await tApi('session.revokeFailed'));
  }
}
