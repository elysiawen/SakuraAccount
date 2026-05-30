import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, RATE_LIMITS, getClientIp } from '@/lib/rate-limit';

// i18n support for middleware (Edge Runtime compatible)
const MESSAGES: Record<string, Record<string, string>> = {
  zh: {
    csrfFailed: 'CSRF 验证失败',
    rateLimitExceeded: '操作过于频繁，请 {seconds} 秒后重试',
  },
  en: {
    csrfFailed: 'CSRF verification failed',
    rateLimitExceeded: 'Too many requests, please retry in {seconds} seconds',
  },
};

function getMiddlewareLocale(request: NextRequest): string {
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  if (cookieLocale && MESSAGES[cookieLocale]) return cookieLocale;
  const acceptLanguage = request.headers.get('accept-language');
  if (acceptLanguage) {
    const preferred = acceptLanguage.split(',')[0]?.split('-')[0];
    if (preferred && MESSAGES[preferred]) return preferred;
  }
  return 'zh';
}

function tMiddleware(request: NextRequest, key: string, params?: Record<string, string | number>): string {
  const locale = getMiddlewareLocale(request);
  let msg = MESSAGES[locale]?.[key] || MESSAGES['zh']?.[key] || key;
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      msg = msg.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    });
  }
  return msg;
}

// Edge Runtime 中不能使用 api-response.ts，手动构造格式
function errorResponse(code: string, message: string, status: number, headers?: Record<string, string>) {
  return NextResponse.json(
    { code, message, timestamp: Math.floor(Date.now() / 1000) },
    { status, headers }
  );
}

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'DELETE', 'PATCH']);

function validateOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  if (!origin && !referer) {
    return false;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const allowedOrigins = [appUrl];

  if (process.env.WEBAUTHN_ORIGIN && process.env.WEBAUTHN_ORIGIN !== appUrl) {
    allowedOrigins.push(process.env.WEBAUTHN_ORIGIN);
  }

  if (origin) {
    return allowedOrigins.includes(origin);
  }

  if (referer) {
    try {
      const refererUrl = new URL(referer);
      return allowedOrigins.some(
        (allowed) => new URL(allowed).origin === refererUrl.origin
      );
    } catch {
      return false;
    }
  }

  return true;
}

function getCorsHeaders(request: NextRequest): Record<string, string> | null {
  const origin = request.headers.get('origin');
  if (!origin) return null;

  // OAuth2/OIDC public endpoints — allow any origin
  const { pathname } = request.nextUrl;
  const isOauthPublic =
    pathname.startsWith('/oauth/.well-known/') ||
    pathname === '/oauth/authorize' ||
    pathname === '/oauth/userinfo' ||
    pathname === '/oauth/token';

  if (isOauthPublic) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    };
  }

  return null;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle CORS preflight for OAuth2/OIDC endpoints
  if (request.method === 'OPTIONS' && pathname.startsWith('/oauth/')) {
    const corsHeaders = getCorsHeaders(request);
    if (corsHeaders) {
      return new NextResponse(null, { status: 204, headers: corsHeaders });
    }
  }

  const response = NextResponse.next();

  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }

  // Add CORS headers for OAuth2/OIDC endpoints
  const corsHeaders = getCorsHeaders(request);
  if (corsHeaders) {
    for (const [key, value] of Object.entries(corsHeaders)) {
      response.headers.set(key, value);
    }
  }

  if (
    pathname.startsWith('/api/') &&
    STATE_CHANGING_METHODS.has(request.method) &&
    !pathname.startsWith('/api/applications/token') &&
    !pathname.startsWith('/oauth/token')
  ) {
    if (!validateOrigin(request)) {
      return errorResponse('SYS_CSRF_FAILED', tMiddleware(request, 'csrfFailed'), 403);
    }
  }

  if (process.env.NODE_ENV === 'production') {
    const ip = getClientIp(request);

    if (pathname === '/api/auth/login' && request.method === 'POST') {
      const result = checkRateLimit(`login:${ip}`, RATE_LIMITS.LOGIN);
      if (!result.success) {
        return errorResponse(
          'SYS_RATE_LIMIT_EXCEEDED',
          tMiddleware(request, 'rateLimitExceeded', { seconds: result.retryAfter }),
          429,
          { 'Retry-After': String(result.retryAfter) }
        );
      }
    }

    if (pathname === '/api/auth/register' && request.method === 'POST') {
      const result = checkRateLimit(`register:${ip}`, RATE_LIMITS.REGISTER);
      if (!result.success) {
        return errorResponse(
          'SYS_RATE_LIMIT_EXCEEDED',
          tMiddleware(request, 'rateLimitExceeded', { seconds: result.retryAfter }),
          429,
          { 'Retry-After': String(result.retryAfter) }
        );
      }
    }

    if (pathname === '/api/auth/webauthn/login' && request.method === 'POST') {
      const result = checkRateLimit(`webauthn:${ip}`, RATE_LIMITS.WEBAUTHN);
      if (!result.success) {
        return errorResponse(
          'SYS_RATE_LIMIT_EXCEEDED',
          tMiddleware(request, 'rateLimitExceeded', { seconds: result.retryAfter }),
          429,
          { 'Retry-After': String(result.retryAfter) }
        );
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sakura.ico|.*\\.ico$|public/).*)',
  ],
};
