'use client';

import { useTranslations } from 'next-intl';

/**
 * Shared hook for translating error/message keys returned by API routes.
 * API routes return error codes like 'AUTH_LOGIN_FAILED', 'USER_NOT_FOUND', etc.
 * This hook translates them to the current locale, with fallback to the raw key.
 */
export function useErrors() {
  const tAuth = useTranslations('errors.auth');
  const tUser = useTranslations('errors.user');
  const tSession = useTranslations('errors.session');
  const tPasskey = useTranslations('errors.passkey');
  const tAdmin = useTranslations('errors.admin');
  const tApp = useTranslations('errors.app');
  const tToken = useTranslations('errors.token');
  const tSys = useTranslations('errors.sys');

  const namespaces = [tAuth, tUser, tSession, tPasskey, tAdmin, tApp, tToken, tSys];

  return (key: string): string => {
    if (!key) return key;
    for (const t of namespaces) {
      try {
        const translated = t(key);
        if (translated !== key) return translated;
      } catch {
        // key not in this namespace, try next
      }
    }
    return key;
  };
}
