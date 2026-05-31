import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/require-session';
import { db } from '@/lib/db';
import { logAudit, getRequestMetadata } from '@/lib/auth';
import { paramInvalid, internalError } from '@/lib/api-response';
import { tApi } from '@/i18n/api-i18n';

export async function GET() {
    try {
        const result = await requireAdmin();
        if ('error' in result) return result.error;

        const config = await db.getGlobalConfig();
        return NextResponse.json(config);
    } catch (error) {
        console.error('Admin get settings error:', error);
        return internalError(await tApi('admin.settingsGetFailed'));
    }
}

export async function PUT(request: NextRequest) {
    try {
        const result = await requireAdmin();
        if ('error' in result) return result.error;
        const { user: admin } = result;

        const body = await request.json();
        const { key, value } = body;

        if (!key) {
            return paramInvalid(await tApi('admin.configKeyRequired'));
        }

        await db.setGlobalConfig(key, value);
        const { ip, userAgent } = getRequestMetadata(request);
        await logAudit(admin.id, 'admin_update_setting', { key, value }, ip, userAgent, 'operation');

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Admin update setting error:', error);
        return internalError(await tApi('admin.settingsUpdateFailed'));
    }
}

export async function POST(request: NextRequest) {
    try {
        const result = await requireAdmin();
        if ('error' in result) return result.error;
        const { user: admin } = result;

        const body = await request.json();
        const { config } = body;

        if (!config || typeof config !== 'object') {
            return paramInvalid(await tApi('admin.configDataInvalid'));
        }

        await db.setGlobalConfigBatch(config);
        const { ip, userAgent } = getRequestMetadata(request);
        await logAudit(admin.id, 'admin_update_settings', { keys: Object.keys(config) }, ip, userAgent, 'operation');

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Admin update settings error:', error);
        return internalError(await tApi('admin.settingsUpdateFailed'));
    }
}
