import { NextRequest, NextResponse } from 'next/server';
import { getClientByNanoId, updateClient } from '@/lib/oauth2';
import { requireAdmin } from '@/lib/require-session';
import { StorageFactory } from '@/lib/storage';
import { db } from '@/lib/db';
import { getIconStoragePath } from '@/lib/storage/utils';
import { MAX_ICON_SIZE, DEFAULT_ICON } from '@/lib/constants';
import {
  appNotFound,
  paramInvalid,
  appIconSizeLimit,
  appIconTypeInvalid,
  appIconUploadFailed,
  internalError,
} from '@/lib/api-response';
import { tApi } from '@/i18n/api-i18n';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await requireAdmin();
    if ('error' in result) return result.error;

    const { id } = await params;
    const client = await getClientByNanoId(id);
    if (!client) {
      return appNotFound();
    }

    const formData = await request.formData();
    const file = formData.get('icon') as File;

    if (!file) {
      return paramInvalid(await tApi('app.iconRequired'));
    }

    if (file.size > MAX_ICON_SIZE) {
      return appIconSizeLimit();
    }

    if (!file.type.startsWith('image/')) {
      return appIconTypeInvalid();
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const globalConfig = await db.getGlobalConfig();
    const iconPath = getIconStoragePath(globalConfig);

    // Delete old icon if exists (直接存URL，删除时直接用URL)
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

    // 直接存URL字符串
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
    const result = await requireAdmin();
    if ('error' in result) return result.error;

    const { id } = await params;
    const client = await getClientByNanoId(id);
    if (!client) {
      return appNotFound();
    }

    // 删除存储的图标文件（如果是上传的URL）
    if (client.icon && !client.icon.startsWith(DEFAULT_ICON) && !client.icon.startsWith('auto')) {
      try {
        const globalConfig = await db.getGlobalConfig();
        const iconPath = getIconStoragePath(globalConfig);
        const storage = await StorageFactory.createFromDb(iconPath);
        await storage.delete(client.icon);
      } catch (e) {
        console.warn('Failed to delete icon from storage:', e);
      }
    }

    // 恢复为默认图标
    await updateClient(id, { icon: DEFAULT_ICON });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Icon delete error:', error);
    return internalError(await tApi('app.iconDeleteFailed'));
  }
}
