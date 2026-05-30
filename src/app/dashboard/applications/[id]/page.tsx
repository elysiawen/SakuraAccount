import { notFound } from 'next/navigation';
import { getClientByNanoId } from '@/lib/oauth2';
import { requireSession } from '@/lib/require-session';
import ApplicationDetail from '@/components/ApplicationDetail';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function UserApplicationDetailPage({ params }: PageProps) {
  const { id } = await params;
  const user = await requireSession();

  if (!user || !['admin', 'developer'].includes(user.role)) {
    notFound();
  }

  const client = await getClientByNanoId(id);

  if (!client) {
    notFound();
  }

  // Non-admin users can only view their own apps
  if (user.role !== 'admin' && client.userId !== user.id) {
    notFound();
  }

  return (
    <ApplicationDetail
      client={client}
      apiPrefix="/api/user/applications"
      backHref="/dashboard/applications"
    />
  );
}
