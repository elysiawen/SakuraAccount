'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useToast } from '@/components/ToastProvider';
import { JSON_HEADERS } from '@/lib/constants';

const STORAGE_KEY = 'require_email_verification';

export default function RegistrationSettingsPanel() {
  const t = useTranslations('admin.settings.registration');
  const { success, error } = useToast();
  const [enabled, setEnabled] = useState(true);
  const [smtpReady, setSmtpReady] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/settings', { headers: JSON_HEADERS }).then(r => r.json()),
      fetch('/api/admin/settings/email-status', { headers: JSON_HEADERS }).then(r => r.json()),
    ]).then(([config, emailStatus]) => {
      const emailConfigured = emailStatus.configured === true;
      setSmtpReady(emailConfigured);

      const currentVal = config[STORAGE_KEY];
      const currentEnabled = currentVal === undefined ? true : Boolean(currentVal);

      // If SMTP is not configured but verification is ON, force it OFF
      if (!emailConfigured && currentEnabled) {
        fetch('/api/admin/settings', {
          method: 'PUT',
          headers: JSON_HEADERS,
          body: JSON.stringify({ key: STORAGE_KEY, value: false }),
        });
        setEnabled(false);
      } else {
        setEnabled(currentEnabled);
      }
      setInitialized(true);
    }).catch(() => setInitialized(true));
  }, []);

  const handleToggle = async () => {
    if (!smtpReady) {
      error(t('smtpRequired'));
      return;
    }
    const newVal = !enabled;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: JSON_HEADERS,
        body: JSON.stringify({ key: STORAGE_KEY, value: newVal }),
      });
      if (res.ok) {
        setEnabled(newVal);
        success(t(newVal ? 'enabled' : 'disabled'));
      } else {
        const data = await res.json();
        error(data.message || t('saveFailed'));
      }
    } catch {
      error(t('saveFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (!initialized) return null;

  const canToggle = smtpReady;

  return (
    <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-2xl">🔐</span>
        <h2 className="text-lg font-semibold text-text-primary">{t('title')}</h2>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-text-primary font-medium">{t('label')}</p>
          <p className="text-xs text-text-tertiary mt-1">
            {smtpReady ? t('desc') : t('smtpRequired')}
          </p>
        </div>
        <button
          onClick={handleToggle}
          disabled={loading}
          className={`relative w-12 h-6 rounded-full transition-colors duration-200 disabled:opacity-50 ${
            enabled && canToggle ? 'bg-accent-button' : 'bg-border-strong'
          }`}
          title={!smtpReady ? t('smtpRequired') : undefined}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
              enabled && canToggle ? 'translate-x-6' : ''
            }`}
          />
        </button>
      </div>
    </div>
  );
}
