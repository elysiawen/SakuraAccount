import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/require-session';
import { getUserById, updateUser } from '@/lib/auth';
import { StorageFactory } from '@/lib/storage';
import {
    paramInvalid,
    userAvatarSizeLimit,
    userAvatarTypeInvalid,
    userNotFound,
    userAvatarUploadFailed,
    userAvatarNotSet,
    userAvatarDeleteFailed,
} from '@/lib/api-response';
import { tApi } from '@/i18n/api-i18n';

export async function POST(request: NextRequest) {
    try {
        const authResult = await requireAuthenticatedUser();
        if ('error' in authResult) {
            return authResult.error;
        }

        const { user } = authResult;

        const formData = await request.formData();
        const file = formData.get('avatar') as File;

        if (!file) {
            return paramInvalid(await tApi('user.avatarRequired'));
        }

        // Check file size (10MB)
        if (file.size > 10 * 1024 * 1024) {
            return userAvatarSizeLimit();
        }

        // Check file type
        if (!file.type.startsWith('image/')) {
            return userAvatarTypeInvalid();
        }

        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Get current user data
        const currentUser = await getUserById(user.id);
        if (!currentUser) {
            return userNotFound();
        }

        // Delete old avatar if exists
        if (currentUser.avatar) {
            try {
                const storage = await StorageFactory.createFromDb();
                await storage.delete(currentUser.avatar);
            } catch (error) {
                console.warn('Failed to delete old avatar:', error);
            }
        }

        // Upload new avatar
        const storage = await StorageFactory.createFromDb();
        const avatarUrl = await storage.upload(
            buffer,
            `${user.id}-${Date.now()}`,
            file.type
        );

        // Update user avatar in database
        await updateUser(user.id, { avatar: avatarUrl });

        return NextResponse.json({
            success: true,
            avatarUrl,
        });
    } catch (error) {
        console.error('Avatar upload error:', error);
        return userAvatarUploadFailed();
    }
}

export async function DELETE() {
    try {
        const authResult = await requireAuthenticatedUser();
        if ('error' in authResult) {
            return authResult.error;
        }

        const { user } = authResult;

        // Get current user data
        const currentUser = await getUserById(user.id);
        if (!currentUser) {
            return userNotFound();
        }

        if (!currentUser.avatar) {
            return userAvatarNotSet();
        }

        // Delete avatar from storage
        try {
            const storage = await StorageFactory.createFromDb();
            await storage.delete(currentUser.avatar);
        } catch (error) {
            console.warn('Failed to delete avatar from storage:', error);
        }

        // Update user avatar in database
        await updateUser(user.id, { avatar: null });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Avatar delete error:', error);
        return userAvatarDeleteFailed();
    }
}
