'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/components/ConfirmProvider';
import Search from '@/components/Search';
import Modal from '@/components/Modal';
import { Plus, Trash2, Edit, ExternalLink, Box } from 'lucide-react';
import { resolveAppIcon } from '@/lib/app-icon';
import { getErrorMessage } from '@/lib/api-error';

interface OAuth2Client {
  nanoId: string;
  name: string;
  description: string;
  icon?: string;
  status: 'active' | 'disabled';
  userId: string;
  username?: string;
  createdAt: string;
}

const AVATAR_COLORS = [
  'from-pink-500/80 to-rose-500/80',
  'from-violet-500/80 to-purple-500/80',
  'from-sky-500/80 to-cyan-500/80',
  'from-emerald-500/80 to-teal-500/80',
  'from-amber-500/80 to-orange-500/80',
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function AppIconSmall({ client }: { client: OAuth2Client }) {
  const [errored, setErrored] = useState(false);
  const iconUrl = resolveAppIcon(client.icon);

  if (iconUrl && !errored) {
    return (
      <img
        src={iconUrl}
        alt={client.name}
        className="w-9 h-9 rounded-lg object-cover bg-muted"
        onError={() => setErrored(true)}
      />
    );
  }

  return (
    <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${getAvatarColor(client.name)} flex items-center justify-center text-white font-bold text-sm shadow-md shadow-black/10`}>
      {client.name.charAt(0).toUpperCase()}
    </div>
  );
}

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
  const [clients, setClients] = useState<OAuth2Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newClient, setNewClient] = useState({
    name: '',
    description: '',
    appUrl: '',
    redirectUris: '',
    scopes: 'profile email',
    grants: ['authorization_code', 'refresh_token'] as string[],
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/admin/applications');
      const data = await res.json();
      setClients(data.clients || []);
    } catch (err) {
      console.error('Failed to fetch clients:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter((client) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      client.name.toLowerCase().includes(q) ||
      client.nanoId.toLowerCase().includes(q)
    );
  });

  const handleCreateClient = async () => {
    if (!newClient.name || !newClient.redirectUris) {
      error(t('fillRequired'));
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/applications', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newClient.name,
          description: newClient.description,
          appUrl: newClient.appUrl || null,
          redirectUris: newClient.redirectUris.split('\n').map(u => u.trim()).filter(Boolean),
          grants: newClient.grants,
          scopes: newClient.scopes.split(' ').filter(Boolean),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        success(t('appCreated'));
        setShowCreateModal(false);
        setNewClient({ name: '', description: '', appUrl: '', redirectUris: '', scopes: 'profile email', grants: ['authorization_code', 'refresh_token'] });
        fetchClients();
      } else {
        error(getErrorMessage(data, t('createFailed')));
      }
    } catch (err) {
      error(t('createFailed'));
    } finally {
      setSaving(false);
    }
  };

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
        } catch (err) {
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">{t('title')}</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-accent-button rounded-lg hover:bg-accent-button-hover transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t('createNew')}
        </button>
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <Search placeholder={t('searchPlaceholder')} />
        </div>

        {loading ? (
          <div className="p-4 space-y-3">
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
                          <AppIconSmall client={client} />
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
                <div key={client.nanoId} className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <AppIconSmall client={client} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-text-primary truncate">{client.name}</p>
                        <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                          client.status === 'disabled'
                            ? 'bg-destructive/10 text-destructive'
                            : 'bg-success/10 text-success-foreground'
                        }`}>
                          {client.status === 'disabled' ? t('statusDisabled') : t('statusActive')}
                        </span>
                      </div>
                      <p className="text-xs text-text-tertiary truncate">{client.description || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-text-quaternary">
                    <span className="font-mono">{client.nanoId}</span>
                    <span>·</span>
                    <span>{client.username || '-'}</span>
                    <span>·</span>
                    <span>{formatDate(client.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-1">
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
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-16">
            <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Box className="w-7 h-7 text-text-quaternary" />
            </div>
            <p className="text-text-secondary font-medium">{t('noApps')}</p>
            <p className="text-sm text-text-quaternary mt-1">{t('noAppsHint')}</p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={t('createApp')}
        footer={
          <div className="flex justify-end gap-3 p-4 border-t border-border">
            <button
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 text-sm text-text-secondary bg-muted rounded-xl hover:bg-border-strong transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleCreateClient}
              disabled={saving}
              className="px-4 py-2 text-sm text-white bg-accent-button rounded-xl hover:bg-accent-button-hover transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving && (
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {saving ? t('saving') : t('save')}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">{t('appNameLabel')} *</label>
            <input
              type="text"
              value={newClient.name}
              onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
              className="w-full px-4 py-2.5 border border-border-input rounded-xl bg-card text-text-primary focus:outline-none focus:border-accent-foreground focus:ring-1 focus:ring-accent-foreground transition-colors"
              placeholder={t('appNamePlaceholder')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">{t('description')}</label>
            <input
              type="text"
              value={newClient.description}
              onChange={(e) => setNewClient({ ...newClient, description: e.target.value })}
              className="w-full px-4 py-2.5 border border-border-input rounded-xl bg-card text-text-primary focus:outline-none focus:border-accent-foreground focus:ring-1 focus:ring-accent-foreground transition-colors"
              placeholder={t('descriptionPlaceholder')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">{t('appUrl')}</label>
            <input
              type="url"
              value={newClient.appUrl}
              onChange={(e) => setNewClient({ ...newClient, appUrl: e.target.value })}
              className="w-full px-4 py-2.5 border border-border-input rounded-xl bg-card text-text-primary focus:outline-none focus:border-accent-foreground focus:ring-1 focus:ring-accent-foreground transition-colors"
              placeholder="https://example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">{t('redirectUri')} *</label>
            <textarea
              value={newClient.redirectUris}
              onChange={(e) => setNewClient({ ...newClient, redirectUris: e.target.value })}
              className="w-full px-4 py-2.5 border border-border-input rounded-xl bg-card text-text-primary focus:outline-none focus:border-accent-foreground focus:ring-1 focus:ring-accent-foreground transition-colors h-24 resize-none"
              placeholder={t('redirectUriPlaceholder')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">{t('grantTypes')}</label>
            <div className="space-y-2">
              {[
                { value: 'authorization_code', label: t('grantAuthCode') },
                { value: 'client_credentials', label: t('grantClientCredentials') },
                { value: 'refresh_token', label: 'refresh_token' },
              ].map((grant) => (
                <label key={grant.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newClient.grants.includes(grant.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setNewClient({ ...newClient, grants: [...newClient.grants, grant.value] });
                      } else {
                        setNewClient({ ...newClient, grants: newClient.grants.filter(g => g !== grant.value) });
                      }
                    }}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-text-primary">{grant.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">{t('scopes')}</label>
            <div className="space-y-2">
              {[
                { value: 'openid', label: t('scopeOpenid') },
                { value: 'profile', label: t('scopeProfile') },
                { value: 'email', label: t('scopeEmail') },
              ].map((scope) => (
                <label key={scope.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newClient.scopes.split(' ').includes(scope.value)}
                    onChange={(e) => {
                      const current = newClient.scopes.split(' ').filter(Boolean);
                      if (e.target.checked) {
                        setNewClient({ ...newClient, scopes: [...current, scope.value].join(' ') });
                      } else {
                        setNewClient({ ...newClient, scopes: current.filter(s => s !== scope.value).join(' ') });
                      }
                    }}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-text-primary">{scope.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
