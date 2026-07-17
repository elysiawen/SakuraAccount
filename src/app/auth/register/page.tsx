import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/require-session';
import { db } from '@/lib/db';
import { isEmailConfigured } from '@/lib/email';
import RegisterClient from './register-client';

export default async function RegisterPage() {
  const user = await requireSession();

  if (user) {
    redirect('/dashboard');
  }

  // Only allow verification if SMTP is configured AND setting is enabled
  const requireEmailVerification = await db.getGlobalConfigValue('require_email_verification');
  const needVerification = isEmailConfigured() && requireEmailVerification !== false;

  return <RegisterClient requireCode={needVerification} />;
}
