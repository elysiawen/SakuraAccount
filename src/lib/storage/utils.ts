export const S3_PRESETS: Record<string, { name: string; endpoint?: string; needsAccountId?: boolean; defaultRegion: string }> = {
  'cloudflare-r2': {
    name: 'Cloudflare R2',
    needsAccountId: true,
    defaultRegion: 'auto',
  },
  'tigris': {
    name: 'Tigris Data',
    endpoint: 'https://fly.storage.tigris.dev',
    defaultRegion: 'auto',
  },
  'aws-s3': {
    name: 'AWS S3',
    defaultRegion: 'us-east-1',
  },
  'minio': {
    name: 'MinIO',
    defaultRegion: 'us-east-1',
  },
  'custom': {
    name: 'Custom S3',
    defaultRegion: 'us-east-1',
  },
};

/** Safely extract a string value from the global config record */
export function getConfigString(globalConfig: Record<string, unknown>, key: string): string | undefined {
  const value = globalConfig[key];
  return typeof value === 'string' ? value : undefined;
}

/** Resolve the icon storage path based on the current storage provider */
export function getIconStoragePath(globalConfig: Record<string, unknown>): string {
  const provider = getConfigString(globalConfig, 'storageProvider') || 'local';
  if (provider === 's3') {
    return getConfigString(globalConfig, 's3IconFolderPath') || 'icons';
  }
  return getConfigString(globalConfig, 'iconStoragePath') || '/uploads/icons';
}

export function buildS3Endpoint(preset: string, accountId?: string, region?: string): string {
  switch (preset) {
    case 'cloudflare-r2':
      return accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '';
    case 'tigris':
      return 'https://fly.storage.tigris.dev';
    case 'aws-s3':
      return region ? `https://s3.${region}.amazonaws.com` : '';
    default:
      return '';
  }
}
