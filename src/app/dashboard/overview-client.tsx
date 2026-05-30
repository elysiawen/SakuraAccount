'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

interface OverviewClientProps {
  username: string;
  nickname?: string;
  email: string;
  role: string;
  sessionsCount: number;
  userCreatedAt: number;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  bannerUrl?: string;
}

export default function OverviewClient({
  username,
  nickname,
  email,
  role,
  sessionsCount,
  userCreatedAt,
  emailVerified,
  twoFactorEnabled,
  bannerUrl,
}: OverviewClientProps) {
  const t = useTranslations('dashboard.overview');

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const daysUsed = Math.floor((Date.now() - new Date(userCreatedAt).getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Welcome Header */}
      <div className="relative rounded-2xl p-8 text-white shadow-lg overflow-hidden">
        {bannerUrl ? (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${bannerUrl})` }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600" />
        )}
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-2">{t('welcome', { name: nickname || username })}</h1>
          <p className="text-blue-100">{t('subtitle')}</p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Account Status */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-2xl p-6 border border-blue-200 dark:border-blue-800 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-200">{t('accountStatus')}</h3>
            <span className="text-2xl">✅</span>
          </div>
          <p className="text-lg font-bold text-blue-900 dark:text-blue-100">{t('statusNormal')}</p>
          <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">{t('statusDesc')}</p>
        </div>

        {/* Active Sessions */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 rounded-2xl p-6 border border-purple-200 dark:border-purple-800 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-purple-900 dark:text-purple-200">{t('activeSessions')}</h3>
            <span className="text-2xl">📱</span>
          </div>
          <p className="text-4xl font-bold text-purple-900 dark:text-purple-100">{sessionsCount}</p>
          <Link href="/dashboard/sessions" className="text-xs text-purple-700 dark:text-purple-300 mt-1 hover:underline">
            {t('manageSessions')}
          </Link>
        </div>

        {/* Registration Time */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 rounded-2xl p-6 border border-green-200 dark:border-green-800 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-green-900 dark:text-green-200">{t('registeredAt')}</h3>
            <span className="text-2xl">📅</span>
          </div>
          <p className="text-lg font-bold text-green-900 dark:text-green-100">{formatDate(new Date(userCreatedAt).getTime())}</p>
          <p className="text-xs text-green-700 dark:text-green-300 mt-1">{t('daysUsed', { days: daysUsed })}</p>
        </div>

      </div>

      {/* Quick Actions */}
      <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
        <h2 className="text-lg font-semibold text-text-primary mb-4">{t('quickActions')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-accent-foreground/30 hover:bg-accent/50 transition-all group"
          >
            <span className="text-2xl group-hover:scale-110 transition-transform">⚙️</span>
            <div>
              <p className="font-medium text-text-primary">{t('settings')}</p>
              <p className="text-xs text-text-tertiary">{t('settingsDesc')}</p>
            </div>
          </Link>
          <Link
            href="/dashboard/sessions"
            className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-accent-foreground/30 hover:bg-accent/50 transition-all group"
          >
            <span className="text-2xl group-hover:scale-110 transition-transform">📱</span>
            <div>
              <p className="font-medium text-text-primary">{t('sessions')}</p>
              <p className="text-xs text-text-tertiary">{t('sessionsDesc')}</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Account Info */}
      <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
        <h2 className="text-lg font-semibold text-text-primary mb-4">{t('accountInfo')}</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
            <span className="text-text-secondary">{t('username')}</span>
            <span className="font-medium text-text-primary">{username}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
            <span className="text-text-secondary">{t('email')}</span>
            <div className="flex items-center gap-2">
              <span className="font-medium text-text-primary">{email}</span>
              {emailVerified ? (
                <span className="text-xs px-2 py-0.5 bg-success text-success-foreground rounded-full">{t('verified')}</span>
              ) : (
                <span className="text-xs px-2 py-0.5 bg-warning text-warning-foreground rounded-full">{t('unverified')}</span>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
            <span className="text-text-secondary">{t('nickname')}</span>
            <span className="font-medium text-text-primary">{nickname || '-'}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
            <span className="text-text-secondary">{t('role')}</span>
            <span className="font-medium text-text-primary capitalize">{role}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-text-secondary">{t('twoFactor')}</span>
            {twoFactorEnabled ? (
              <span className="text-xs px-2 py-0.5 bg-success text-success-foreground rounded-full">{t('enabled')}</span>
            ) : (
              <span className="text-xs px-2 py-0.5 bg-muted text-text-tertiary rounded-full">{t('notEnabled')}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
