'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/components/ConfirmProvider';
import AvatarCropper from '@/components/AvatarCropper';
import Modal from '@/components/Modal';
import { getErrorMessage } from '@/lib/api-error';
import { Spinner } from '@/components/Spinner';
import { MAX_AVATAR_SIZE, JSON_HEADERS, LOGIN_PATH } from '@/lib/constants';

interface ProfileUser {
  id: string;
  username: string;
  email: string;
  nickname?: string;
  avatar?: string | null;
  role?: string;
}

interface Credential {
  id: string;
  name: string | null;
  device_type: string;
  backup_state: boolean;
  aaguid: string | null;
  providerName: string;
  providerIcon: string;
  created_at: string;
  last_used: string;
}

export default function SettingsPage() {
  const t = useTranslations('dashboard.settings');
  const { success, error } = useToast();
  const { confirm } = useConfirm();

  // Profile state
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Passkey state
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loadingCredentials, setLoadingCredentials] = useState(true);
  const [showPasskeyNameModal, setShowPasskeyNameModal] = useState(false);
  const [passkeyName, setPasskeyName] = useState('');

  // General
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/session');
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
        setNickname(data.user.nickname || '');
        setEmail(data.user.email || '');
        setAvatar(data.user.avatar || null);
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCredentials = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/webauthn');
      const data = await res.json();
      setCredentials(data.credentials || []);
    } catch (err) {
      console.error('Failed to fetch credentials:', err);
    } finally {
      setLoadingCredentials(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchProfile();
      void fetchCredentials();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [fetchCredentials, fetchProfile]);

  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (10MB)
    if (file.size > MAX_AVATAR_SIZE) {
      error(t('avatarSizeLimit'));
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      error(t('avatarTypeInvalid'));
      return;
    }

    // Create preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      setAvatarPreview(e.target?.result as string);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);

    // Reset input value to allow selecting same file again
    e.target.value = '';
  };

  const handleAvatarUpload = async (croppedImage: Blob) => {
    setAvatarUploading(true);
    setShowCropper(false);

    try {
      const formData = new FormData();
      formData.append('avatar', croppedImage, 'avatar.webp');

      const res = await fetch('/api/user/avatar', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setAvatar(data.avatarUrl);
        if (user) {
          setUser({ ...user, avatar: data.avatarUrl });
        }
        success(t('avatarUploadSuccess'));
      } else {
        error(getErrorMessage(data, t('avatarUploadFailed')));
      }
    } catch {
      error(t('avatarUploadFailed'));
    } finally {
      setAvatarUploading(false);
      setAvatarPreview(null);
    }
  };

  const handleAvatarDelete = async () => {
    if (!avatar) return;

    if (await confirm(t('deleteAvatarConfirm'), { confirmColor: 'red' })) {
      setAvatarUploading(true);

      try {
        const res = await fetch('/api/user/avatar', {
          method: 'DELETE',
        });

        const data = await res.json();

        if (res.ok) {
          setAvatar(null);
          if (user) {
            setUser({ ...user, avatar: null });
          }
          success(t('avatarDeleteSuccess'));
        } else {
          error(getErrorMessage(data, t('avatarDeleteFailed')));
        }
      } catch {
        error(t('avatarDeleteFailed'));
      } finally {
        setAvatarUploading(false);
      }
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);

    try {
      const res = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ nickname, email }),
      });

      const data = await res.json();

      if (res.ok) {
        success(t('profileUpdated'));
        fetchProfile();
      } else {
        error(getErrorMessage(data, t('updateFailed')));
      }
    } catch {
      error(t('networkError'));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      error(t('fillAllFields'));
      return;
    }

    if (newPassword !== confirmPassword) {
      error(t('passwordMismatch'));
      return;
    }

    if (newPassword.length < 8) {
      error(t('passwordTooShort'));
      return;
    }

    setChangingPassword(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (res.ok) {
        success(t('passwordChangeSuccess'));
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        error(getErrorMessage(data, t('passwordChangeFailed')));
      }
    } catch {
      error(t('networkError'));
    } finally {
      setChangingPassword(false);
    }
  };

  const startAddPasskey = () => {
    const nextIndex = credentials.length + 1;
    setPasskeyName(`Passkey #${nextIndex}`);
    setShowPasskeyNameModal(true);
  };

  const handleAddPasskey = async () => {
    setShowPasskeyNameModal(false);
    try {
      const { startRegistration } = await import('@simplewebauthn/browser');

      const optionsRes = await fetch('/api/auth/webauthn/register', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ action: 'generate' }),
      });

      const { options } = await optionsRes.json();
      const response = await startRegistration({ optionsJSON: options });

      const verifyRes = await fetch('/api/auth/webauthn/register', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({
          action: 'verify',
          response,
          challenge: options.challenge,
          credentialName: passkeyName,
        }),
      });

      const data = await verifyRes.json();

      if (data.verified) {
        success(t('passkeyAddSuccess'));
        fetchCredentials();
      } else {
        error(t('passkeyAddFailed'));
      }
    } catch (err: unknown) {
      if (!(err instanceof Error) || err.name !== 'NotAllowedError') {
        error(t('passkeyAddFailed'));
      }
    }
  };

  const handleRemovePasskey = async (credentialId: string) => {
    confirm(t('delete'), {
      confirmText: t('delete'),
      confirmColor: 'red',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/auth/webauthn?id=${credentialId}`, {
            method: 'DELETE',
          });

          if (res.ok) {
            success(t('passkeyDeleteSuccess'));
            fetchCredentials();
          } else {
            error(t('passkeyDeleteFailed'));
          }
        } catch {
          error(t('passkeyDeleteFailed'));
        }
      },
    });
  };

  const handleDeleteAccount = async () => {
    confirm(t('deleteAccountConfirm'), {
      confirmText: t('deleteAccountBtn'),
      confirmColor: 'red',
      onConfirm: async () => {
        try {
          const res = await fetch('/api/auth/delete-account', {
            method: 'POST',
          });

          if (res.ok) {
            success(t('accountDeleted'));
            window.location.href = LOGIN_PATH;
          } else {
            error(t('deleteFailed'));
          }
        } catch {
          error(t('deleteFailed'));
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-48"></div>
          <div className="h-64 bg-muted rounded-xl"></div>
          <div className="h-48 bg-muted rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">{t('title')}</h1>

      {/* Profile Section */}
      <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-2xl">👤</span>
          <h2 className="text-lg font-semibold text-text-primary">{t('profile')}</h2>
        </div>

        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border">
          {/* Avatar Preview */}
          <div className="relative">
            <div className="relative w-20 h-20 rounded-full overflow-hidden bg-muted border-2 border-border">
              {avatar ? (
                <Image src={avatar} alt={t('avatar')} fill className="object-cover" unoptimized />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-text-quaternary text-2xl">
                  👤
                </div>
              )}
            </div>
            {avatarUploading && (
              <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                <svg className="animate-spin h-6 w-6 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            )}
          </div>

          {/* Upload/Delete Buttons */}
          <div className="flex-1 space-y-2">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleAvatarFileSelect}
              className="hidden"
              disabled={avatarUploading}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              className={`inline-block px-4 py-2 bg-accent-button text-white rounded-lg hover:bg-accent-button-hover transition-colors cursor-pointer text-sm font-medium ${avatarUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {avatar ? t('changeAvatar') : t('uploadAvatar')}
            </button>
            {avatar && (
              <button
                onClick={handleAvatarDelete}
                disabled={avatarUploading}
                className="ml-2 px-4 py-2 border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('deleteAvatar')}
              </button>
            )}
            <p className="text-xs text-text-tertiary">{t('avatarHint')}</p>
          </div>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">{t('username')}</label>
            <input
              type="text"
              value={user?.username || ''}
              className="w-full px-4 py-2.5 border border-border-input rounded-xl bg-muted text-text-tertiary cursor-not-allowed"
              disabled
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">{t('nickname')}</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full px-4 py-2.5 border border-border-input rounded-xl bg-card text-text-primary focus:outline-none focus:border-accent-foreground focus:ring-1 focus:ring-accent-foreground transition-colors"
              placeholder={t('nicknamePlaceholder')}
              disabled={savingProfile}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">{t('email')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 border border-border-input rounded-xl bg-card text-text-primary focus:outline-none focus:border-accent-foreground focus:ring-1 focus:ring-accent-foreground transition-colors"
              placeholder={t('emailPlaceholder')}
              disabled={savingProfile}
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingProfile}
              className="px-6 py-2.5 bg-accent-button text-white rounded-xl font-medium hover:bg-accent-button-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {savingProfile && <Spinner className="h-4 w-4" />}
              {savingProfile ? t('saving') : t('saveProfile')}
            </button>
          </div>
        </form>
      </div>

      {/* Password Section */}
      <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-2xl">🔑</span>
          <h2 className="text-lg font-semibold text-text-primary">{t('changePassword')}</h2>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">{t('currentPassword')}</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-border-input rounded-xl bg-card text-text-primary focus:outline-none focus:border-accent-foreground focus:ring-1 focus:ring-accent-foreground transition-colors"
              placeholder={t('currentPasswordPlaceholder')}
              disabled={changingPassword}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">{t('newPassword')}</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-border-input rounded-xl bg-card text-text-primary focus:outline-none focus:border-accent-foreground focus:ring-1 focus:ring-accent-foreground transition-colors"
              placeholder={t('newPasswordPlaceholder')}
              disabled={changingPassword}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">{t('confirmNewPassword')}</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-border-input rounded-xl bg-card text-text-primary focus:outline-none focus:border-accent-foreground focus:ring-1 focus:ring-accent-foreground transition-colors"
              placeholder={t('confirmNewPasswordPlaceholder')}
              disabled={changingPassword}
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={changingPassword}
              className="px-6 py-2.5 bg-accent-button text-white rounded-xl font-medium hover:bg-accent-button-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {changingPassword && <Spinner className="h-4 w-4" />}
              {changingPassword ? t('changing') : t('changePasswordBtn')}
            </button>
          </div>
        </form>
      </div>

      {/* Passkey Section */}
      <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔐</span>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Passkey</h2>
              <p className="text-sm text-text-tertiary">{t('passwordlessLogin')}</p>
            </div>
          </div>
          <button
            onClick={startAddPasskey}
            className="px-4 py-2 bg-accent-button text-white rounded-xl text-sm font-medium hover:bg-accent-button-hover transition-colors flex items-center gap-2"
          >
            <span>+</span>
            <span>{t('addPasskey')}</span>
          </button>
        </div>

        {loadingCredentials ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-muted rounded-xl"></div>
              </div>
            ))}
          </div>
        ) : credentials.length > 0 ? (
          <div className="space-y-3">
            {credentials.map((cred) => (
              <div
                key={cred.id}
                className="flex items-center justify-between p-4 rounded-xl border border-border hover:border-accent-foreground/20 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="text-2xl shrink-0">🔑</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-text-primary truncate">{cred.name || t('passkeyUnnamed')}</p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-muted rounded-full text-text-tertiary border border-border">
                        <Image src={cred.providerIcon} alt="" width={14} height={14} className="object-contain" unoptimized />
                        {cred.providerName}
                      </span>
                      <span className="text-xs text-text-quaternary">
                        {t('passkeyCreatedAt')} {new Date(cred.created_at).toLocaleDateString()}
                      </span>
                      {cred.last_used && (
                        <span className="text-xs text-text-quaternary">
                          {t('passkeyLastUsed')} {new Date(cred.last_used).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleRemovePasskey(cred.id)}
                  className="px-3 py-1.5 text-sm text-destructive hover:bg-error rounded-lg transition-colors shrink-0 ml-3"
                >
                  {t('delete')}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <span className="text-4xl mb-4 block">🔐</span>
            <p className="text-text-tertiary">{t('noPasskey')}</p>
            <p className="text-sm text-text-quaternary mt-1">{t('noPasskeyDesc')}</p>
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className="bg-card rounded-xl p-6 shadow-sm border border-destructive/30">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-2xl">⚠️</span>
          <h2 className="text-lg font-semibold text-destructive">{t('dangerZone')}</h2>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-text-primary">{t('deleteAccount')}</p>
            <p className="text-sm text-text-tertiary">{t('deleteAccountDesc')}</p>
          </div>
          <button
            onClick={handleDeleteAccount}
            disabled={user?.role === 'admin'}
            className="px-4 py-2 text-sm text-destructive border border-destructive/30 rounded-xl hover:bg-error transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          >
            {t('deleteAccountBtn')}
          </button>
        </div>
      </div>

      {/* Avatar Cropper */}
      {showCropper && avatarPreview && (
        <AvatarCropper
          image={avatarPreview}
          onCropComplete={handleAvatarUpload}
          onCancel={() => {
            setShowCropper(false);
            setAvatarPreview(null);
          }}
        />
      )}

      {/* Passkey Name Modal */}
      <Modal
        isOpen={showPasskeyNameModal}
        onClose={() => setShowPasskeyNameModal(false)}
        title={t('addPasskey')}
        footer={
          <div className="flex justify-end gap-3 p-4 border-t border-border">
            <button
              onClick={() => setShowPasskeyNameModal(false)}
              className="px-4 py-2 text-sm text-text-secondary bg-muted rounded-xl hover:bg-border-strong transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleAddPasskey}
              disabled={!passkeyName.trim()}
              className="px-4 py-2 text-sm text-white bg-accent-button rounded-xl hover:bg-accent-button-hover transition-colors disabled:opacity-50"
            >
              {t('passkeyContinue')}
            </button>
          </div>
        }
      >
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">{t('passkeyName')}</label>
            <input
              type="text"
              autoFocus
              value={passkeyName}
              onChange={(e) => setPasskeyName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && passkeyName.trim()) handleAddPasskey();
              }}
              className="w-full px-4 py-2.5 border border-border-input rounded-xl bg-card text-text-primary focus:outline-none focus:border-accent-foreground focus:ring-1 focus:ring-accent-foreground transition-colors"
              placeholder={t('passkeyNamePlaceholder')}
            />
            <p className="text-xs text-text-quaternary mt-1.5">{t('passkeyNameHelp')}</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
