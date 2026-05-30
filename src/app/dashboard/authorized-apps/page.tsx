'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/components/ConfirmProvider';
import { resolveAppIcon } from '@/lib/app-icon';
import { getAvatarColor } from '@/components/AppIcon';

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

function AppIcon({ app }: { app: AuthorizedApp }) {
  const [errored, setErrored] = useState(false);
  const iconUrl = resolveAppIcon(app.icon);

  if (iconUrl && !errored) {
    return (
      <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-muted shrink-0">
        <Image
          src={iconUrl}
          alt={app.name}
          fill
          className="object-cover"
          unoptimized
          onError={() => setErrored(true)}
        />
      </div>
    );
  }

  return (
    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${getAvatarColor(app.name)} flex items-center justify-center text-white font-bold shadow-md shadow-black/10 shrink-0`}>
      {app.name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function AuthorizedAppsPage() {
  const t = useTranslations('dashboard.authorizedApps');
  const { success, error } = useToast();
  const { confirm } = useConfirm();
  const [apps, setApps] = useState<AuthorizedApp[]>([]);
  const [loading, setLoading] = useState(true);

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

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-20 bg-muted rounded-xl" />
            </div>
          ))}
        </div>
      ) : apps.length > 0 ? (
        <div className="space-y-3">
          {apps.map((app) => (
            <div
              key={app.clientId}
              className="flex items-center justify-between p-4 rounded-xl border border-border hover:border-accent-foreground/20 transition-colors bg-card"
            >
              <div className="flex items-center gap-3 min-w-0">
                <AppIcon app={app} />
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
                      {app.scopes.map((scope) => (
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
      ) : (
        <div className="text-center py-16">
          <span className="text-4xl mb-4 block">🔗</span>
          <p className="text-text-tertiary">{t('noApps')}</p>
          <p className="text-sm text-text-quaternary mt-1">{t('noAppsDesc')}</p>
        </div>
      )}
    </div>
  );
}
