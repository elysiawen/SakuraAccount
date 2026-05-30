import { NextRequest, NextResponse } from 'next/server';
import { getUserSessions, deleteSession, deleteUserSessions, createSession, setSessionCookie, sessionBelongsToUser, getRequestMetadata, logAudit } from '@/lib/auth';
import { requireAuthenticatedUser } from '@/lib/require-session';
import { sessionListFailed, sessionCannotRevokeCurrent, sessionNotFound, sessionIdRequired, internalError } from '@/lib/api-response';
import { tApi } from '@/i18n/api-i18n';

export async function GET() {
  try {
    const result = await requireAuthenticatedUser();
    if ('error' in result) return result.error;

    const sessions = await getUserSessions(result.user.id);
    return NextResponse.json({ sessions, currentSessionId: result.sessionId });
  } catch (error) {
    console.error('Sessions error:', error);
    return sessionListFailed();
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const result = await requireAuthenticatedUser();
    if ('error' in result) return result.error;
    const { user, sessionId } = result;

    const { searchParams } = new URL(request.url);
    const targetSessionId = searchParams.get('id');
    const revokeAll = searchParams.get('all') === 'true';
    const { ip, userAgent } = getRequestMetadata(request);

    if (revokeAll) {
      await deleteUserSessions(user.id);
      const newSessionId = await createSession(user.id, ip, userAgent);
      await setSessionCookie(newSessionId);
      await logAudit(user.id, 'sessions_revoked_all', {}, ip, userAgent, 'operation');
      return NextResponse.json({ success: true });
    }

    if (targetSessionId) {
      if (targetSessionId === sessionId) {
        return sessionCannotRevokeCurrent();
      }

      const isOwner = await sessionBelongsToUser(targetSessionId, user.id);
      if (!isOwner) {
        return sessionNotFound();
      }

      await deleteSession(targetSessionId);
      await logAudit(user.id, 'session_revoked', { sessionId: targetSessionId }, ip, userAgent, 'operation');
      return NextResponse.json({ success: true });
    }

    return sessionIdRequired();
  } catch (error) {
    console.error('Delete session error:', error);
    return internalError(await tApi('session.revokeFailed'));
  }
}
