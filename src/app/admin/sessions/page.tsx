'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/components/ConfirmProvider';
import {
  ShieldCheck, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { SessionCard, SessionsLoading, SessionsEmpty, SessionsSearch, type SessionBase } from '@/components/SessionCard';

interface SessionWithUser extends SessionBase {
  user_id: string;
  username: string;
  email: string;
  nickname?: string | null;
  avatar?: string | null;
  role: string;
}

export default function AdminSessionsPage() {
  const t = useTranslations('admin.sessions');
  const { success, error } = useToast();
  const { confirm } = useConfirm();
  const [sessions, setSessions] = useState<SessionWithUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState('');
  const limit = 20;

  const fetchSessions = useCallback(async (p: number, search: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(p), limit: String(limit) });
      if (search.trim()) params.set('search', search.trim());
      const res = await fetch(`/api/admin/sessions?${params.toString()}`);
      const data = await res.json();
      setSessions(data.sessions || []);
      setTotal(data.total || 0);
      setCurrentSessionId(data.currentSessionId || '');
    } catch {
      console.error('Failed to fetch sessions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchSessions(1, '');
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [fetchSessions]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchSessions(1, searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, fetchSessions]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    void fetchSessions(newPage, searchTerm);
  };

  const handleRevoke = (session: SessionWithUser) => {
    confirm(t('forceLogoutConfirm', { user: session.nickname || session.username }), {
      confirmText: t('forceLogoutBtn'),
      confirmColor: 'red',
      onConfirm: async () => {
        setDeletingId(session.id);
        try {
          const res = await fetch(`/api/admin/sessions?id=${session.id}`, { method: 'DELETE' });
          if (res.ok) {
            setSessions(prev => prev.filter(s => s.id !== session.id));
            setTotal(prev => prev - 1);
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

  const totalPages = Math.ceil(total / limit);

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">{t('title')}</h1>
        <p className="text-sm text-text-tertiary mt-1">{t('subtitle')}</p>
      </div>

      <SessionsSearch value={searchTerm} onChange={setSearchTerm} t={t} />

      {/* Sessions list */}
      {loading ? (
        <SessionsLoading t={t} />
      ) : sessions.length === 0 ? (
        <SessionsEmpty t={t} />
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => {
            const isCurrent = session.id === currentSessionId;

            return (
              <SessionCard
                key={session.id}
                session={session}
                isCurrent={isCurrent}
                deleting={deletingId === session.id}
                onRevoke={() => handleRevoke(session)}
                renderUserPill={
                  <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-0.5 sm:py-1 bg-muted rounded-lg whitespace-nowrap">
                    <div className="relative w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-accent-button/10 flex items-center justify-center text-accent-button font-semibold text-[8px] sm:text-[9px] overflow-hidden shrink-0">
                      {session.avatar ? (
                        <Image src={session.avatar} alt="" fill className="object-cover" unoptimized />
                      ) : (
                        (session.nickname || session.username || '').charAt(0).toUpperCase()
                      )}
                    </div>
                    <span className="text-xs sm:text-sm font-black text-text-primary">
                      {session.nickname || session.username}
                    </span>
                    <span className={`px-1.5 sm:px-2.5 py-0.5 text-[9px] sm:text-[10px] font-bold rounded-full border whitespace-nowrap ${
                      session.role === 'admin'
                        ? 'bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-500/10 dark:text-purple-300 dark:border-purple-500/20'
                        : session.role === 'developer'
                          ? 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20'
                          : 'bg-gray-50 text-gray-600 border-gray-100 dark:bg-gray-500/10 dark:text-gray-300 dark:border-gray-500/20'
                    }`}>
                      {session.role === 'admin' ? t('roleAdmin') : session.role === 'developer' ? t('roleDeveloper') : t('roleUser')}
                    </span>
                  </div>
                }
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                className="p-2 rounded-xl border border-border hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-text-tertiary px-2">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages}
                className="p-2 rounded-xl border border-border hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
