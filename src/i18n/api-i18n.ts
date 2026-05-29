import { headers, cookies } from 'next/headers';
import { type Locale, localeCodes, DEFAULT_LOCALE, isLocale } from '@/i18n/locales';

const messagesCache: Record<string, any> = {};

async function loadMessages(locale: Locale) {
  if (!messagesCache[locale]) {
    messagesCache[locale] = (await import(`../messages/${locale}/api.json`)).default;
  }
  return messagesCache[locale];
}

export async function getApiLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;
  if (cookieLocale && isLocale(cookieLocale)) {
    return cookieLocale as Locale;
  }

  const headersList = await headers();
  const acceptLanguage = headersList.get('accept-language');
  if (acceptLanguage) {
    const preferred = acceptLanguage.split(',')[0]?.split('-')[0];
    if (preferred && isLocale(preferred)) {
      return preferred as Locale;
    }
  }
  return DEFAULT_LOCALE;
}

export async function tApi(key: string, locale?: Locale, params?: Record<string, string | number>): Promise<string> {
  const resolvedLocale = locale || await getApiLocale();
  const messages = await loadMessages(resolvedLocale);
  const keys = key.split('.');
  let result: any = messages;
  for (const k of keys) {
    result = result?.[k];
  }
  if (!result) return key;
  if (params) {
    return Object.entries(params).reduce(
      (str, [k, v]) => str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v)),
      result as string
    );
  }
  return result;
}
