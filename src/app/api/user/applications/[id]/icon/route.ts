import { NextRequest, NextResponse } from 'next/server';
import { getClientByNanoId, updateClient } from '@/lib/oauth2';
import { requireAuthenticatedUser } from '@/lib/require-session';
import { StorageFactory } from '@/lib/storage';
import { db } from '@/lib/db';
import {
  appNotFound,
  paramInvalid,
  appIconSizeLimit,
  appIconTypeInvalid,
  appIconUploadFailed,
  internalError,
  adminPermissionDenied,
} from '@/lib/api-response';

function getIconStoragePath(globalConfig: Record<string, any>): string {
  const provider = globalConfig.storageProvider || 'local';
  if (provider === 's3') {
    return globalConfig.s3IconFolderPath || 'icons';
  }
  return globalConfig.iconStoragePath || '/uploads/icons';
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await requireAuthenticatedUser();
    if ('error' in result) return result.error;

    const { user } = result;

    if (!['admin', 'developer'].includes(user.role)) {
      return await adminPermissionDenied();
    }

    const { id } = await params;
    const client = await getClientByNanoId(id);
    if (!client) {
      return appNotFound();
    }

    // Non-admin users can only edit their own apps
    if (user.role !== 'admin' && client.userId !== user.id) {
      return appNotFound();
    }

    const formData = await request.formData();
    const file = formData.get('icon') as File;

    if (!file) {
      return paramInvalid('请选择要上传的图标文件');
    }

    if (file.size > 2 * 1024 * 1024) {
      return appIconSizeLimit();
    }

    if (!file.type.startsWith('image/')) {
      return appIconTypeInvalid();
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const globalConfig = await db.getGlobalConfig();
    const iconPath = getIconStoragePath(globalConfig);

    // Delete old icon if exists
    if (client.icon && client.icon.startsWith('http')) {
      try {
        const storage = await StorageFactory.createFromDb(iconPath);
        await storage.delete(client.icon);
      } catch (e) {
        console.warn('Failed to delete old icon:', e);
      }
    }

    // Upload new icon
    const storage = await StorageFactory.createFromDb(iconPath);
    const iconUrl = await storage.upload(
      buffer,
      `app-${id}-${Date.now()}`,
      file.type
    );

    await updateClient(id, { icon: iconUrl });

    return NextResponse.json({ success: true, iconUrl });
  } catch (error) {
    console.error('Icon upload error:', error);
    return appIconUploadFailed();
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await requireAuthenticatedUser();
    if ('error' in result) return result.error;

    const { user } = result;

    if (!['admin', 'developer'].includes(user.role)) {
      return await adminPermissionDenied();
    }

    const { id } = await params;
    const client = await getClientByNanoId(id);
    if (!client) {
      return appNotFound();
    }

    // Non-admin users can only edit their own apps
    if (user.role !== 'admin' && client.userId !== user.id) {
      return appNotFound();
    }

    // Delete stored icon file
    if (client.icon && !client.icon.startsWith('default') && !client.icon.startsWith('auto')) {
      try {
        const globalConfig = await db.getGlobalConfig();
        const iconPath = getIconStoragePath(globalConfig);
        const storage = await StorageFactory.createFromDb(iconPath);
        await storage.delete(client.icon);
      } catch (e) {
        console.warn('Failed to delete icon from storage:', e);
      }
    }

    // Reset to default icon
    await updateClient(id, { icon: 'default' });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Icon delete error:', error);
    return internalError('图标删除失败');
  }
}
