'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/components/ConfirmProvider';
import Modal from '@/components/Modal';
import { Plus, Box, Info, Shield, Code, Trash2 } from 'lucide-react';
import { resolveAppIcon } from '@/lib/app-icon';
import { getErrorMessage } from '@/lib/api-error';

interface OAuth2Client {
  nanoId: string;
  name: string;
  description: string;
  icon?: string;
  status: 'active' | 'disabled';
  userId: string;
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
        className="w-12 h-12 rounded-lg object-cover bg-muted"
        onError={() => setErrored(true)}
      />
    );
  }

  return (
    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${getAvatarColor(client.name)} flex items-center justify-center text-white font-bold shadow-md shadow-black/10`}>
      {client.name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function UserApplicationsPage() {
  const t = useTranslations('dashboard.applications');
  const { success, error } = useToast();
  const { confirm } = useConfirm();
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
      const res = await fetch('/api/user/applications');
      const data = await res.json();
      setClients(data.clients || []);
    } catch (err) {
      console.error('Failed to fetch clients:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClient = async () => {
    if (!newClient.name || !newClient.redirectUris) {
      error(t('fillRequired'));
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/user/applications', {
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
        } catch (err) {
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
                    <AppIconSmall client={client} />
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
