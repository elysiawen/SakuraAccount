'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/components/ConfirmProvider';
import {
  Globe, Clock, ShieldCheck, XCircle,
  LayoutPanelLeft, Search, RefreshCcw, AlertCircle,
} from 'lucide-react';
import { BrowserIcon } from '@/components/BrowserIcon';

interface Session {
  id: string;
  ip: string;
  user_agent: string;
  ip_location?: string;
  isp?: string;
  created_at: string;
  expires_at: string;
}

export default function SessionsPage() {
  const t = useTranslations('dashboard.sessions');
  const { success, error } = useToast();
  const { confirm } = useConfirm();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => { fetchSessions(); }, []);

  function parseUA(ua: string): { name: string; browser: string } {
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

  function formatTime(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t('justNow');
    if (mins < 60) return t('minutesAgo', { minutes: mins });
    const hours = Math.floor(mins / 60);
    if (hours < 24) return t('hoursAgo', { hours: hours });
    const days = Math.floor(hours / 24);
    return t('daysAgo', { days: days });
  }

  const fetchSessions = async () => {
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
  };

  const handleRevoke = async (sessionId: string) => {
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

      {/* Search */}
      <div className="bg-muted/50 rounded-3xl p-4 border border-border space-y-4">
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

      {/* Sessions */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <RefreshCcw className="w-10 h-10 text-accent-button/20 border-t-accent-button rounded-full animate-spin" />
          <p className="text-sm text-text-quaternary font-medium animate-pulse">{t('loading')}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-muted/30 rounded-3xl border border-dashed border-border-strong">
          <ShieldCheck className="w-16 h-16 text-text-quaternary mx-auto mb-4" />
          <h3 className="text-xl font-bold text-text-primary">{t('noSessions')}</h3>
          <p className="text-sm text-text-tertiary mt-2">{t('noSessionsDesc')}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((session) => {
            const isCurrent = session.id === currentSessionId;
            const { name, browser } = parseUA(session.user_agent);

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
                  {/* Icon */}
                  <div className={`shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center border transition-all duration-300 overflow-hidden ${
                    isCurrent
                      ? 'bg-accent-button border-accent-button text-white shadow-lg shadow-accent-button/30'
                      : 'bg-muted border-border text-foreground group-hover:bg-card group-hover:border-accent-button/20 group-hover:scale-105'
                  }`}>
                    <BrowserIcon browser={browser} className="w-8 h-8" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <h4 className="font-bold text-text-primary text-lg tracking-tight">{name}</h4>
                      {isCurrent && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold bg-emerald-500 text-white dark:bg-emerald-500/20 dark:text-emerald-400 rounded-full whitespace-nowrap">
                          <ShieldCheck className="w-3 h-3" />
                          {t('currentDevice')}
                        </span>
                      )}
                      <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full border bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20 whitespace-nowrap">
                        Web
                      </span>
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-4 text-xs text-text-tertiary flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Globe className="w-4 h-4 text-accent-button/60" />
                            <span className="font-mono font-medium">{session.ip || t('unknown')}</span>
                          </div>
                          <div className="flex items-center gap-1 flex-wrap">
                            {session.ip_location && (
                              <span className="px-1.5 py-0.5 text-[10px] bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-md font-sans border border-indigo-100 dark:border-indigo-800/30 whitespace-nowrap">
                                {session.ip_location}
                              </span>
                            )}
                            {session.isp && (
                              <span className="px-1.5 py-0.5 text-[10px] bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-md font-sans border border-emerald-100 dark:border-emerald-800/30 truncate max-w-[150px] sm:max-w-xs" title={session.isp}>
                                {session.isp}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="group/time flex items-center gap-1.5 cursor-default" tabIndex={0}>
                          <Clock className="w-4 h-4 text-orange-500/60" />
                          <span className="block group-hover/time:hidden group-focus/time:hidden">{formatTime(session.created_at)}</span>
                          <span className="hidden group-hover/time:block group-focus/time:block">{new Date(session.created_at).toLocaleString('zh-CN')}</span>
                        </div>
                      </div>
                    </div>

                    {/* UA */}
                    <div className="group/ua relative mt-2">
                      <div className="flex items-center gap-1.5 text-[10px] text-text-quaternary font-mono transition-colors group-hover:text-text-tertiary cursor-help">
                        <LayoutPanelLeft className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate max-w-[200px] sm:max-w-md lg:max-w-lg">{session.user_agent || t('unknown')}</span>
                      </div>
                      <div className="absolute bottom-full left-0 mb-2 invisible group-hover/ua:visible bg-card text-card-foreground text-[10px] p-3 rounded-xl w-72 break-all shadow-2xl z-30 border border-border-strong whitespace-normal leading-relaxed">
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
                      onClick={() => handleRevoke(session.id)}
                      disabled={deletingId === session.id}
                      className="w-full lg:w-auto flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold text-red-600 bg-red-50/50 dark:bg-red-500/5 hover:bg-red-600 hover:text-white dark:hover:bg-red-600 dark:hover:text-white rounded-2xl transition-all duration-300 disabled:opacity-50 border border-red-100/50 dark:border-red-900/20 active:scale-95 whitespace-nowrap"
                    >
                      {deletingId === session.id ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <XCircle className="w-4 h-4" />
                      )}
                      <span>{t('forceLogoutBtn')}</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[10px] text-text-quaternary font-medium px-4 whitespace-nowrap">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {t('protectedSession')}
                    </div>
                  )}
                </div>
              </div>
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
