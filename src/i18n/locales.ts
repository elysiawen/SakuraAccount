export const LOCALES = [
  { code: 'zh', label: '中文', flag: '🇨🇳', timezone: 'Asia/Shanghai' },
  { code: 'en', label: 'English', flag: '🇺🇸', timezone: 'America/New_York' },
] as const;

export type Locale = (typeof LOCALES)[number]['code'];
export const DEFAULT_LOCALE: Locale = 'zh';
export const localeCodes = LOCALES.map(l => l.code) as readonly Locale[];

export function isLocale(value: string): value is Locale {
  return localeCodes.some(code => code.toLowerCase() === value.toLowerCase());
}

export function normalizeLocale(value: string): Locale | undefined {
  return localeCodes.find(code => code.toLowerCase() === value.toLowerCase());
}

export function getTimezone(locale: Locale): string {
  return LOCALES.find(l => l.code === locale)?.timezone ?? 'Asia/Shanghai';
}
