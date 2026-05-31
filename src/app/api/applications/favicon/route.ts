import { NextRequest, NextResponse } from 'next/server';
import dns from 'dns/promises';

const FETCH_TIMEOUT = 5000;
const USER_AGENT = 'Mozilla/5.0 (compatible; SakuraAccount/1.0)';

// MIME types commonly used for favicons
const FAVICON_MIME_TYPES = [
  'image/x-icon',
  'image/vnd.microsoft.icon',
  'image/ico',
  'image/icon',
  'image/png',
  'image/svg+xml',
  'image/jpeg',
  'image/webp',
  'image/gif',
];

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

function isValidFaviconResponse(res: Response, url: string): boolean {
  const contentLength = res.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > 1024 * 100) {
    return false;
  }
  const contentType = res.headers.get('content-type') || '';
  // Accept any common image MIME type or .ico suffix
  return FAVICON_MIME_TYPES.some((mime) => contentType.startsWith(mime)) || url.endsWith('.ico');
}

async function tryFetchFavicon(url: string, followRedirect = true): Promise<Response | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'image/avif,image/webp,image/png,image/svg+xml,image/*;q=0.8,*/*;q=0.5',
      },
      redirect: followRedirect ? 'follow' : 'manual',
    });
    if ((res.ok || (!followRedirect && res.status >= 300 && res.status < 400))
        && isValidFaviconResponse(res, url)) {
      return res;
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Parse HTML to extract favicon URLs from <link> tags.
 * Looks for rel="icon", rel="shortcut icon", rel="apple-touch-icon", etc.
 */
function extractFaviconUrls(html: string, baseUrl: string): string[] {
  const urls: string[] = [];

  // Match <link ... rel="icon" ... href="..."> or <link ... rel="shortcut icon" ...>
  const linkRegex = /<link[^>]+rel=["']?(?:shortcut\s+)?icon["']?[^>]*>/gi;
  const hrefRegex = /href=["']([^"']+)["']/i;

  const matches = html.match(linkRegex);
  if (matches) {
    for (const tag of matches) {
      const hrefMatch = tag.match(hrefRegex);
      if (hrefMatch && hrefMatch[1]) {
        const href = hrefMatch[1].trim();
        try {
          const absolute = new URL(href, baseUrl).toString();
          urls.push(absolute);
        } catch {
          // ignore invalid URLs
        }
      }
    }
  }

  // Also try common paths if no <link> tags found
  if (urls.length === 0) {
    urls.push(new URL('/favicon.ico', baseUrl).toString());
    urls.push(new URL('/favicon.png', baseUrl).toString());
    urls.push(new URL('/favicon.svg', baseUrl).toString());
  }

  return urls;
}

/**
 * Attempt to scrape the website HTML for <link rel="icon"> tags.
 */
async function scrapeFaviconFromHtml(domain: string): Promise<Response | null> {
  try {
    const htmlRes = await fetch(`https://${domain}/`, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });
    if (!htmlRes.ok) return null;

    const html = await htmlRes.text();
    const baseUrl = `https://${domain}/`;
    const faviconUrls = extractFaviconUrls(html, baseUrl);

    // Try each extracted URL (at most 3)
    for (const faviconUrl of faviconUrls.slice(0, 3)) {
      const res = await tryFetchFavicon(faviconUrl, true);
      if (res) return res;
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

  // Strategy 1: Try direct /favicon.ico with redirect following
  const direct = await tryFetchFavicon(`https://${domain}/favicon.ico`, true);
  if (direct) {
    const body = direct.body;
    const contentType = direct.headers.get('content-type') || 'image/x-icon';
    return new NextResponse(body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }

  // Strategy 2: Try common alternative paths
  const altPaths = ['/favicon.png', '/favicon.svg', '/favicon-32x32.png', '/apple-touch-icon.png'];
  for (const path of altPaths) {
    const alt = await tryFetchFavicon(`https://${domain}${path}`, true);
    if (alt) {
      return new NextResponse(alt.body, {
        headers: {
          'Content-Type': alt.headers.get('content-type') || 'image/png',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }
  }

  // Strategy 3: Parse HTML <link> tags to find the icon
  const scraped = await scrapeFaviconFromHtml(domain);
  if (scraped) {
    return new NextResponse(scraped.body, {
      headers: {
        'Content-Type': scraped.headers.get('content-type') || 'image/x-icon',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }

  // Strategy 4: Third-party favicon services
  const fallbackServices = [
    `https://icons.duckduckgo.com/ip2/${encodeURIComponent(domain)}.ico`,
    `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`,
  ];
  for (const serviceUrl of fallbackServices) {
    const fb = await tryFetchFavicon(serviceUrl, true);
    if (fb) {
      return new NextResponse(fb.body, {
        headers: {
          'Content-Type': fb.headers.get('content-type') || 'image/png',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }
  }

  return new NextResponse(null, { status: 404 });
}
