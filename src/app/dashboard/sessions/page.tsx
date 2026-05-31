'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/components/ConfirmProvider';
import { ShieldCheck, AlertCircle } from 'lucide-react';
import { SessionCard, SessionsLoading, SessionsEmpty, SessionsSearch, type SessionBase } from '@/components/SessionCard';

export default function SessionsPage() {
  const t = useTranslations('dashboard.sessions');
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

  const filtered = sessions.filter(s => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      s.ip?.toLowerCase().includes(term) ||
      s.user_agent?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">{t('title')}</h1>
        <p className="text-sm text-text-tertiary mt-1">{t('subtitle')}</p>
      </div>

      <SessionsSearch value={searchTerm} onChange={setSearchTerm} t={t} />

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
      <div className="flex items-start gap-3 p-4 bg-blue-50/30 dark:bg-blue-900/10 border border-blue-100/50 dark:border-blue-900/20 rounded-2xl">
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
