'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useToast } from '@/components/ToastProvider';
import { getErrorMessage } from '@/lib/api-error';
import { S3_PRESETS, buildS3Endpoint } from '@/lib/storage/utils';
import { Spinner } from '@/components/Spinner';
import { JSON_HEADERS } from '@/lib/constants';

export default function StorageSettingsPanel() {
  const t = useTranslations('admin.settings');
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  interface StorageSettingsConfig {
    storageProvider?: 'local' | 's3';
    localStoragePath?: string;
    iconStoragePath?: string;
    s3Preset?: string;
    s3AccountId?: string;
    s3Endpoint?: string;
    s3Region?: string;
    s3AccessKeyId?: string;
    s3SecretAccessKey?: string;
    s3BucketName?: string;
    s3PublicDomain?: string;
    s3FolderPath?: string;
    s3IconFolderPath?: string;
  }

  const [config, setConfig] = useState<StorageSettingsConfig>({});
  const [storageProvider, setStorageProvider] = useState<'local' | 's3'>('local');
  const [s3Preset, setS3Preset] = useState('cloudflare-r2');
  const [s3AccountId, setS3AccountId] = useState('');
  const [s3Endpoint, setS3Endpoint] = useState('');
  const [s3Region, setS3Region] = useState('auto');

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/settings');
      const data = (await res.json()) as StorageSettingsConfig;
      setConfig(data);
      setStorageProvider(data.storageProvider || 'local');
      const preset = data.s3Preset || 'cloudflare-r2';
      setS3Preset(preset);
      setS3AccountId(data.s3AccountId || '');
      setS3Region(data.s3Region || S3_PRESETS[preset]?.defaultRegion || 'auto');
      setS3Endpoint(data.s3Endpoint || buildS3Endpoint(preset, data.s3AccountId, data.s3Region));
    } catch (err) {
      console.error('Failed to fetch config:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchConfig();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [fetchConfig]);

  const handlePresetChange = (preset: string) => {
    setS3Preset(preset);
    const defaultRegion = S3_PRESETS[preset]?.defaultRegion || 'auto';
    setS3Region(defaultRegion);

    if (preset === 'cloudflare-r2') {
      setS3Endpoint(buildS3Endpoint(preset, s3AccountId, defaultRegion));
    } else if (preset === 'tigris' || preset === 'aws-s3') {
      setS3Endpoint(buildS3Endpoint(preset, undefined, defaultRegion));
    } else {
      setS3Endpoint('');
    }
  };

  const handleAccountIdChange = (accountId: string) => {
    setS3AccountId(accountId);
    if (s3Preset === 'cloudflare-r2') {
      setS3Endpoint(buildS3Endpoint(s3Preset, accountId, s3Region));
    }
  };

  const handleRegionChange = (region: string) => {
    setS3Region(region);
    if (s3Preset === 'aws-s3') {
      setS3Endpoint(buildS3Endpoint(s3Preset, undefined, region));
    }
  };

  const getFormString = (formData: FormData, key: string, fallback: string): string => {
    const value = formData.get(key);
    return typeof value === 'string' ? value : fallback;
  };

  const isEndpointEditable = s3Preset === 'custom' || s3Preset === 'minio';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const form = e.target as HTMLFormElement;
      const formData = new FormData(form);
      const storageProviderValue = getFormString(formData, 'storageProvider', 'local');

      const storageConfig: StorageSettingsConfig = {
        storageProvider: storageProviderValue === 's3' ? 's3' : 'local',
        localStoragePath: getFormString(formData, 'localStoragePath', '/uploads/avatars'),
        iconStoragePath: getFormString(formData, 'iconStoragePath', '/uploads/icons'),
      };

      if (storageConfig.storageProvider === 's3') {
        storageConfig.s3Preset = getFormString(formData, 's3Preset', 'cloudflare-r2');
        storageConfig.s3Endpoint = getFormString(formData, 's3Endpoint', '');
        storageConfig.s3Region = getFormString(formData, 's3Region', 'auto');
        storageConfig.s3AccessKeyId = getFormString(formData, 's3AccessKeyId', '');
        storageConfig.s3SecretAccessKey = getFormString(formData, 's3SecretAccessKey', '');
        storageConfig.s3BucketName = getFormString(formData, 's3BucketName', '');
        storageConfig.s3PublicDomain = getFormString(formData, 's3PublicDomain', '');
        storageConfig.s3FolderPath = getFormString(formData, 's3FolderPath', 'avatars');
        storageConfig.s3IconFolderPath = getFormString(formData, 's3IconFolderPath', 'icons');
        storageConfig.s3AccountId = getFormString(formData, 's3AccountId', '');
      }

      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ config: storageConfig }),
      });

      const data = await res.json();

      if (res.ok) {
        success(t('settingsSaved'));
        fetchConfig();
      } else {
        error(getErrorMessage(data, t('saveFailed')));
      }
    } catch {
      error(t('networkError'));
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    const form = document.querySelector('form') as HTMLFormElement;
    const formData = new FormData(form);

    setTesting(true);
    try {
      const res = await fetch('/api/admin/settings/test-connection', {
        method: 'POST',
        headers: JSON_HEADERS,
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
    } catch {
      error(t('networkError'));
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-card rounded-xl p-6 shadow-sm border border-border animate-pulse">
        <div className="h-6 bg-muted rounded w-32 mb-6"></div>
        <div className="space-y-4">
          <div className="h-10 bg-muted rounded-xl"></div>
          <div className="h-10 bg-muted rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-2xl">💾</span>
        <div>
          <h2 className="text-lg font-semibold text-text-primary">{t('storage')}</h2>
          <p className="text-sm text-text-tertiary">{t('subtitle')}</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Storage Provider */}
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

        {/* Local Storage */}
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
              <p className="mt-1 text-sm text-text-tertiary">{t('avatarStoragePathDescription')}</p>
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
              <p className="mt-1 text-sm text-text-tertiary">{t('iconStoragePathDescription')}</p>
            </div>
          </div>
        )}

        {/* S3 Storage */}
        {storageProvider === 's3' && (
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-medium text-text-primary">{t('s3Config')}</h3>

            {/* Preset */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">{t('s3Preset')}</label>
              <select
                name="s3Preset"
                value={s3Preset}
                onChange={(e) => handlePresetChange(e.target.value)}
                className="w-full px-4 py-2.5 border border-border-input rounded-xl bg-card text-text-primary focus:outline-none focus:border-accent-foreground focus:ring-1 focus:ring-accent-foreground transition-colors"
              >
                <option value="cloudflare-r2">Cloudflare R2</option>
                <option value="tigris">Tigris Data</option>
                <option value="aws-s3">AWS S3</option>
                <option value="minio">MinIO</option>
                <option value="custom">{t('s3Custom')}</option>
              </select>
              <p className="mt-1 text-sm text-text-tertiary">{t('s3PresetDescription')}</p>
            </div>

            {/* Account ID — R2 only */}
            {S3_PRESETS[s3Preset]?.needsAccountId && (
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Account ID</label>
                <input
                  type="text"
                  name="s3AccountId"
                  value={s3AccountId}
                  onChange={(e) => handleAccountIdChange(e.target.value)}
                  placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-4 py-2.5 border border-border-input rounded-xl bg-card text-text-primary focus:outline-none focus:border-accent-foreground focus:ring-1 focus:ring-accent-foreground transition-colors"
                />
                <p className="mt-1 text-sm text-text-tertiary">{t('s3AccountIdDescription')}</p>
              </div>
            )}

            {/* Endpoint */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">{t('s3Endpoint')}</label>
              <input
                type="text"
                name="s3Endpoint"
                value={s3Endpoint}
                onChange={(e) => setS3Endpoint(e.target.value)}
                readOnly={!isEndpointEditable}
                placeholder="https://..."
                className={`w-full px-4 py-2.5 border border-border-input rounded-xl bg-card text-text-primary focus:outline-none focus:border-accent-foreground focus:ring-1 focus:ring-accent-foreground transition-colors ${!isEndpointEditable ? 'opacity-70 cursor-not-allowed' : ''}`}
              />
              <p className="mt-1 text-sm text-text-tertiary">
                {isEndpointEditable ? t('s3EndpointHelpCustom') : t('s3EndpointHelpAuto')}
              </p>
            </div>

            {/* Region */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">{t('s3Region')}</label>
              <input
                type="text"
                name="s3Region"
                value={s3Region}
                onChange={(e) => handleRegionChange(e.target.value)}
                placeholder="auto"
                className="w-full px-4 py-2.5 border border-border-input rounded-xl bg-card text-text-primary focus:outline-none focus:border-accent-foreground focus:ring-1 focus:ring-accent-foreground transition-colors"
              />
              <p className="mt-1 text-sm text-text-tertiary">{t('s3RegionDescription')}</p>
            </div>

            {/* Access Key ID */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">{t('s3AccessKey')}</label>
              <input
                type="text"
                name="s3AccessKeyId"
                defaultValue={config.s3AccessKeyId || ''}
                placeholder="Access Key ID"
                className="w-full px-4 py-2.5 border border-border-input rounded-xl bg-card text-text-primary focus:outline-none focus:border-accent-foreground focus:ring-1 focus:ring-accent-foreground transition-colors"
              />
            </div>

            {/* Secret Access Key */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">{t('s3SecretKey')}</label>
              <input
                type="password"
                name="s3SecretAccessKey"
                defaultValue={config.s3SecretAccessKey || ''}
                placeholder="Secret Access Key"
                className="w-full px-4 py-2.5 border border-border-input rounded-xl bg-card text-text-primary focus:outline-none focus:border-accent-foreground focus:ring-1 focus:ring-accent-foreground transition-colors"
              />
            </div>

            {/* Bucket Name */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">{t('s3Bucket')}</label>
              <input
                type="text"
                name="s3BucketName"
                defaultValue={config.s3BucketName || ''}
                placeholder="my-bucket"
                className="w-full px-4 py-2.5 border border-border-input rounded-xl bg-card text-text-primary focus:outline-none focus:border-accent-foreground focus:ring-1 focus:ring-accent-foreground transition-colors"
              />
            </div>

            {/* Public Domain */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Public Domain</label>
              <input
                type="text"
                name="s3PublicDomain"
                defaultValue={config.s3PublicDomain || ''}
                placeholder="https://..."
                className="w-full px-4 py-2.5 border border-border-input rounded-xl bg-card text-text-primary focus:outline-none focus:border-accent-foreground focus:ring-1 focus:ring-accent-foreground transition-colors"
              />
              <p className="mt-1 text-sm text-text-tertiary">{t('s3PublicDomainDescription')}</p>
            </div>

            {/* Avatar Folder Path */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">{t('s3AvatarFolderPath')}</label>
              <input
                type="text"
                name="s3FolderPath"
                defaultValue={config.s3FolderPath || 'avatars'}
                placeholder="avatars"
                className="w-full px-4 py-2.5 border border-border-input rounded-xl bg-card text-text-primary focus:outline-none focus:border-accent-foreground focus:ring-1 focus:ring-accent-foreground transition-colors"
              />
              <p className="mt-1 text-sm text-text-tertiary">{t('s3AvatarFolderPathDescription')}</p>
            </div>

            {/* Icon Folder Path */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">{t('s3IconFolderPath')}</label>
              <input
                type="text"
                name="s3IconFolderPath"
                defaultValue={config.s3IconFolderPath || 'icons'}
                placeholder="icons"
                className="w-full px-4 py-2.5 border border-border-input rounded-xl bg-card text-text-primary focus:outline-none focus:border-accent-foreground focus:ring-1 focus:ring-accent-foreground transition-colors"
              />
              <p className="mt-1 text-sm text-text-tertiary">{t('s3IconFolderPathDescription')}</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end pt-4 gap-3">
          {storageProvider === 's3' && (
            <button
              type="button"
              disabled={testing}
              onClick={handleTestConnection}
              className="px-4 py-2.5 border border-border text-text-secondary rounded-xl hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {testing && <Spinner className="h-4 w-4" />}
              {testing ? t('testing') : t('testConnection')}
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-accent-button text-white rounded-xl font-medium hover:bg-accent-button-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving && <Spinner className="h-4 w-4" />}
            {saving ? t('saving') : t('save')}
          </button>
        </div>
      </form>
    </div>
  );
}
