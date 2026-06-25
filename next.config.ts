import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

function getCspScriptSrc(): string {
  const sources = ["'self'", "'unsafe-inline'", "'unsafe-eval'"];
  if (process.env.UMAMI_SCRIPT_URL) sources.push(new URL(process.env.UMAMI_SCRIPT_URL).origin);
  if (process.env.GOOGLE_ANALYTICS_ID) sources.push('https://www.googletagmanager.com');
  if (process.env.CLARITY_ID) sources.push('https://www.clarity.ms');
  return `script-src ${sources.join(' ')}`;
}

function getCspConnectSrc(): string {
  const sources = ["'self'"];
  if (process.env.UMAMI_SCRIPT_URL) sources.push(new URL(process.env.UMAMI_SCRIPT_URL).origin);
  if (process.env.GOOGLE_ANALYTICS_ID) sources.push('https://www.google-analytics.com');
  return `connect-src ${sources.join(' ')}`;
}

const securityHeaders = [
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      getCspScriptSrc(),
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      getCspConnectSrc(),
      "frame-ancestors 'none'",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
