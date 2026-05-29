import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/require-session';
import { S3Provider } from '@/lib/storage/s3';
import { paramInvalid, connectionFailed } from '@/lib/api-response';

export async function POST(request: NextRequest) {
    try {
        const result = await requireAdmin();
        if ('error' in result) return result.error;

        const body = await request.json();
        const { s3Endpoint, s3Region, s3AccessKeyId, s3SecretAccessKey, s3BucketName, s3PublicDomain, s3FolderPath } = body;

        if (!s3Endpoint || !s3AccessKeyId || !s3SecretAccessKey || !s3BucketName || !s3PublicDomain) {
            return paramInvalid('请填写完整的 S3 配置');
        }

        const provider = new S3Provider(
            s3Endpoint,
            s3Region || 'auto',
            s3AccessKeyId,
            s3SecretAccessKey,
            s3BucketName,
            s3PublicDomain,
            s3FolderPath || 'avatars'
        );

        // Upload a small test file
        const testKey = `.connection-test-${Date.now()}`;
        const testBuffer = Buffer.from('sakura-account-connection-test');
        const url = await provider.upload(testBuffer, testKey, 'text/plain');

        // Clean up: delete the test file
        try {
            await provider.delete(url);
        } catch {
            // Ignore cleanup errors
        }

        return NextResponse.json({ success: true, message: '连接成功' });
    } catch (error) {
        console.error('S3 test connection error:', error);
        const message = error instanceof Error ? error.message : '连接失败';
        return connectionFailed(message);
    }
}
