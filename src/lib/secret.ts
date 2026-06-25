const APP_SECRET = process.env.APP_SECRET;
if (!APP_SECRET) {
  throw new Error('FATAL: APP_SECRET environment variable is required. Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
}
export const SECRET = new TextEncoder().encode(APP_SECRET);
