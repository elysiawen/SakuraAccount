'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/components/ConfirmProvider';
import { AppIcon } from '@/components/AppIcon';

interface AuthorizedApp {
  clientId: string;
  name: string;
  description: string;
  icon?: string;
  appUrl?: string;
  redirectUris?: string[];
  scopes: string[];
  tokenCount: number;
  latestCreatedAt: string;
}

const SCOPE_KEYS: Record<string, string> = {
  profile: 'scopeProfile',
  email: 'scopeEmail',
  openid: 'scopeOpenID',
};

export default function AuthorizedAppsPage() {
  const t = useTranslations('dashboard.authorizedApps');
  const { success, error } = useToast();
  const { confirm } = useConfirm();
  const [apps, setApps] = useState<AuthorizedApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredApps = useMemo(() => {
    if (!searchQuery.trim()) return apps;
    const q = searchQuery.toLowerCase();
    return apps.filter(
      (app) =>
        app.name.toLowerCase().includes(q) ||
        (app.description && app.description.toLowerCase().includes(q))
    );
  }, [apps, searchQuery]);

  const fetchApps = useCallback(async () => {
    try {
      const res = await fetch('/api/applications/tokens');
      const data = await res.json();
      setApps(data.apps || []);
    } catch {
      console.error('Failed to fetch apps');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchApps();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [fetchApps]);

  const handleRevoke = (app: AuthorizedApp) => {
    confirm(t('revokeConfirm', { name: app.name }), {
      confirmText: t('revoke'),
      confirmColor: 'red',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/applications/tokens?clientId=${app.clientId}`, {
            method: 'DELETE',
          });
          if (res.ok) {
            success(t('revokeSuccess'));
            fetchApps();
          } else {
            error(t('revokeFailed'));
          }
        } catch {
          error(t('revokeFailed'));
        }
      },
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">{t('title')}</h1>
        <p className="text-sm text-text-tertiary mt-1">{t('subtitle')}</p>
      </div>

      {!loading && (
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-border bg-background text-sm text-text-primary placeholder:text-text-quaternary focus:outline-none focus:ring-2 focus:ring-accent-foreground/20 focus:border-accent-foreground/40 transition-all"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-quaternary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-20 bg-muted rounded-xl" />
            </div>
          ))}
        </div>
      ) : filteredApps.length > 0 ? (
        <div className="space-y-3">
          {filteredApps.map((app) => (
            <div
              key={app.clientId}
              className="flex items-center justify-between p-4 rounded-xl border border-border hover:border-accent-foreground/20 transition-colors bg-card"
            >
              <div className="flex items-center gap-3 min-w-0">
                <AppIcon name={app.name} icon={app.icon} size="md" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-text-primary truncate">{app.name}</p>
                    <span className="text-xs px-2 py-0.5 bg-success text-success-foreground rounded-full shrink-0">
                      {t('active')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-text-tertiary truncate">
                      {app.description || t('thirdPartyApp')}
                    </p>
                    <span className="text-xs text-text-quaternary shrink-0">·</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {[...new Set(app.scopes)].map((scope) => (
                        <span key={scope} className="text-xs px-1.5 py-0.5 bg-muted text-text-secondary rounded">
                          {SCOPE_KEYS[scope] ? t(SCOPE_KEYS[scope]) : scope}
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-text-quaternary mt-1">
                    {t('authorizedAt', { date: formatDate(app.latestCreatedAt) })}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleRevoke(app)}
                className="px-3 py-1.5 text-sm text-destructive hover:bg-error rounded-lg transition-colors shrink-0 ml-4"
              >
                {t('revoke')}
              </button>
            </div>
          ))}
        </div>
      ) : apps.length === 0 ? (
        <div className="text-center py-16">
          <span className="text-4xl mb-4 block">🔗</span>
          <p className="text-text-tertiary">{t('noApps')}</p>
          <p className="text-sm text-text-quaternary mt-1">{t('noAppsDesc')}</p>
        </div>
      ) : (
        <div className="text-center py-16">
          <span className="text-4xl mb-4 block">🔍</span>
          <p className="text-text-tertiary">{t('noResults')}</p>
          <p className="text-sm text-text-quaternary mt-1">{t('noResultsDesc')}</p>
        </div>
      )}
    </div>
  );
}
