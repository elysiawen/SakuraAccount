'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

interface AdminOverviewClientProps {
  userCount: number;
  sessionCount: number;
  auditLogCount: number;
}

export default function AdminOverviewClient({
  userCount,
  sessionCount,
  auditLogCount,
}: AdminOverviewClientProps) {
  const t = useTranslations('admin.overview');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">{t('title')}</h1>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-2xl p-6 border border-blue-200 dark:border-blue-800 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-200">{t('totalUsers')}</h3>
            <span className="text-2xl">👥</span>
          </div>
          <p className="text-4xl font-bold text-blue-900 dark:text-blue-100">{userCount}</p>
          <Link href="/admin/users" className="text-xs text-blue-700 dark:text-blue-300 mt-1 hover:underline">
            {t('totalUsers')} →
          </Link>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 rounded-2xl p-6 border border-green-200 dark:border-green-800 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-green-900 dark:text-green-200">{t('activeSessions')}</h3>
            <span className="text-2xl">📱</span>
          </div>
          <p className="text-4xl font-bold text-green-900 dark:text-green-100">{sessionCount}</p>
          <p className="text-xs text-green-700 dark:text-green-300 mt-1">{t('subtitle')}</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 rounded-2xl p-6 border border-purple-200 dark:border-purple-800 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-purple-900 dark:text-purple-200">{t('todayLogins')}</h3>
            <span className="text-2xl">📋</span>
          </div>
          <p className="text-4xl font-bold text-purple-900 dark:text-purple-100">{auditLogCount}</p>
          <Link href="/admin/audit-logs" className="text-xs text-purple-700 dark:text-purple-300 mt-1 hover:underline">
            {t('recentActivity')} →
          </Link>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
        <h2 className="text-lg font-semibold text-text-primary mb-4">{t('subtitle')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/admin/users"
            className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-accent-foreground/30 hover:bg-accent/50 transition-all group"
          >
            <span className="text-2xl group-hover:scale-110 transition-transform">👥</span>
            <div>
              <p className="font-medium text-text-primary">{t('totalUsers')}</p>
              <p className="text-xs text-text-tertiary">{t('subtitle')}</p>
            </div>
          </Link>
          <Link
            href="/admin/applications"
            className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-accent-foreground/30 hover:bg-accent/50 transition-all group"
          >
            <span className="text-2xl group-hover:scale-110 transition-transform">🔗</span>
            <div>
              <p className="font-medium text-text-primary">{t('totalApps')}</p>
              <p className="text-xs text-text-tertiary">{t('totalApps')}</p>
            </div>
          </Link>
          <Link
            href="/admin/audit-logs"
            className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-accent-foreground/30 hover:bg-accent/50 transition-all group"
          >
            <span className="text-2xl group-hover:scale-110 transition-transform">📋</span>
            <div>
              <p className="font-medium text-text-primary">{t('todayLogins')}</p>
              <p className="text-xs text-text-tertiary">{t('noActivity')}</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
