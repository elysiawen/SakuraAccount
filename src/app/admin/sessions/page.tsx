'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/components/ConfirmProvider';
import {
  Globe, Clock, ShieldCheck, XCircle,
  Search, RefreshCcw, LayoutPanelLeft,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { BrowserIcon } from '@/components/BrowserIcon';



interface SessionWithUser {
  id: string;
  user_id: string;
  username: string;
  email: string;
  nickname?: string | null;
  avatar?: string | null;
  role: string;
  ip?: string | null;
  user_agent?: string | null;
  ip_location?: string | null;
  isp?: string | null;
  created_at: string;
  expires_at: string;
}

function parseUA(ua: string, t: (key: string) => string): { name: string; browser: string } {
  if (!ua) return { name: t('unknownDevice'), browser: '' };
  let os = '';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS X')) os = 'macOS';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone')) os = 'iOS';
  else if (ua.includes('iPad')) os = 'iPadOS';
  else if (ua.includes('Linux')) os = 'Linux';

  let browser = '';
  if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('OPR/') || ua.includes('Opera')) browser = 'Opera';
  else if (ua.includes('Chrome/') && !ua.includes('Edg/')) browser = 'Chrome';
  else if (ua.includes('Firefox/')) browser = 'Firefox';
  else if (ua.includes('Safari/') && !ua.includes('Chrome/')) browser = 'Safari';

  return { name: os && browser ? `${os} / ${browser}` : browser || os || t('unknownDevice'), browser };
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

      {/* Search */}
      <div className="bg-muted/50 rounded-3xl p-4 border border-border">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-quaternary group-focus-within:text-accent-button transition-colors" />
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            className="w-full pl-12 pr-4 py-3 bg-card border border-border rounded-2xl outline-none focus:ring-2 focus:ring-accent-button/20 focus:border-accent-button/50 transition-all font-medium text-sm shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Sessions list */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <RefreshCcw className="w-10 h-10 text-accent-button/20 border-t-accent-button rounded-full animate-spin" />
          <p className="text-sm text-text-quaternary font-medium animate-pulse">{t('loading')}</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-20 bg-muted/30 rounded-3xl border border-dashed border-border-strong">
          <ShieldCheck className="w-16 h-16 text-text-quaternary mx-auto mb-4" />
          <h3 className="text-xl font-bold text-text-primary">{t('noSessions')}</h3>
          <p className="text-sm text-text-tertiary mt-2">{t('noSessionsDesc')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => {
            const { name, browser } = parseUA(session.user_agent || '', t as (k: string) => string);
            const isCurrent = session.id === currentSessionId;

            return (
              <div
                key={session.id}
                className={`group relative flex flex-col lg:flex-row items-start lg:items-center justify-between p-5 bg-card rounded-3xl border transition-all duration-300 hover:shadow-xl hover:shadow-gray-200/40 dark:hover:shadow-black/20 ${
                  isCurrent
                    ? 'border-accent-button/30 bg-accent-button/5 shadow-sm shadow-accent-button/5'
                    : 'border-border hover:border-accent-button/20'
                }`}
              >
                <div className="flex items-start lg:items-center gap-4 w-full">
                  {/* Browser icon */}
                  <div className={`shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center border transition-all duration-300 overflow-hidden ${
                    isCurrent
                      ? 'bg-accent-button border-accent-button text-white shadow-lg shadow-accent-button/30'
                      : 'bg-muted border-border text-foreground group-hover:bg-card group-hover:border-accent-button/20 group-hover:scale-105'
                  }`}>
                    <BrowserIcon browser={browser} className="w-6 h-6 sm:w-8 sm:h-8" />
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* User + Device header row */}
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      {/* User pill */}
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

                      {/* Device name */}
                      <h4 className="font-bold text-text-primary text-base sm:text-lg tracking-tight break-all sm:break-normal whitespace-normal sm:whitespace-nowrap leading-snug">
                        {name}
                      </h4>

                      {/* Web badge */}
                      <span className="px-2 sm:px-2.5 py-0.5 text-[9px] sm:text-[10px] font-bold rounded-full border bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20 whitespace-nowrap">
                        Web
                      </span>

                      {/* Current device badge */}
                      {isCurrent && (
                        <span className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 text-[9px] sm:text-[10px] font-bold bg-emerald-500 text-white dark:bg-emerald-500/20 dark:text-emerald-400 rounded-full whitespace-nowrap">
                          <ShieldCheck className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                          {t('currentDevice')}
                        </span>
                      )}


                    </div>

                    {/* IP & Location */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs text-text-tertiary flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent-button/60" />
                          <span className="font-mono font-medium text-[11px] sm:text-xs">{session.ip || t('unknown')}</span>
                        </div>
                        {session.ip_location && (
                          <span className="px-1.5 py-0.5 text-[9px] sm:text-[10px] bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-md font-sans border border-indigo-100 dark:border-indigo-800/30 whitespace-nowrap">
                            {session.ip_location}
                          </span>
                        )}
                        {session.isp && (
                          <span className="px-1.5 py-0.5 text-[9px] sm:text-[10px] bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-md font-sans border border-emerald-100 dark:border-emerald-800/30 truncate max-w-[100px] sm:max-w-[120px]" title={session.isp}>
                            {session.isp}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 sm:gap-1.5">
                        <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-500/60" />
                        <span className="text-[11px] sm:text-xs">{formatTime(session.created_at)}</span>
                      </div>
                    </div>

                    {/* UA */}
                    <div className="group/ua relative mt-1.5 sm:mt-2">
                      <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] text-text-quaternary font-mono transition-colors group-hover:text-text-tertiary cursor-help">
                        <LayoutPanelLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                        <span className="truncate max-w-[180px] sm:max-w-md lg:max-w-2xl">{session.user_agent || t('unknown')}</span>
                      </div>
                      <div className="absolute bottom-full left-0 mb-2 invisible group-hover/ua:visible bg-card text-card-foreground text-[10px] p-3 rounded-xl w-64 sm:w-72 break-all shadow-2xl z-30 border border-border-strong whitespace-normal leading-relaxed">
                        <div className="font-bold text-text-quaternary mb-1 border-b border-border-strong pb-1">{t('fullUA')}</div>
                        {session.user_agent}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className={`flex items-center justify-end w-full lg:w-auto lg:mt-0 ${!isCurrent ? 'mt-5 pt-4 border-t lg:border-t-0 lg:pt-0 border-border' : 'mt-2'}`}>
                  {!isCurrent ? (
                    <button
                      onClick={() => handleRevoke(session)}
                      disabled={deletingId === session.id}
                      className="w-full lg:w-auto flex items-center justify-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 text-xs font-bold text-red-600 bg-red-50/50 dark:bg-red-500/5 hover:bg-red-600 hover:text-white dark:hover:bg-red-600 dark:hover:text-white rounded-2xl transition-all duration-300 disabled:opacity-50 border border-red-100/50 dark:border-red-900/20 active:scale-95 whitespace-nowrap"
                    >
                      {deletingId === session.id ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <XCircle className="w-4 h-4" />
                      )}
                      <span>{t('forceLogoutBtn')}</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-text-quaternary font-medium px-4 whitespace-nowrap">
                      <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      {t('protectedSession')}
                    </div>
                  )}
                </div>
              </div>
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
