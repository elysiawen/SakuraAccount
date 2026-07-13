import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/require-session';
import ResetPasswordClient from './reset-password-client';

type SearchParamValue = string | string[] | undefined;

function getSingleParam(value: SearchParamValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ResetPasswordPage(props: {
  searchParams: Promise<Record<string, SearchParamValue>>;
}) {
  const searchParams = await props.searchParams;
  const token = getSingleParam(searchParams.token);

  const user = await requireSession();
  if (user) redirect('/dashboard');

  return <ResetPasswordClient token={token} />;
}
