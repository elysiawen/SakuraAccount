/** Session cookie name used across auth flows */
export const SESSION_COOKIE_NAME = 'account_session';

/** Maximum avatar file size: 10MB */
export const MAX_AVATAR_SIZE = 10 * 1024 * 1024;

/** Maximum application icon file size: 2MB */
export const MAX_ICON_SIZE = 2 * 1024 * 1024;

/** Sentinel value meaning "use the default (letter) icon" */
export const DEFAULT_ICON = 'default';

/** Application brand name */
export const BRAND_NAME = 'Sakura Account';

/** Login page path */
export const LOGIN_PATH = '/auth/login';

/** Common JSON request headers for fetch calls */
export const JSON_HEADERS = { 'Content-Type': 'application/json' };

/** Default pagination page size */
export const DEFAULT_PAGE_SIZE = 10;
