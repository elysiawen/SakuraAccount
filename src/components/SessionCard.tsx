'use client';

import { Globe, Clock, ShieldCheck, XCircle, LayoutPanelLeft, Search } from 'lucide-react';
import { BrowserIcon } from '@/components/BrowserIcon';
import { parseUA } from '@/lib/parse-ua';

export interface SessionBase {
  id: string;
  ip?: string | null;
  user_agent?: string | null;
  ip_location?: string | null;
  isp?: string | null;
  created_at: string;
  expires_at: string;
}

export interface SessionCardProps {
  session: SessionBase;
  isCurrent: boolean;
  deleting?: boolean;
  onRevoke?: () => void;
  /** Extra content rendered in the header row (e.g. user pill with avatar, name, role badge) */
  renderUserPill?: React.ReactNode;
  /** Extra badges rendered after the Web badge in the header (e.g. "Current Device" badge) */
  renderExtraBadges?: React.ReactNode;
  /** Translation function scoped to the sessions namespace */
  t: (key: string, params?: Record<string, string>) => string;
  /** Format a created_at date string */
  formatTime: (dateStr: string) => string;
}

export function SessionCard({
  session,
  isCurrent,
  deleting = false,
  onRevoke,
  renderUserPill,
  renderExtraBadges,
  t,
  formatTime,
}: SessionCardProps) {
  const { name, browser } = parseUA(session.user_agent || '', t('unknownDevice'));

  return (
    <div
      className={`group relative flex flex-col lg:flex-row items-start lg:items-center justify-between p-5 bg-card rounded-3xl border transition-all duration-300 hover:shadow-xl hover:shadow-gray-200/40 dark:hover:shadow-black/20 ${
        isCurrent
          ? 'border-accent-button/30 bg-accent-button/5 shadow-sm shadow-accent-button/5'
          : 'border-border hover:border-accent-button/20'
      }`}
    >
      <div className="flex items-start lg:items-center gap-4 w-full">
        {/* Browser icon */}
        <div
          className={`shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center border transition-all duration-300 overflow-hidden ${
            isCurrent
              ? 'bg-accent-button border-accent-button text-white shadow-lg shadow-accent-button/30'
              : 'bg-muted border-border text-foreground group-hover:bg-card group-hover:border-accent-button/20 group-hover:scale-105'
          }`}
        >
          <BrowserIcon browser={browser} className="w-6 h-6 sm:w-8 sm:h-8" />
        </div>

        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            {/* User pill (admin) or device name first (user) */}
            {renderUserPill}

            {/* Device name */}
            <h4 className="font-bold text-text-primary text-base sm:text-lg tracking-tight break-all sm:break-normal whitespace-normal sm:whitespace-nowrap leading-snug">
              {name}
            </h4>

            {/* Web badge */}
            <span className="px-2 sm:px-2.5 py-0.5 text-[9px] sm:text-[10px] font-bold rounded-full border bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20 whitespace-nowrap">
              Web
            </span>

            {/* Extra badges (e.g. current device) */}
            {renderExtraBadges}
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
                <span
                  className="px-1.5 py-0.5 text-[9px] sm:text-[10px] bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-md font-sans border border-emerald-100 dark:border-emerald-800/30 truncate max-w-[100px] sm:max-w-[120px]"
                  title={session.isp}
                >
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
            onClick={onRevoke}
            disabled={deleting}
            className="w-full lg:w-auto flex items-center justify-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 text-xs font-bold text-red-600 bg-red-50/50 dark:bg-red-500/5 hover:bg-red-600 hover:text-white dark:hover:bg-red-600 dark:hover:text-white rounded-2xl transition-all duration-300 disabled:opacity-50 border border-red-100/50 dark:border-red-900/20 active:scale-95 whitespace-nowrap"
          >
            {deleting ? (
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
}

export function SessionsLoading({ t }: { t: (key: string) => string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-4">
      <div className="w-10 h-10 rounded-full border-2 border-accent-button/20 border-t-accent-button animate-spin" />
      <p className="text-sm text-text-quaternary font-medium animate-pulse">{t('loading')}</p>
    </div>
  );
}

export function SessionsSearch({
  value,
  onChange,
  t,
}: {
  value: string;
  onChange: (value: string) => void;
  t: (key: string) => string;
}) {
  return (
    <div className="bg-muted/50 rounded-3xl p-4 border border-border">
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-quaternary group-focus-within:text-accent-button transition-colors" />
        <input
          type="text"
          placeholder={t('searchPlaceholder')}
          className="w-full pl-12 pr-4 py-3 bg-card border border-border rounded-2xl outline-none focus:ring-2 focus:ring-accent-button/20 focus:border-accent-button/50 transition-all font-medium text-sm shadow-sm"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

export function SessionsEmpty({ t }: { t: (key: string) => string }) {
  return (
    <div className="text-center py-20 bg-muted/30 rounded-3xl border border-dashed border-border-strong">
      <ShieldCheck className="w-16 h-16 text-text-quaternary mx-auto mb-4" />
      <h3 className="text-xl font-bold text-text-primary">{t('noSessions')}</h3>
      <p className="text-sm text-text-tertiary mt-2">{t('noSessionsDesc')}</p>
    </div>
  );
}
