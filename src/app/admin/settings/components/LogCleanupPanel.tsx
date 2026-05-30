'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/components/ConfirmProvider';
import { Spinner } from '@/components/Spinner';

const CATEGORIES = ['access', 'auth', 'operation'] as const;

export default function LogCleanupPanel() {
  const t = useTranslations('admin.settings.logCleanup');
  const { success, error } = useToast();
  const { confirm } = useConfirm();
  const [cleaning, setCleaning] = useState(false);
  const [mode, setMode] = useState('30');
  const [customDays, setCustomDays] = useState(30);
  const [selected, setSelected] = useState<Record<string, boolean>>({
    access: true,
    auth: true,
    operation: true,
  });

  const getDays = () => {
    if (mode === 'custom') return customDays;
    return parseInt(mode);
  };

  const toggleCategory = (key: string) => {
    setSelected((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCleanup = async () => {
    const days = getDays();
    const categories = Object.entries(selected).filter(([, v]) => v).map(([k]) => k);

    if (categories.length === 0) {
      error(t('selectCategoryError'));
      return;
    }

    const label = mode === '0'
      ? t('allLogs')
      : t('daysCount', { days });

    confirm(t('confirmMsg', { range: label }), {
      confirmText: t('confirmButton'),
      confirmColor: 'red',
      onConfirm: async () => {
        setCleaning(true);
        try {
          const res = await fetch('/api/admin/audit-logs/cleanup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ days, categories }),
          });
          const data = await res.json();
          if (res.ok) {
            success(t('cleanedSuccess', { count: data.deleted }));
          } else {
            error(data.error || t('cleanFailed'));
          }
        } catch {
          error(t('cleanFailed'));
        } finally {
          setCleaning(false);
        }
      },
    });
  };

  return (
    <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-2xl">🗑️</span>
        <div>
          <h2 className="text-lg font-semibold text-text-primary">{t('title')}</h2>
          <p className="text-sm text-text-tertiary">{t('subtitle')}</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Retention */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">{t('retention')}</label>
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="w-full sm:w-56 px-4 py-2.5 border border-border-input rounded-xl bg-card text-text-primary focus:outline-none focus:border-accent-foreground focus:ring-1 focus:ring-accent-foreground transition-colors"
            >
              <option value="30">{t('preset30')}</option>
              <option value="180">{t('preset180')}</option>
              <option value="365">{t('preset365')}</option>
              <option value="0">{t('presetAll')}</option>
              <option value="custom">{t('custom')}</option>
            </select>

            {mode === 'custom' && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={customDays}
                  onChange={(e) => setCustomDays(Math.max(0, parseInt(e.target.value) || 0))}
                  min="0"
                  className="w-24 px-3 py-2.5 border border-border-input rounded-xl bg-card text-text-primary focus:outline-none focus:border-accent-foreground focus:ring-1 focus:ring-accent-foreground transition-colors"
                />
                <span className="text-sm text-text-tertiary">{t('days')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Category checkboxes */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">{t('scope')}</label>
          <div className="flex flex-wrap gap-3 bg-muted p-4 rounded-xl border border-border">
            {CATEGORIES.map((key) => (
              <label key={key} className="inline-flex items-center gap-2 cursor-pointer px-2 py-1 rounded-lg hover:bg-card transition-colors">
                <input
                  type="checkbox"
                  checked={selected[key]}
                  onChange={() => toggleCategory(key)}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-sm text-text-primary">{t(`cat_${key}`)}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Action */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
          <button
            onClick={handleCleanup}
            disabled={cleaning}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-destructive text-white rounded-xl font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {cleaning ? (
              <>
                <Spinner className="h-4 w-4" />
                {t('cleaning')}
              </>
            ) : (
              <>
                <span>🧹</span>
                {getDays() === 0 ? t('cleanAll') : t('execute')}
              </>
            )}
          </button>
          <p className="text-xs text-text-quaternary">{t('helpText')}</p>
        </div>
      </div>
    </div>
  );
}
