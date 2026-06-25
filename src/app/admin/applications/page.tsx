'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/components/ConfirmProvider';
import Search from '@/components/Search';
import CreateAppModal from '@/components/CreateAppModal';
import { Plus, Trash2, Edit, Box } from 'lucide-react';
import { AppIcon } from '@/components/AppIcon';

import type { OAuth2Client } from '@/types';

type AdminClientSummary = Pick<OAuth2Client, 'nanoId' | 'name' | 'description' | 'icon' | 'status' | 'userId' | 'createdAt'> & { username?: string };

export default function AdminApplicationsPage() {
  return (
    <Suspense fallback={null}>
      <AdminApplicationsContent />
    </Suspense>
  );
}

function AdminApplicationsContent() {
  const t = useTranslations('admin.applications');
  const { success, error } = useToast();
  const { confirm } = useConfirm();
  const searchParams = useSearchParams();
  const search = searchParams.get('search') || '';
  const [clients, setClients] = useState<AdminClientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/applications');
      const data = await res.json();
      setClients(data.clients || []);
    } catch (err) {
      console.error('Failed to fetch clients:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchClients();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [fetchClients]);

  const filteredClients = clients.filter((client) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      client.name.toLowerCase().includes(q) ||
      client.nanoId.toLowerCase().includes(q)
    );
  });

  const handleDeleteClient = async (nanoId: string, clientName: string) => {
    confirm(t('deleteConfirm', { name: clientName }), {
      confirmText: t('delete'),
      confirmColor: 'red',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/applications/${nanoId}`, {
            method: 'DELETE',
            credentials: 'include',
          });

          if (res.ok) {
            success(t('appDeleted'));
            fetchClients();
          } else {
            error(t('deleteFailed'));
          }
        } catch {
          error(t('deleteFailed'));
        }
      },
    });
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-text-primary">{t('title')}</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-accent-button rounded-lg hover:bg-accent-button-hover transition-colors w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          {t('createNew')}
        </button>
      </div>

      {/* Card container */}
      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        {/* Search */}
        <div className="p-3 sm:p-4 border-b border-border">
          <Search placeholder={t('searchPlaceholder')} />
        </div>

        {loading ? (
          <div className="p-3 sm:p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-muted rounded-lg" />
              </div>
            ))}
          </div>
        ) : filteredClients.length > 0 ? (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-5 py-3 text-xs font-medium text-text-tertiary tracking-wider uppercase">{t('appName')}</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-text-tertiary tracking-wider uppercase">NanoID</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-text-tertiary tracking-wider uppercase">{t('owner')}</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-text-tertiary tracking-wider uppercase">{t('status')}</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-text-tertiary tracking-wider uppercase">{t('createdAt')}</th>
                    <th className="text-right px-5 py-3 text-xs font-medium text-text-tertiary tracking-wider uppercase">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((client) => (
                    <tr key={client.nanoId} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                      <td className="px-5 py-3.5">
                        <Link href={`/admin/applications/${client.nanoId}`} className="flex items-center gap-3 group">
                          <AppIcon name={client.name} icon={client.icon} className="w-9 h-9 text-sm" />
                          <div className="min-w-0">
                            <p className="font-medium text-text-primary truncate group-hover:text-accent-foreground transition-colors">{client.name}</p>
                            <p className="text-xs text-text-tertiary truncate">{client.description || '-'}</p>
                          </div>
                        </Link>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm text-text-secondary font-mono">{client.nanoId}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm text-text-secondary">{client.username || '-'}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center text-xs px-2.5 py-1 rounded-full font-medium ${
                          client.status === 'disabled'
                            ? 'bg-destructive/10 text-destructive'
                            : 'bg-success/10 text-success-foreground'
                        }`}>
                          {client.status === 'disabled' ? t('statusDisabled') : t('statusActive')}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-text-tertiary">
                        {formatDate(client.createdAt)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/admin/applications/${client.nanoId}`}
                            className="inline-flex items-center gap-1 text-sm text-accent-foreground hover:bg-accent px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            {t('edit')}
                          </Link>
                          <button
                            onClick={() => handleDeleteClient(client.nanoId, client.name)}
                            className="inline-flex items-center gap-1 text-sm text-destructive hover:bg-error px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            {t('delete')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-border">
              {filteredClients.map((client) => (
                <Link
                  key={client.nanoId}
                  href={`/admin/applications/${client.nanoId}`}
                  className="block p-4 active:bg-muted/60 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <AppIcon name={client.name} icon={client.icon} className="w-9 h-9 text-sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-text-primary truncate">{client.name}</p>
                        <span className={`shrink-0 inline-flex items-center text-[10px] leading-tight px-1.5 py-0.5 rounded-full font-medium ${
                          client.status === 'disabled'
                            ? 'bg-destructive/10 text-destructive'
                            : 'bg-success/10 text-success-foreground'
                        }`}>
                          {client.status === 'disabled' ? t('statusDisabled') : t('statusActive')}
                        </span>
                      </div>
                      <p className="text-xs text-text-tertiary truncate mt-0.5">
                        {client.description || client.username || client.nanoId}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-text-quaternary mt-1.5">
                        <span className="shrink-0">{client.username || '-'}</span>
                        <span className="shrink-0">·</span>
                        <span className="font-mono truncate">{client.nanoId}</span>
                        <span className="shrink-0">·</span>
                        <span className="shrink-0">{formatDate(client.createdAt)}</span>
                      </div>
                    </div>
                    {/* Action buttons */}
                    <div className="flex items-center gap-1 shrink-0 -mr-1">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeleteClient(client.nanoId, client.name);
                        }}
                        className="p-2 text-text-quaternary hover:text-destructive hover:bg-error rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-12 sm:py-16">
            <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Box className="w-7 h-7 text-text-quaternary" />
            </div>
            <p className="text-text-secondary font-medium">{t('noApps')}</p>
            <p className="text-sm text-text-quaternary mt-1">{t('noAppsHint')}</p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <CreateAppModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={fetchClients}
        apiPath="/api/admin/applications"
        t={t}
        showUserSelect
      />
    </div>
  );
}
