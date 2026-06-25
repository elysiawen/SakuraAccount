import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import { getTimezone } from './locales';
import { resolveLocale } from './locale-resolver';

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const headersList = await headers();

  const locale = await resolveLocale(cookieStore, headersList);

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
