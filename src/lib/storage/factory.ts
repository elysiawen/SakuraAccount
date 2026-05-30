import { IStorageProvider, StorageConfig } from './interface';
import { LocalStorageProvider } from './local';
import { S3Provider } from './s3';

/**
 * Storage factory - creates storage provider based on configuration
 */
export class StorageFactory {
    static createProvider(config: StorageConfig, pathOverride?: string): IStorageProvider {
        switch (config.provider) {
            case 'local':
                return new LocalStorageProvider(pathOverride || config.localStoragePath);

            case 's3':
                if (!config.s3AccessKeyId || !config.s3SecretAccessKey || !config.s3BucketName || !config.s3PublicDomain) {
                    throw new Error('Missing S3 configuration');
                }

                const endpoint = config.s3Endpoint;
                if (!endpoint) {
                    throw new Error('S3 Endpoint is required');
                }

                const region = config.s3Region || 'auto';

                return new S3Provider(
                    endpoint,
                    region,
                    config.s3AccessKeyId,
                    config.s3SecretAccessKey,
                    config.s3BucketName,
                    config.s3PublicDomain,
                    pathOverride || config.s3FolderPath || 'avatars'
                );

            default:
                throw new Error(`Unsupported storage provider: ${config.provider}`);
        }
    }

    /**
     * Create provider from database config.
     * @param storagePath Optional path override (e.g. '/uploads/icons' for local, 'icons' for S3)
     */
    static async createFromDb(storagePath?: string): Promise<IStorageProvider> {
        const { db } = await import('@/lib/db');
        const globalConfig = await db.getGlobalConfig();

        const str = (v: unknown): string | undefined => typeof v === 'string' ? v : undefined;
        const provider = (globalConfig.storageProvider as 'local' | 's3') || 'local';

        if (provider === 's3') {
            if (!globalConfig.s3AccessKeyId || !globalConfig.s3SecretAccessKey ||
                !globalConfig.s3BucketName || !globalConfig.s3PublicDomain || !globalConfig.s3Endpoint) {
                console.warn('S3 configuration incomplete, falling back to local storage');
                return new LocalStorageProvider(storagePath || str(globalConfig.localStoragePath) || '/uploads/avatars');
            }
        }

        const config: StorageConfig = {
            provider,
            localStoragePath: str(globalConfig.localStoragePath) || '/uploads/avatars',
            s3Preset: globalConfig.s3Preset as StorageConfig['s3Preset'],
            s3Endpoint: str(globalConfig.s3Endpoint),
            s3Region: str(globalConfig.s3Region),
            s3AccessKeyId: str(globalConfig.s3AccessKeyId),
            s3SecretAccessKey: str(globalConfig.s3SecretAccessKey),
            s3BucketName: str(globalConfig.s3BucketName),
            s3PublicDomain: str(globalConfig.s3PublicDomain),
            s3FolderPath: str(globalConfig.s3FolderPath),
            s3AccountId: str(globalConfig.s3AccountId),
        };

        return StorageFactory.createProvider(config, storagePath);
    }
}