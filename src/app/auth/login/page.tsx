import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/require-session';
import LoginClient from './login-client';

type SearchParamValue = string | string[] | undefined;

function getSingleParam(value: SearchParamValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage(props: {
  searchParams: Promise<Record<string, SearchParamValue>>;
}) {
  const searchParams = await props.searchParams;
  const callbackUrl = getSingleParam(searchParams.callbackUrl);
  const reauth = getSingleParam(searchParams.reauth) === '1';

  if (!reauth) {
    const user = await requireSession();
    if (user) {
      redirect(callbackUrl || '/dashboard');
    }
  }

  return <LoginClient callbackUrl={callbackUrl} />;
}
