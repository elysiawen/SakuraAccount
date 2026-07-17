'use client';

import { useTranslations } from 'next-intl';
import RegistrationSettingsPanel from './components/RegistrationSettingsPanel';
import StorageSettingsPanel from './components/StorageSettingsPanel';
import LogCleanupPanel from './components/LogCleanupPanel';
import DatabaseInfoPanel from './components/DatabaseInfoPanel';

export default function AdminSettingsPage() {
  const t = useTranslations('admin.settings');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">{t('title')}</h1>
      <RegistrationSettingsPanel />
      <LogCleanupPanel />
      <StorageSettingsPanel />
      <DatabaseInfoPanel />
    </div>
  );
}
