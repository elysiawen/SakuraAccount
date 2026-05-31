import { notFound } from 'next/navigation';
import { getClientByNanoId } from '@/lib/oauth2';
import ApplicationDetail from '@/components/ApplicationDetail';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ApplicationDetailPage({ params }: PageProps) {
  const { id } = await params;
  const client = await getClientByNanoId(id);

  if (!client) {
    notFound();
  }

  const appUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
  return <ApplicationDetail client={client} appUrl={appUrl} />;
}
