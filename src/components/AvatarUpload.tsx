'use client';

import { useState, useRef, useCallback } from 'react';
import { useToast } from './ToastProvider';
import AvatarCropper from './AvatarCropper';
import { getErrorMessage } from '@/lib/api-error';
import { useTranslations } from 'next-intl';

interface AvatarUploadProps {
    currentAvatar?: string | null;
    onAvatarChange: (avatarUrl: string | null) => void;
    children: (props: {
        isUploading: boolean;
        preview: string | null;
        triggerUpload: () => void;
        handleDelete: () => void;
    }) => React.ReactNode;
    uploadUrl?: string;
    deleteUrl?: string;
    maxSize?: number;
    enableCrop?: boolean;
}

export default function AvatarUpload({
    currentAvatar,
    onAvatarChange,
    children,
    uploadUrl = '/api/user/avatar',
    deleteUrl = '/api/user/avatar',
    maxSize = 10 * 1024 * 1024,
    enableCrop = true,
}: AvatarUploadProps) {
    const t = useTranslations('common.avatarUpload');
    const [isUploading, setIsUploading] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);
    const [cropImage, setCropImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { success, error } = useToast();

    const uploadFile = useCallback(async (file: File | Blob, filename?: string) => {
        setIsUploading(true);
        try {
            const formData = new FormData();
            const uploadFile = file instanceof File ? file : new File([file], filename || 'avatar.webp', { type: file.type });
            formData.append('avatar', uploadFile);

            const response = await fetch(uploadUrl, { method: 'POST', body: formData });
            const data = await response.json();

            if (!response.ok) throw new Error(getErrorMessage(data, t('uploadFailed')));

            onAvatarChange(data.avatarUrl);
            setPreview(null);
            success(t('uploadSuccess'));
        } catch (err) {
            console.error('Avatar upload error:', error);
            error(err instanceof Error ? err.message : t('uploadFailed'));
            setPreview(null);
        } finally {
            setIsUploading(false);
        }
    }, [uploadUrl, onAvatarChange, success, error, t]);

    const handleFileSelect = useCallback(async (file: File) => {
        if (!file.type.startsWith('image/')) {
            error(t('invalidType'));
            return;
        }
        if (file.size > maxSize) {
            error(t('sizeLimit'));
            return;
        }

        if (enableCrop) {
            const reader = new FileReader();
            reader.onload = (e) => setCropImage(e.target?.result as string);
            reader.readAsDataURL(file);
        } else {
            setPreview(URL.createObjectURL(file));
            await uploadFile(file, file.name);
        }
    }, [maxSize, enableCrop, uploadFile, error, t]);

    const handleCropComplete = useCallback(async (blob: Blob) => {
        setCropImage(null);
        setPreview(URL.createObjectURL(blob));
        await uploadFile(blob, 'avatar.webp');
    }, [uploadFile]);

    const handleDelete = useCallback(async () => {
        if (!currentAvatar) return;
        setIsUploading(true);
        try {
            const response = await fetch(deleteUrl, { method: 'DELETE' });
            const data = await response.json();
            if (!response.ok) throw new Error(getErrorMessage(data, t('deleteFailed')));

            onAvatarChange(null);
            setPreview(null);
            success(t('deleteSuccess'));
        } catch (err) {
            console.error('Avatar delete error:', err);
            error(err instanceof Error ? err.message : t('deleteFailed'));
        } finally {
            setIsUploading(false);
        }
    }, [currentAvatar, deleteUrl, onAvatarChange, success, error, t]);

    const triggerUpload = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFileSelect(file);
        e.target.value = '';
    };

    return (
        <>
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
            />

            {children({
                isUploading,
                preview,
                triggerUpload,
                handleDelete,
            })}

            {cropImage && (
                <AvatarCropper
                    image={cropImage}
                    onCropComplete={handleCropComplete}
                    onCancel={() => setCropImage(null)}
                />
            )}
        </>
    );
}
