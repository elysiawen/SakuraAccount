import { NextRequest, NextResponse } from 'next/server';
import { getRequestMetadata, getSession } from '@/lib/auth';
import { cookies } from 'next/headers';
import { internalError } from '@/lib/api-response';
import { SESSION_COOKIE_NAME } from '@/lib/constants';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionId) {
      return NextResponse.json({ user: null });
    }

    const { ip } = getRequestMetadata(request);
    const user = await getSession(sessionId, ip);

    if (!user) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Session error:', error);
    return internalError();
  }
}
