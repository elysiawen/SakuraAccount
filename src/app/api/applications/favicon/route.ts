import { NextRequest, NextResponse } from 'next/server';
import dns from 'dns/promises';

const FETCH_TIMEOUT = 5000;
const USER_AGENT = 'Mozilla/5.0 (compatible; SakuraAccount/1.0)';

function isValidDomain(domain: string): boolean {
  if (domain.length > 253 || domain.length < 1) return false;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(domain)) return false;
  if (domain === 'localhost' || domain.endsWith('.local') || domain.endsWith('.internal')) return false;
  if (domain === '169.254.169.254' || domain.endsWith('.169.254.169.254')) return false;
  if (domain.startsWith('[') || domain.includes(':')) return false;
  return /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/.test(domain);
}

function isPrivateIP(ip: string): boolean {
  if (ip.startsWith('10.')) return true;
  if (ip.startsWith('172.')) {
    const second = parseInt(ip.split('.')[1], 10);
    if (second >= 16 && second <= 31) return true;
  }
  if (ip.startsWith('192.168.')) return true;
  if (ip.startsWith('127.')) return true;
  if (ip === '169.254.169.254') return true;
  if (ip === '::1' || ip === 'fc00::' || ip === 'fe80::') return true;
  return false;
}

async function resolvesToPrivateIP(domain: string): Promise<boolean> {
  try {
    const addresses = await dns.resolve4(domain);
    return addresses.some(isPrivateIP);
  } catch {
    // If DNS resolution fails, allow the request to proceed (fetch will fail naturally)
    return false;
  }
}

async function tryFetchFavicon(url: string): Promise<Response | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
      headers: { 'User-Agent': USER_AGENT },
      redirect: 'error',
    });
    if (res.ok) {
      const contentLength = res.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > 1024 * 100) {
        return null;
      }
      const contentType = res.headers.get('content-type') || '';
      if (contentType.startsWith('image/') || url.endsWith('.ico')) {
        return res;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

export async function GET(request: NextRequest) {
  const domain = request.nextUrl.searchParams.get('domain');

  if (!domain || !isValidDomain(domain)) {
    return new NextResponse(null, { status: 404 });
  }

  // DNS rebinding protection: verify the domain doesn't resolve to a private IP
  if (await resolvesToPrivateIP(domain)) {
    return new NextResponse(null, { status: 404 });
  }

  // Strategy 1: direct favicon.ico
  const direct = await tryFetchFavicon(`https://${domain}/favicon.ico`);
  if (direct) {
    const buffer = await direct.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': direct.headers.get('content-type') || 'image/x-icon',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }

  // Strategy 2: Google Favicon Service
  const google = await tryFetchFavicon(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`);
  if (google) {
    const buffer = await google.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': google.headers.get('content-type') || 'image/png',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }

  return new NextResponse(null, { status: 404 });
}
