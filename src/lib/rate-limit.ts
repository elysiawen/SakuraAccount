interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}

export interface RateLimitConfig {
  limit: number;
  windowSeconds: number;
}

export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): { success: true } | { success: false; retryAfter: number } {
  cleanup();

  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + config.windowSeconds * 1000 });
    return { success: true };
  }

  if (entry.count >= config.limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { success: false, retryAfter };
  }

  entry.count++;
  return { success: true };
}

export const RATE_LIMITS = {
  LOGIN: { limit: 5, windowSeconds: 900 },
  REGISTER: { limit: 3, windowSeconds: 900 },
  WEBAUTHN: { limit: 10, windowSeconds: 900 },
  GENERAL: { limit: 60, windowSeconds: 60 },
} as const;

export function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}
