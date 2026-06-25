'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/components/ConfirmProvider';
import { ShieldCheck, AlertCircle, Shield, Search } from 'lucide-react';
import { SessionCard, SessionsLoading, SessionsEmpty, type SessionBase } from '@/components/SessionCard';

export default function SessionsPage() {
  const t = useTranslations('account.sessions');
  const { success, error } = useToast();
  const { confirm } = useConfirm();
  const [sessions, setSessions] = useState<SessionBase[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function formatTime(dateStr: string): string {
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/sessions');
      const data = await res.json();
      setSessions(data.sessions || []);
      setCurrentSessionId(data.currentSessionId || '');
    } catch {
      console.error('Failed to fetch sessions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchSessions();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [fetchSessions]);

  const handleRevoke = (sessionId: string) => {
    confirm(t('forceLogoutConfirm'), {
      confirmText: t('forceLogoutBtn'),
      confirmColor: 'red',
      onConfirm: async () => {
        setDeletingId(sessionId);
        try {
          const res = await fetch(`/api/auth/sessions?id=${sessionId}`, { method: 'DELETE' });
          if (res.ok) {
            setSessions(prev => prev.filter(s => s.id !== sessionId));
            success(t('sessionLoggedOut'));
          } else {
            error(t('operationFailed'));
          }
        } catch {
          error(t('operationFailed'));
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  const filtered = sessions
    .filter(s => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        s.ip?.toLowerCase().includes(term) ||
        s.user_agent?.toLowerCase().includes(term)
      );
    })
    // 当前会话置顶
    .sort((a, b) => {
      if (a.id === currentSessionId) return -1;
      if (b.id === currentSessionId) return 1;
      return 0;
    });

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
                  <span>{t('countBadge', { count: filtered.length })}</span>
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
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className="h-11 w-full rounded-2xl border border-border bg-background/80 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-quaternary focus:outline-none focus:ring-2 focus:ring-accent-foreground/20 focus:border-accent-foreground/40 transition-all"
              />
            </div>
          )}
        </div>
      </div>

      {/* Sessions */}
      {loading ? (
        <SessionsLoading t={t} />
      ) : filtered.length === 0 ? (
        <SessionsEmpty t={t} />
      ) : (
        <div className="space-y-4">
          {filtered.map((session) => {
            const isCurrent = session.id === currentSessionId;
            return (
              <SessionCard
                key={session.id}
                session={session}
                isCurrent={isCurrent}
                deleting={deletingId === session.id}
                onRevoke={() => handleRevoke(session.id)}
                renderExtraBadges={
                  isCurrent ? (
                    <span className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 text-[9px] sm:text-[10px] font-bold bg-emerald-500 text-white dark:bg-emerald-500/20 dark:text-emerald-400 rounded-full whitespace-nowrap">
                      <ShieldCheck className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      {t('currentDevice')}
                    </span>
                  ) : undefined
                }
                t={t}
                formatTime={formatTime}
              />
            );
          })}
        </div>
      )}

      {/* Security footer */}
      <div className="flex items-start gap-3 rounded-2xl border border-blue-100/60 bg-blue-50/40 p-4 shadow-sm dark:border-blue-900/20 dark:bg-blue-900/10">
        <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-bold text-blue-900 dark:text-blue-300">{t('securityTip')}</p>
          <p className="text-[11px] text-blue-700/70 dark:text-blue-400/70 leading-relaxed">
            {t('securityTipDesc')}
          </p>
        </div>
      </div>
    </div>
  );
}
