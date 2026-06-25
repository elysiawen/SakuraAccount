import { type Locale, DEFAULT_LOCALE, isLocale, normalizeLocale } from './locales';

interface CookieStore {
  get(name: string): { value: string } | undefined;
}

interface HeadersLike {
  get(name: string): string | null;
}

/**
 * Unified locale resolution logic.
 * Priority: cookie > Accept-Language header (full match) > Accept-Language base > default.
 */
export async function resolveLocale(
  cookieStore: CookieStore,
  headersList: HeadersLike
): Promise<Locale> {
  // 1. Cookie
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;
  if (cookieLocale && isLocale(cookieLocale)) {
    return normalizeLocale(cookieLocale) ?? DEFAULT_LOCALE;
  }

  // 2. Accept-Language header
  const acceptLanguage = headersList.get('accept-language');
  if (acceptLanguage) {
    const candidates = acceptLanguage
      .split(',')
      .map(part => part.split(';')[0].trim());

    for (const candidate of candidates) {
      // Try full match (e.g. "zh-CN" → "zh")
      const fullMatch = normalizeLocale(candidate);
      if (fullMatch) return fullMatch;

      // Try base language (e.g. "en-US" → "en")
      const base = candidate.split('-')[0];
      const baseMatch = normalizeLocale(base);
      if (baseMatch) return baseMatch;
    }
  }

  return DEFAULT_LOCALE;
}

/**
 * Simplified locale resolution for Edge Runtime (middleware).
 * Uses the same logic but with direct request access.
 */
export function resolveLocaleFromRequest(request: { cookies: { get(name: string): { value: string } | undefined }; headers: { get(name: string): string | null } }): Locale {
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  if (cookieLocale && isLocale(cookieLocale)) {
    return normalizeLocale(cookieLocale) ?? DEFAULT_LOCALE;
  }

  const acceptLanguage = request.headers.get('accept-language');
  if (acceptLanguage) {
    const candidates = acceptLanguage
      .split(',')
      .map(part => part.split(';')[0].trim());

    for (const candidate of candidates) {
      const fullMatch = normalizeLocale(candidate);
      if (fullMatch) return fullMatch;

      const base = candidate.split('-')[0];
      const baseMatch = normalizeLocale(base);
      if (baseMatch) return baseMatch;
    }
  }

  return DEFAULT_LOCALE;
}
