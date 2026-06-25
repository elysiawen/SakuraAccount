import { headers, cookies } from 'next/headers';
import { type Locale } from '@/i18n/locales';
import { resolveLocale } from '@/i18n/locale-resolver';

interface MessageDictionary {
  [key: string]: string | MessageDictionary;
}

const messagesCache: Record<string, MessageDictionary> = {};

async function loadMessages(locale: Locale) {
  if (!messagesCache[locale]) {
    messagesCache[locale] = (await import(`../messages/${locale}/api.json`)).default;
  }
  return messagesCache[locale];
}

export async function getApiLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const headersList = await headers();
  return resolveLocale(cookieStore, headersList);
}

export async function tApi(key: string, locale?: Locale, params?: Record<string, string | number>): Promise<string> {
  const resolvedLocale = locale || await getApiLocale();
  const messages = await loadMessages(resolvedLocale);
  const keys = key.split('.');
  let result: string | MessageDictionary | undefined = messages;
  for (const k of keys) {
    result = typeof result === 'object' ? result[k] : undefined;
  }
  if (typeof result !== 'string') return key;
  if (params) {
    return Object.entries(params).reduce(
      (str, [k, v]) => str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v)),
      result
    );
  }
  return result;
}
