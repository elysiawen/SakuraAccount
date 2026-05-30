import { NextRequest, NextResponse } from 'next/server';
import { logAudit, getRequestMetadata, getSession } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('account_session')?.value;

    if (!sessionId) {
      return NextResponse.json({ ok: true });
    }

    const { ip, userAgent } = getRequestMetadata(request);
    const user = await getSession(sessionId, ip);

    if (!user) {
      return NextResponse.json({ ok: true });
    }

    const body = await request.json();
    const { path } = body;

    if (!path || typeof path !== 'string') {
      return NextResponse.json({ ok: true });
    }

    // Only log meaningful page paths
    const allowedPrefixes = ['/dashboard', '/admin', '/oauth/authorize'];
    if (!allowedPrefixes.some(prefix => path.startsWith(prefix))) {
      return NextResponse.json({ ok: true });
    }

    await logAudit(user.id, 'page_visit', { path }, ip, userAgent, 'access');

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
