import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/require-session';
import RegisterClient from './register-client';

export default async function RegisterPage() {
  const user = await requireSession();

  if (user) {
    redirect('/dashboard');
  }

  return <RegisterClient />;
}
