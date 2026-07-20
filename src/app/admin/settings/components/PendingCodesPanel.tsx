'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useToast } from '@/components/ToastProvider';
import { JSON_HEADERS } from '@/lib/constants';

interface PendingCode {
  id: number;
  email: string;
  expires_at: string;
  created_at: string;
}

export default function PendingCodesPanel() {
  const t = useTranslations('admin.settings.pendingCodes');
  const { success, error } = useToast();
  const [codes, setCodes] = useState<PendingCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const fetchCodes = useCallback(() => {
    setLoading(true);
    fetch('/api/admin/pending-codes', { headers: JSON_HEADERS })
      .then(r => r.json())
      .then(data => setCodes(data.codes || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchCodes(); }, [fetchCodes]);

  const handleClean = async () => {
    try {
      const res = await fetch('/api/admin/pending-codes', {
        method: 'DELETE',
        headers: JSON_HEADERS,
      });
      if (res.ok) {
        success(t('cleaned'));
        fetchCodes();
      } else {
        error(t('cleanFailed'));
      }
    } catch {
      error(t('cleanFailed'));
    }
  };

  if (loading) return null;

  return (
    <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📧</span>
          <h2 className="text-lg font-semibold text-text-primary">{t('title')}</h2>
          {codes.length > 0 && (
            <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium">
              {codes.length}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {codes.length > 0 && (
            <button
              onClick={handleClean}
              className="text-xs text-text-tertiary hover:text-red-500 transition-colors"
            >
              {t('cleanExpired')}
            </button>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-accent-button hover:text-accent-button-hover transition-colors"
          >
            {expanded ? t('collapse') : t('expand')}
          </button>
        </div>
      </div>

      {codes.length === 0 ? (
        <p className="text-sm text-text-tertiary">{t('empty')}</p>
      ) : !expanded ? (
        <p className="text-sm text-text-tertiary">
          {t('count', { count: codes.length })}
          {codes.length > 0 && (
            <span className="ml-1">
              {codes.slice(0, 3).map(c => c.email).join(', ')}
              {codes.length > 3 && '...'}
            </span>
          )}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-text-tertiary border-b border-border">
                <th className="text-left py-2 font-medium">{t('email')}</th>
                <th className="text-left py-2 font-medium">{t('sentAt')}</th>
                <th className="text-left py-2 font-medium">{t('expiresAt')}</th>
              </tr>
            </thead>
            <tbody>
              {codes.map(c => (
                <tr key={c.id} className="border-b border-border/50">
                  <td className="py-2 text-text-primary">{c.email}</td>
                  <td className="py-2 text-text-tertiary">
                    {new Date(c.created_at).toLocaleString()}
                  </td>
                  <td className="py-2">
                    <span className={new Date(c.expires_at) < new Date() ? 'text-red-400' : 'text-text-tertiary'}>
                      {new Date(c.expires_at).toLocaleString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
