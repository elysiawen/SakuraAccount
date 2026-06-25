'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/components/ConfirmProvider';
import { Plus, Box, Info, Shield, Code, Trash2 } from 'lucide-react';
import { AppIcon } from '@/components/AppIcon';
import CreateAppModal from '@/components/CreateAppModal';

import type { OAuth2Client } from '@/types';

export default function UserApplicationsPage() {
  const t = useTranslations('apps');
  const { success, error } = useToast();
  const { confirm } = useConfirm();
  const [clients, setClients] = useState<OAuth2Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch('/api/user/applications');
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

  const handleDeleteClient = async (nanoId: string, clientName: string) => {
    confirm(t('deleteConfirm', { name: clientName }), {
      confirmText: t('delete'),
      confirmColor: 'red',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/user/applications/${nanoId}`, {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-text-primary truncate">{t('title')}</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-medium text-white bg-accent-button rounded-lg hover:bg-accent-button-hover transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          {t('createNew')}
        </button>
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-border">
        <div className="p-4 sm:p-6">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-40 bg-muted rounded-xl"></div>
                </div>
              ))}
            </div>
          ) : clients.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {clients.map((client) => (
                <Link
                  key={client.nanoId}
                  href={`/dashboard/applications/${client.nanoId}`}
                  className="relative border border-border rounded-xl p-4 hover:border-accent-foreground/20 hover:shadow-md transition-all block"
                >
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDeleteClient(client.nanoId, client.name);
                    }}
                    className="absolute top-3 right-3 p-1.5 text-destructive hover:bg-error rounded-lg transition-colors"
                    title={t('delete')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-3 mb-3">
                    <AppIcon name={client.name} icon={client.icon} size="md" />
                    <div className="flex-1 min-w-0 pr-8">
                      <h3 className="font-semibold text-text-primary truncate">{client.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        client.status === 'disabled'
                          ? 'bg-destructive text-destructive-foreground'
                          : 'bg-success text-success-foreground'
                      }`}>
                        {client.status === 'disabled' ? t('statusDisabled') : t('statusActive')}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-text-tertiary line-clamp-2">
                    {client.description || t('noDescription')}
                  </p>
                  <span className="text-xs text-text-quaternary mt-2 block truncate">
                    NanoID: {client.nanoId}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Box className="w-12 h-12 text-text-quaternary mx-auto mb-4" />
              <p className="text-text-tertiary">{t('noApps')}</p>
              <p className="text-sm text-text-quaternary mt-1">{t('noAppsHint')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Documentation */}
      <div className="bg-card rounded-xl shadow-sm border border-border">
        <div className="px-4 sm:px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text-primary">{t('docTitle')}</h2>
        </div>
        <div className="p-4 sm:p-6 space-y-6">
          <div>
            <h3 className="flex items-center gap-2 text-base font-medium text-text-primary mb-2">
              <Info className="w-4 h-4 text-primary" />
              {t('docWhatIs')}
            </h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              {t('docWhatIsDesc')}
            </p>
          </div>

          <div>
            <h3 className="flex items-center gap-2 text-base font-medium text-text-primary mb-2">
              <Shield className="w-4 h-4 text-primary" />
              {t('docAuthMethods')}
            </h3>
            <ul className="text-sm text-text-secondary space-y-1.5 ml-4 sm:ml-6">
              <li><strong>OAuth 2.0</strong> - {t('docOAuthDesc')}</li>
              <li><strong>OpenID Connect</strong> - {t('docOIDCDesc')}</li>
              <li><strong>{t('docSSO')}</strong> - {t('docSSODesc')}</li>
            </ul>
          </div>

          <div>
            <h3 className="flex items-center gap-2 text-base font-medium text-text-primary mb-2">
              <Code className="w-4 h-4 text-primary" />
              {t('docResources')}
            </h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              {t('docResourcesDesc')}
            </p>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      <CreateAppModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={fetchClients}
        apiPath="/api/user/applications"
        t={t}
      />
    </div>
  );
}
