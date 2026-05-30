import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/require-session';
import { db } from '@/lib/db';
import { logAudit } from '@/lib/auth';
import { paramInvalid, internalError } from '@/lib/api-response';

export async function GET(_request: NextRequest) {
    try {
        const result = await requireAdmin();
        if ('error' in result) return result.error;

        const config = await db.getGlobalConfig();
        return NextResponse.json(config);
    } catch (error) {
        console.error('Admin get settings error:', error);
        return internalError('获取设置失败');
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
            return paramInvalid('缺少配置键');
        }

        await db.setGlobalConfig(key, value);
        await logAudit(admin.id, 'admin_update_setting', { key, value }, 'admin', 'admin', 'operation');

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Admin update setting error:', error);
        return internalError('更新设置失败');
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
            return paramInvalid('无效的配置数据');
        }

        await db.setGlobalConfigBatch(config);
        await logAudit(admin.id, 'admin_update_settings', { keys: Object.keys(config) }, 'admin', 'admin', 'operation');

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Admin update settings error:', error);
        return internalError('更新设置失败');
    }
}