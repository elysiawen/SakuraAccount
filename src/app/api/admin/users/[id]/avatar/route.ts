import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/require-session';
import { getUserById, updateUser } from '@/lib/auth';
import { StorageFactory } from '@/lib/storage';
import {
  userNotFound,
  paramInvalid,
  userAvatarSizeLimit,
  userAvatarTypeInvalid,
  userAvatarUploadFailed,
  userAvatarDeleteFailed,
} from '@/lib/api-response';
import { tApi } from '@/i18n/api-i18n';
import { MAX_AVATAR_SIZE } from '@/lib/constants';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await requireAdmin();
    if ('error' in result) return result.error;

    const { id } = await params;
    const user = await getUserById(id);
    if (!user) {
      return userNotFound();
    }

    const formData = await request.formData();
    const file = formData.get('avatar') as File;

    if (!file) {
      return paramInvalid(await tApi('user.avatarRequired'));
    }

    if (file.size > MAX_AVATAR_SIZE) {
      return userAvatarSizeLimit();
    }

    if (!file.type.startsWith('image/')) {
      return userAvatarTypeInvalid();
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Delete old avatar if exists
    if (user.avatar) {
      try {
        const storage = await StorageFactory.createFromDb();
        await storage.delete(user.avatar);
      } catch (e) {
        console.warn('Failed to delete old avatar:', e);
      }
    }

    // Upload new avatar
    const storage = await StorageFactory.createFromDb();
    const avatarUrl = await storage.upload(
      buffer,
      `${id}-${Date.now()}`,
      file.type
    );

    await updateUser(id, { avatar: avatarUrl });

    return NextResponse.json({ success: true, avatarUrl });
  } catch (error) {
    console.error('Admin avatar upload error:', error);
    return userAvatarUploadFailed();
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
    const user = await getUserById(id);
    if (!user) {
      return userNotFound();
    }

    if (!user.avatar) {
      return paramInvalid(await tApi('user.avatarNotSet'));
    }

    // Delete avatar from storage
    try {
      const storage = await StorageFactory.createFromDb();
      await storage.delete(user.avatar);
    } catch (e) {
      console.warn('Failed to delete avatar from storage:', e);
    }

    await updateUser(id, { avatar: undefined });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin avatar delete error:', error);
    return userAvatarDeleteFailed();
  }
}
