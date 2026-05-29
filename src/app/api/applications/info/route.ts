import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/oauth2';
import { appClientIdRequired, appNotFound, internalError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('id');

    if (!clientId) {
      return appClientIdRequired();
    }

    const client = await getClient(clientId);
    if (!client) {
      return appNotFound();
    }

    return NextResponse.json({
      client: {
        name: client.name,
        description: client.description,
        icon: client.icon,
        appUrl: client.appUrl,
        redirectUris: client.redirectUris,
      },
    });
  } catch (error) {
    console.error('App info error:', error);
    return internalError();
  }
}
