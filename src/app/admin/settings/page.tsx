'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useToast } from '@/components/ToastProvider';
import { getErrorMessage } from '@/lib/api-error';

export default function AdminSettingsPage() {
  const t = useTranslations('admin.settings');
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [config, setConfig] = useState<Record<string, any>>({});
  const [storageProvider, setStorageProvider] = useState<'local' | 's3'>('local');
  const [s3Preset, setS3Preset] = useState('cloudflare-r2');
  const [s3AccountId, setS3AccountId] = useState('');
  const [s3Endpoint, setS3Endpoint] = useState('');

  const generateEndpoint = useCallback((preset: string, accountId: string) => {
    if (preset === 'cloudflare-r2' && accountId.trim()) {
      return `https://${accountId.trim()}.r2.cloudflarestorage.com`;
    }
    return '';
  }, []);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      setConfig(data);
      setStorageProvider(data.storageProvider || 'local');
      setS3Preset(data.s3Preset || 'cloudflare-r2');
      setS3AccountId(data.s3AccountId || '');
      setS3Endpoint(data.s3Endpoint || '');
    } catch (err) {
      console.error('Failed to fetch config:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStorage = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const form = e.target as HTMLFormElement;
      const formData = new FormData(form);

      const storageConfig: Record<string, any> = {
        storageProvider: formData.get('storageProvider') || 'local',
        localStoragePath: formData.get('localStoragePath') || '/uploads/avatars',
        iconStoragePath: formData.get('iconStoragePath') || '/uploads/icons',
      };

      if (storageConfig.storageProvider === 's3') {
        storageConfig.s3Preset = formData.get('s3Preset') || 'cloudflare-r2';
        storageConfig.s3Endpoint = formData.get('s3Endpoint') || '';
        storageConfig.s3Region = formData.get('s3Region') || 'auto';
        storageConfig.s3AccessKeyId = formData.get('s3AccessKeyId') || '';
        storageConfig.s3SecretAccessKey = formData.get('s3SecretAccessKey') || '';
        storageConfig.s3BucketName = formData.get('s3BucketName') || '';
        storageConfig.s3PublicDomain = formData.get('s3PublicDomain') || '';
        storageConfig.s3FolderPath = formData.get('s3FolderPath') || 'avatars';
        storageConfig.s3IconFolderPath = formData.get('s3IconFolderPath') || 'icons';
        storageConfig.s3AccountId = formData.get('s3AccountId') || '';
      }

      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: storageConfig }),
      });

      const data = await res.json();

      if (res.ok) {
        success(t('settingsSaved'));
        fetchConfig();
      } else {
        error(getErrorMessage(data, t('saveFailed')));
      }
    } catch (err) {
      error(t('networkError'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-48 mb-6"></div>
          <div className="h-64 bg-muted rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">{t('title')}</h1>

      {/* Storage Settings */}
      <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-2xl">💾</span>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">{t('storage')}</h2>
            <p className="text-sm text-text-tertiary">{t('subtitle')}</p>
          </div>
        </div>

        <form onSubmit={handleSaveStorage} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">{t('storageType')}</label>
            <select
              name="storageProvider"
              value={storageProvider}
              onChange={(e) => setStorageProvider(e.target.value as 'local' | 's3')}
              className="w-full px-4 py-2.5 border border-border-input rounded-xl bg-card text-text-primary focus:outline-none focus:border-accent-foreground focus:ring-1 focus:ring-accent-foreground transition-colors"
            >
              <option value="local">{t('localStorage')}</option>
              <option value="s3">{t('s3Storage')}</option>
            </select>
          </div>

          {/* Local Storage Settings */}
          {storageProvider === 'local' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">{t('avatarStoragePath')}</label>
                <input
                  type="text"
                  name="localStoragePath"
                  defaultValue={config.localStoragePath || '/uploads/avatars'}
                  placeholder="/uploads/avatars"
                  className="w-full px-4 py-2.5 border border-border-input rounded-xl bg-card text-text-primary focus:outline-none focus:border-accent-foreground focus:ring-1 focus:ring-accent-foreground transition-colors"
                />
                <p className="mt-1 text-sm text-text-tertiary">
                  {t('avatarStoragePathDescription')}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">{t('iconStoragePath')}</label>
                <input
                  type="text"
                  name="iconStoragePath"
                  defaultValue={config.iconStoragePath || '/uploads/icons'}
                  placeholder="/uploads/icons"
                  className="w-full px-4 py-2.5 border border-border-input rounded-xl bg-card text-text-primary focus:outline-none focus:border-accent-foreground focus:ring-1 focus:ring-accent-foreground transition-colors"
                />
                <p className="mt-1 text-sm text-text-tertiary">
                  {t('iconStoragePathDescription')}
                </p>
              </div>
            </div>
          )}

          {/* S3 Storage Settings */}
          {storageProvider === 's3' && (
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-medium text-text-primary">{t('s3Config')}</h3>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">{t('s3Preset')}</label>
                <select
                  name="s3Preset"
                  value={s3Preset}
                  onChange={(e) => {
                    const newPreset = e.target.value;
                    setS3Preset(newPreset);
                    if (newPreset === 'cloudflare-r2') {
                      setS3Endpoint(generateEndpoint(newPreset, s3AccountId));
                    }
                  }}
                  className="w-full px-4 py-2.5 border border-border-input rounded-xl bg-card text-text-primary focus:outline-none focus:border-accent-foreground focus:ring-1 focus:ring-accent-foreground transition-colors"
                >
                  <option value="cloudflare-r2">Cloudflare R2</option>
                  <option value="tigris">Tigris Data</option>
                  <option value="aws-s3">AWS S3</option>
                  <option value="minio">MinIO</option>
                  <option value="custom">{t('s3Custom')}</option>
                </select>
                <p className="mt-1 text-sm text-text-tertiary">
                  {t('s3PresetDescription')}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Account ID</label>
                <input
                  type="text"
                  name="s3AccountId"
                  value={s3AccountId}
                  onChange={(e) => {
                    const newAccountId = e.target.value;
                    setS3AccountId(newAccountId);
                    if (s3Preset === 'cloudflare-r2') {
                      setS3Endpoint(generateEndpoint(s3Preset, newAccountId));
                    }
                  }}
                  placeholder="Cloudflare Account ID"
                  className="w-full px-4 py-2.5 border border-border-input rounded-xl bg-card text-text-primary focus:outline-none focus:border-accent-foreground focus:ring-1 focus:ring-accent-foreground transition-colors"
                />
                <p className="mt-1 text-sm text-text-tertiary">
                  {t('s3AccountIdDescription')}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Endpoint</label>
                <input
                  type="text"
                  name="s3Endpoint"
                  value={s3Endpoint}
                  onChange={(e) => setS3Endpoint(e.target.value)}
                  readOnly={s3Preset === 'cloudflare-r2'}
                  placeholder="https://..."
                  className={`w-full px-4 py-2.5 border border-border-input rounded-xl bg-card text-text-primary focus:outline-none focus:border-accent-foreground focus:ring-1 focus:ring-accent-foreground transition-colors ${s3Preset === 'cloudflare-r2' ? 'opacity-70 cursor-not-allowed' : ''}`}
                />
                {s3Preset === 'cloudflare-r2' && (
                  <p className="mt-1 text-sm text-text-tertiary">
                    R2 Endpoint 格式：https://{"{account-id}"}.r2.cloudflarestorage.com
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Region</label>
                <input
                  type="text"
                  name="s3Region"
                  defaultValue={config.s3Region || 'auto'}
                  placeholder="auto"
                  className="w-full px-4 py-2.5 border border-border-input rounded-xl bg-card text-text-primary focus:outline-none focus:border-accent-foreground focus:ring-1 focus:ring-accent-foreground transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Access Key ID</label>
                <input
                  type="text"
                  name="s3AccessKeyId"
                  defaultValue={config.s3AccessKeyId || ''}
                  placeholder="Access Key ID"
                  className="w-full px-4 py-2.5 border border-border-input rounded-xl bg-card text-text-primary focus:outline-none focus:border-accent-foreground focus:ring-1 focus:ring-accent-foreground transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Secret Access Key</label>
                <input
                  type="password"
                  name="s3SecretAccessKey"
                  defaultValue={config.s3SecretAccessKey || ''}
                  placeholder="Secret Access Key"
                  className="w-full px-4 py-2.5 border border-border-input rounded-xl bg-card text-text-primary focus:outline-none focus:border-accent-foreground focus:ring-1 focus:ring-accent-foreground transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Bucket Name</label>
                <input
                  type="text"
                  name="s3BucketName"
                  defaultValue={config.s3BucketName || ''}
                  placeholder="my-bucket"
                  className="w-full px-4 py-2.5 border border-border-input rounded-xl bg-card text-text-primary focus:outline-none focus:border-accent-foreground focus:ring-1 focus:ring-accent-foreground transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Public Domain</label>
                <input
                  type="text"
                  name="s3PublicDomain"
                  defaultValue={config.s3PublicDomain || ''}
                  placeholder="https://..."
                  className="w-full px-4 py-2.5 border border-border-input rounded-xl bg-card text-text-primary focus:outline-none focus:border-accent-foreground focus:ring-1 focus:ring-accent-foreground transition-colors"
                />
                <p className="mt-1 text-sm text-text-tertiary">
                  {t('s3PublicDomainDescription')}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">{t('s3AvatarFolderPath')}</label>
                <input
                  type="text"
                  name="s3FolderPath"
                  defaultValue={config.s3FolderPath || 'avatars'}
                  placeholder="avatars"
                  className="w-full px-4 py-2.5 border border-border-input rounded-xl bg-card text-text-primary focus:outline-none focus:border-accent-foreground focus:ring-1 focus:ring-accent-foreground transition-colors"
                />
                <p className="mt-1 text-sm text-text-tertiary">
                  {t('s3AvatarFolderPathDescription')}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">{t('s3IconFolderPath')}</label>
                <input
                  type="text"
                  name="s3IconFolderPath"
                  defaultValue={config.s3IconFolderPath || 'icons'}
                  placeholder="icons"
                  className="w-full px-4 py-2.5 border border-border-input rounded-xl bg-card text-text-primary focus:outline-none focus:border-accent-foreground focus:ring-1 focus:ring-accent-foreground transition-colors"
                />
                <p className="mt-1 text-sm text-text-tertiary">
                  {t('s3IconFolderPathDescription')}
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4 gap-3">
            {storageProvider === 's3' && (
              <button
                type="button"
                disabled={testing}
                onClick={async () => {
                  const form = document.querySelector('form') as HTMLFormElement;
                  const formData = new FormData(form);

                  setTesting(true);
                  try {
                    const res = await fetch('/api/admin/settings/test-connection', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        s3Endpoint: formData.get('s3Endpoint'),
                        s3Region: formData.get('s3Region') || 'auto',
                        s3AccessKeyId: formData.get('s3AccessKeyId'),
                        s3SecretAccessKey: formData.get('s3SecretAccessKey'),
                        s3BucketName: formData.get('s3BucketName'),
                        s3PublicDomain: formData.get('s3PublicDomain'),
                        s3FolderPath: formData.get('s3FolderPath') || 'avatars',
                      }),
                    });
                    const data = await res.json();
                    if (res.ok) {
                      success(t('connectionSuccess'));
                    } else {
                      error(getErrorMessage(data, t('connectionFailed')));
                    }
                  } catch (err) {
                    error(t('networkError'));
                  } finally {
                    setTesting(false);
                  }
                }}
                className="px-4 py-2.5 border border-border text-text-secondary rounded-xl hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {testing && (
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {testing ? t('testing') : t('testConnection')}
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-accent-button text-white rounded-xl font-medium hover:bg-accent-button-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving && (
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {saving ? t('saving') : t('save')}
            </button>
          </div>
        </form>
      </div>

      {/* Database Info */}
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
    </div>
  );
}