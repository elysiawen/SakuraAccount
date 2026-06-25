'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { CalendarClock, ExternalLink, Search, Shield, Trash2 } from 'lucide-react';
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

  const getAppHost = (appUrl?: string) => {
    if (!appUrl) return null;
    try {
      return new URL(appUrl).host;
    } catch {
      return appUrl;
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm backdrop-blur-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-text-primary">{t('title')}</h1>
              {!loading && (
                <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-accent-foreground/10 bg-accent-foreground/5 px-2.5 py-1 text-xs text-text-secondary">
                  <Shield className="h-3.5 w-3.5 text-accent-foreground" />
                  <span>{t('countBadge', { count: filteredApps.length })}</span>
                </div>
              )}
            </div>
            <p className="text-sm leading-6 text-text-tertiary">{t('subtitle')}</p>
          </div>

          {!loading && <hr className="border-border/50 lg:hidden" />}

          {!loading && (
            <div className="relative w-full lg:w-[340px] lg:shrink-0">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-quaternary" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className="h-11 w-full rounded-2xl border border-border bg-background/80 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-quaternary focus:outline-none focus:ring-2 focus:ring-accent-foreground/20 focus:border-accent-foreground/40 transition-all"
              />
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-20 bg-muted rounded-xl" />
            </div>
          ))}
        </div>
      ) : filteredApps.length > 0 ? (
        <div className="space-y-4">
          {filteredApps.map((app) => (
            <div
              key={app.clientId}
              className="overflow-hidden rounded-2xl border border-border/70 bg-card/90 shadow-sm transition-all hover:border-accent-foreground/20 hover:shadow-md"
            >
              <div className="flex flex-col gap-4 p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 rounded-2xl bg-accent-foreground/5 p-1.5">
                        <AppIcon name={app.name} icon={app.icon} size="md" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-base font-semibold text-text-primary sm:text-lg">{app.name}</p>
                          <span className="rounded-full bg-success px-2.5 py-1 text-xs font-medium text-success-foreground">
                            {t('active')}
                          </span>
                        </div>
                        <p className="text-sm leading-6 text-text-tertiary">
                          {app.description || t('thirdPartyApp')}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {[...new Set(app.scopes)].map((scope) => (
                            <span
                              key={scope}
                              className="rounded-full border border-border/70 bg-muted/70 px-2.5 py-1 text-xs font-medium text-text-secondary"
                            >
                              {SCOPE_KEYS[scope] ? t(SCOPE_KEYS[scope]) : scope}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRevoke(app)}
                    className="hidden items-center justify-center gap-2 rounded-xl border border-error/60 bg-error px-3.5 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-error/80 sm:inline-flex sm:w-auto sm:self-start"
                  >
                    <Trash2 className="h-4 w-4" />
                    {t('revoke')}
                  </button>
                </div>

                <div className="grid gap-3 rounded-2xl bg-background/70 p-3 sm:grid-cols-3 sm:p-4">
                  <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-card/70 px-3 py-2.5">
                    <CalendarClock className="h-4 w-4 shrink-0 text-accent-foreground" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-text-quaternary">
                        {t('authorizedTime')}
                      </p>
                      <p className="truncate text-sm text-text-secondary">{formatDate(app.latestCreatedAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-card/70 px-3 py-2.5">
                    <Shield className="h-4 w-4 shrink-0 text-accent-foreground" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-text-quaternary">
                        {t('scopeCount')}
                      </p>
                      <p className="truncate text-sm text-text-secondary">{[...new Set(app.scopes)].length}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-card/70 px-3 py-2.5">
                    <ExternalLink className="h-4 w-4 shrink-0 text-accent-foreground" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-text-quaternary">
                        {t('appDomain')}
                      </p>
                      <p className="truncate text-sm text-text-secondary">
                        {getAppHost(app.appUrl) || t('thirdPartyApp')}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleRevoke(app)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-error/60 bg-error px-3.5 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-error/80 sm:hidden"
                >
                  <Trash2 className="h-4 w-4" />
                  {t('revoke')}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : apps.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/70 bg-card/55 py-16 text-center shadow-sm">
          <span className="text-4xl mb-4 block">🔗</span>
          <p className="text-text-tertiary">{t('noApps')}</p>
          <p className="text-sm text-text-quaternary mt-1">{t('noAppsDesc')}</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border/70 bg-card/55 py-16 text-center shadow-sm">
          <span className="text-4xl mb-4 block">🔍</span>
          <p className="text-text-tertiary">{t('noResults')}</p>
          <p className="text-sm text-text-quaternary mt-1">{t('noResultsDesc')}</p>
        </div>
      )}
    </div>
  );
}
