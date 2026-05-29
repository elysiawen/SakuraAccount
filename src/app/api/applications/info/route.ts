import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/oauth2';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('id');

    if (!clientId) {
      return NextResponse.json({ error: 'missing_id' }, { status: 400 });
    }

    const client = await getClient(clientId);
    if (!client) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    return NextResponse.json({
      client: {
        name: client.name,
        description: client.description,
      },
    });
  } catch (error) {
    console.error('App info error:', error);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
