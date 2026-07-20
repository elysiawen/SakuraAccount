import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/require-session';
import { db } from '@/lib/db';
import { internalError } from '@/lib/api-response';

interface PendingCode {
  id: number;
  email: string;
  expires_at: string;
  created_at: string;
  [key: string]: unknown;
}

export async function GET() {
  try {
    const result = await requireAdmin();
    if ('error' in result) return result.error;

    const rows = await db.query<PendingCode>(
      'SELECT id, email, expires_at, created_at FROM pending_codes ORDER BY created_at DESC'
    );

    return NextResponse.json({ codes: rows });
  } catch (error) {
    console.error('List pending codes error:', error);
    return internalError();
  }
}

export async function DELETE() {
  try {
    const result = await requireAdmin();
    if ('error' in result) return result.error;

    // Clean up expired codes
    await db.execute('DELETE FROM pending_codes WHERE expires_at <= NOW()');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Clean pending codes error:', error);
    return internalError();
  }
}
