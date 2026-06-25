import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import { type Locale, DEFAULT_LOCALE, isLocale, normalizeLocale, getTimezone } from './locales';

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const headersList = await headers();

  let locale: Locale = DEFAULT_LOCALE;

  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;
  if (cookieLocale && isLocale(cookieLocale)) {
    locale = normalizeLocale(cookieLocale) ?? DEFAULT_LOCALE;
  } else {
    const acceptLanguage = headersList.get('accept-language');
    if (acceptLanguage) {
      const candidates = acceptLanguage
        .split(',')
        .map(part => part.split(';')[0].trim());
      for (const candidate of candidates) {
        const fullMatch = normalizeLocale(candidate);
        if (fullMatch) {
          locale = fullMatch;
          break;
        }
        const base = candidate.split('-')[0];
        const baseMatch = normalizeLocale(base);
        if (baseMatch) {
          locale = baseMatch;
          break;
        }
      }
    }
  }

  return {
    locale,
    timeZone: getTimezone(locale),
    messages: {
      common: (await import(`../messages/${locale}/common.json`)).default,
      auth: (await import(`../messages/${locale}/auth.json`)).default,
      dashboard: (await import(`../messages/${locale}/dashboard.json`)).default,
      admin: (await import(`../messages/${locale}/admin.json`)).default,
      errors: (await import(`../messages/${locale}/errors.json`)).default,
      api: (await import(`../messages/${locale}/api.json`)).default,
      apps: (await import(`../messages/${locale}/apps.json`)).default,
      docs: (await import(`../messages/${locale}/docs.json`)).default,
      account: (await import(`../messages/${locale}/account.json`)).default,
    },
  };
});
