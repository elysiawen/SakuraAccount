import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/require-session';
import ForgotPasswordClient from './forgot-password-client';

export default async function ForgotPasswordPage() {
  const user = await requireSession();
  if (user) redirect('/dashboard');
  return <ForgotPasswordClient />;
}
