'use client';

import { useTranslations } from 'next-intl';

export default function DatabaseInfoPanel() {
  const t = useTranslations('admin.settings');

  return (
    <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-2xl">📊</span>
        <h2 className="text-lg font-semibold text-text-primary">{t('databaseInfo')}</h2>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between py-2 border-b border-border">
          <span className="text-text-secondary">{t('databaseType')}</span>
          <span className="font-medium text-text-primary">{process.env.DB_TYPE || 'postgres'}</span>
        </div>
        <div className="flex items-center justify-between py-2">
          <span className="text-text-secondary">{t('status')}</span>
          <span className="text-xs px-2 py-0.5 bg-success text-success-foreground rounded-full">{t('statusNormal')}</span>
        </div>
      </div>
    </div>
  );
}
