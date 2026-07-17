import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/require-session';
import { isEmailConfigured } from '@/lib/email';
import ForgotPasswordClient from './forgot-password-client';

export default async function ForgotPasswordPage() {
  const user = await requireSession();
  if (user) redirect('/dashboard');
  if (!isEmailConfigured()) redirect('/auth/login');
  return <ForgotPasswordClient />;
}
