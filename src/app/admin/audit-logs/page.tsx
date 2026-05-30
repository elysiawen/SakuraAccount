'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Pagination from '@/components/Pagination';
import Search from '@/components/Search';
import Modal from '@/components/Modal';
import { Globe, Shield, Settings } from 'lucide-react';

interface AuditLog {
  id: number;
  user_id: number;
  username: string;
  category: string;
  action: string;
  details: unknown;
  ip: string;
  user_agent: string;
  created_at: string;
}

const CATEGORIES = [
  { key: 'access', icon: Globe },
  { key: 'auth', icon: Shield },
  { key: 'operation', icon: Settings },
] as const;

export default function AuditLogsPage() {
  return (
    <Suspense fallback={null}>
      <AuditLogsContent />
    </Suspense>
  );
}

function AuditLogsContent() {
  const t = useTranslations('admin.auditLogs');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const activeCategory = searchParams.get('category') || 'access';
  const search = searchParams.get('search') || '';

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), limit: String(limit), category: activeCategory });
      if (search) params.set('search', search);
      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);
      const data = await res.json();
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, [activeCategory, limit, page, search]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchLogs();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [fetchLogs]);

  const switchCategory = (category: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('category', category);
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      page_visit: t('actionPageVisit'),
      login_success: t('actionLoginSuccess'),
      login_failed: t('actionLoginFailed'),
      register: t('actionRegister'),
      logout: t('actionLogout'),
      oauth_authorize: t('actionOAuthAuthorize'),
      password_changed: t('actionChangePassword'),
      profile_updated: t('actionProfileUpdated'),
      account_deleted: t('actionAccountDeleted'),
      session_revoked: t('actionRevokeSession'),
      sessions_revoked_all: t('actionRevokeAllSessions'),
      admin_delete_user: t('actionDeleteUser'),
      admin_update_user_role: t('actionChangeRole'),
      admin_update_user: t('actionUpdateUser'),
      admin_update_setting: t('actionUpdateSetting'),
      admin_update_settings: t('actionUpdateSettings'),
    };
    return labels[action] || action;
  };

  const getActionColor = (action: string) => {
    if (action.includes('failed') || action.includes('delete') || action.includes('deleted')) {
      return 'text-error-foreground bg-error';
    }
    if (action.includes('admin')) {
      return 'text-warning-foreground bg-warning';
    }
    if (action.includes('success') || action === 'register' || action === 'oauth_authorize') {
      return 'text-success-foreground bg-success';
    }
    return 'text-info-foreground bg-info';
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold text-text-primary">{t('title')}</h1>

      {/* Category Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl w-full sm:w-fit overflow-x-auto">
        {CATEGORIES.map(({ key, icon: Icon }) => (
          <button
            key={key}
            onClick={() => switchCategory(key)}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeCategory === key
                ? 'bg-card text-text-primary shadow-sm'
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {t(`tab${key.charAt(0).toUpperCase() + key.slice(1)}`)}
          </button>
        ))}
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden min-w-0">
        <div className="p-3 sm:p-4 border-b border-border">
          <Search placeholder={t('searchPlaceholder')} />
        </div>

        {loading ? (
          <div className="p-3 sm:p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-muted rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : logs.length > 0 ? (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-5 py-3 text-xs font-medium text-text-tertiary tracking-wider uppercase">{t('user')}</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-text-tertiary tracking-wider uppercase">{t('action')}</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-text-tertiary tracking-wider uppercase">{t('ip')}</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-text-tertiary tracking-wider uppercase">{t('details')}</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-text-tertiary tracking-wider uppercase">{t('timestamp')}</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-text-primary">{log.username || '-'}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getActionColor(log.action)}`}>
                          {getActionLabel(log.action)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-text-secondary font-mono">
                        {log.ip || '-'}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-text-tertiary max-w-xs truncate">
                        {log.details ? JSON.stringify(log.details) : '-'}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-text-tertiary">
                        {new Date(log.created_at).toLocaleString('zh-CN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-border">
              {logs.map((log) => (
                <div
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className="p-4 space-y-2 active:bg-muted/60 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-text-primary text-sm truncate">{log.username || '-'}</p>
                    <span className={`text-[10px] leading-tight px-1.5 py-0.5 rounded-full font-medium shrink-0 ${getActionColor(log.action)}`}>
                      {getActionLabel(log.action)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-text-quaternary">
                    <span className="font-mono">{log.ip || '-'}</span>
                    <span className="shrink-0">·</span>
                    <span className="shrink-0">{new Date(log.created_at).toLocaleString('zh-CN')}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-border">
              <Pagination total={total} currentPage={page} itemsPerPage={limit} />
            </div>
          </>
        ) : (
          <div className="text-center py-12 sm:py-16">
            <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📋</span>
            </div>
            <p className="text-text-secondary font-medium">{t('noLogs')}</p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title={t('logDetail')}
      >
        {selectedLog && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-text-quaternary mb-1">{t('user')}</p>
                <p className="text-sm font-medium text-text-primary">{selectedLog.username || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-text-quaternary mb-1">{t('action')}</p>
                <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${getActionColor(selectedLog.action)}`}>
                  {getActionLabel(selectedLog.action)}
                </span>
              </div>
              <div>
                <p className="text-xs text-text-quaternary mb-1">{t('ip')}</p>
                <p className="text-sm text-text-primary font-mono">{selectedLog.ip || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-text-quaternary mb-1">{t('timestamp')}</p>
                <p className="text-sm text-text-primary">{new Date(selectedLog.created_at).toLocaleString('zh-CN')}</p>
              </div>
            </div>

            {selectedLog.user_agent && (
              <div>
                <p className="text-xs text-text-quaternary mb-1">User Agent</p>
                <p className="text-sm text-text-secondary break-all">{selectedLog.user_agent}</p>
              </div>
            )}

            {selectedLog.details != null && (
              <div>
                <p className="text-xs text-text-quaternary mb-1">{t('details')}</p>
                <pre className="text-sm text-text-secondary bg-muted rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all">
                  {typeof selectedLog.details === 'string'
                    ? selectedLog.details
                    : JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
