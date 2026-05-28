'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface OverviewClientProps {
  username: string;
  nickname?: string;
  email: string;
  role: string;
  sessionsCount: number;
  userCreatedAt: number;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
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
}: OverviewClientProps) {
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
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600"></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-2">欢迎回来，{nickname || username}</h1>
          <p className="text-blue-100">这里是您的 Sakura Account 控制台</p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Account Status */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-2xl p-6 border border-blue-200 dark:border-blue-800 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-200">账号状态</h3>
            <span className="text-2xl">✅</span>
          </div>
          <p className="text-lg font-bold text-blue-900 dark:text-blue-100">正常</p>
          <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">账号运行正常</p>
        </div>

        {/* Active Sessions */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 rounded-2xl p-6 border border-purple-200 dark:border-purple-800 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-purple-900 dark:text-purple-200">活跃会话</h3>
            <span className="text-2xl">📱</span>
          </div>
          <p className="text-4xl font-bold text-purple-900 dark:text-purple-100">{sessionsCount}</p>
          <Link href="/dashboard/sessions" className="text-xs text-purple-700 dark:text-purple-300 mt-1 hover:underline">
            管理会话 →
          </Link>
        </div>

        {/* Registration Time */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 rounded-2xl p-6 border border-green-200 dark:border-green-800 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-green-900 dark:text-green-200">注册时间</h3>
            <span className="text-2xl">📅</span>
          </div>
          <p className="text-lg font-bold text-green-900 dark:text-green-100">{formatDate(new Date(userCreatedAt).getTime())}</p>
          <p className="text-xs text-green-700 dark:text-green-300 mt-1">已使用 {daysUsed} 天</p>
        </div>

        {/* Security Score */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 rounded-2xl p-6 border border-orange-200 dark:border-orange-800 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-orange-900 dark:text-orange-200">安全评分</h3>
            <span className="text-2xl">🛡️</span>
          </div>
          <p className="text-4xl font-bold text-orange-900 dark:text-orange-100">
            {(emailVerified ? 40 : 0) + (twoFactorEnabled ? 40 : 0) + 20}
          </p>
          <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
            {emailVerified ? '邮箱已验证' : '邮箱未验证'}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
        <h2 className="text-lg font-semibold text-text-primary mb-4">快速操作</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-accent-foreground/30 hover:bg-accent/50 transition-all group"
          >
            <span className="text-2xl group-hover:scale-110 transition-transform">⚙️</span>
            <div>
              <p className="font-medium text-text-primary">设置</p>
              <p className="text-xs text-text-tertiary">个人资料、密码、Passkey</p>
            </div>
          </Link>
          <Link
            href="/dashboard/sessions"
            className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-accent-foreground/30 hover:bg-accent/50 transition-all group"
          >
            <span className="text-2xl group-hover:scale-110 transition-transform">📱</span>
            <div>
              <p className="font-medium text-text-primary">登录会话管理</p>
              <p className="text-xs text-text-tertiary">查看和管理登录设备</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Account Info */}
      <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
        <h2 className="text-lg font-semibold text-text-primary mb-4">账号信息</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
            <span className="text-text-secondary">用户名</span>
            <span className="font-medium text-text-primary">{username}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
            <span className="text-text-secondary">邮箱</span>
            <div className="flex items-center gap-2">
              <span className="font-medium text-text-primary">{email}</span>
              {emailVerified ? (
                <span className="text-xs px-2 py-0.5 bg-success text-success-foreground rounded-full">已验证</span>
              ) : (
                <span className="text-xs px-2 py-0.5 bg-warning text-warning-foreground rounded-full">未验证</span>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
            <span className="text-text-secondary">昵称</span>
            <span className="font-medium text-text-primary">{nickname || '-'}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
            <span className="text-text-secondary">角色</span>
            <span className="font-medium text-text-primary capitalize">{role}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-text-secondary">双因素认证</span>
            {twoFactorEnabled ? (
              <span className="text-xs px-2 py-0.5 bg-success text-success-foreground rounded-full">已启用</span>
            ) : (
              <span className="text-xs px-2 py-0.5 bg-muted text-text-tertiary rounded-full">未启用</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
