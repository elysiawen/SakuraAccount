import { notFound } from 'next/navigation';
import { getClientByNanoId } from '@/lib/oauth2';
import ApplicationDetail from './application-detail';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ApplicationDetailPage({ params }: PageProps) {
  const { id } = await params;
  const client = await getClientByNanoId(id);

  if (!client) {
    notFound();
  }

  return <ApplicationDetail client={client} />;
}
