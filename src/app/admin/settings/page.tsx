'use client';

import { useState } from 'react';
import { useToast } from '@/components/ToastProvider';

export default function AdminSettingsPage() {
  const { success, error } = useToast();
  const [settings, setSettings] = useState({
    appName: process.env.NEXT_PUBLIC_APP_NAME || 'Sakura Account',
    allowRegistration: true,
    requireEmailVerification: false,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">系统设置</h1>

      <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
        <h2 className="text-lg font-semibold text-text-primary mb-4">基本设置</h2>
        <div className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">应用名称</label>
            <input
              type="text"
              value={settings.appName}
              onChange={(e) => setSettings({ ...settings, appName: e.target.value })}
              className="w-full px-4 py-2.5 border border-border-input rounded-xl bg-card text-text-primary focus:outline-none focus:border-accent-foreground focus:ring-1 focus:ring-accent-foreground transition-colors"
            />
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-text-primary">允许注册</p>
              <p className="text-sm text-text-tertiary">是否允许新用户注册</p>
            </div>
            <button
              onClick={() => setSettings({ ...settings, allowRegistration: !settings.allowRegistration })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.allowRegistration ? 'bg-accent-button' : 'bg-border-strong'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.allowRegistration ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-text-primary">邮箱验证</p>
              <p className="text-sm text-text-tertiary">是否要求邮箱验证</p>
            </div>
            <button
              onClick={() => setSettings({ ...settings, requireEmailVerification: !settings.requireEmailVerification })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.requireEmailVerification ? 'bg-accent-button' : 'bg-border-strong'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.requireEmailVerification ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
        <h2 className="text-lg font-semibold text-text-primary mb-4">数据库信息</h2>
        <div className="space-y-2">
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-text-secondary">数据库类型</span>
            <span className="font-medium text-text-primary">{process.env.DB_TYPE || 'postgres'}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-text-secondary">状态</span>
            <span className="text-xs px-2 py-0.5 bg-success text-success-foreground rounded-full">正常</span>
          </div>
        </div>
      </div>
    </div>
  );
}
