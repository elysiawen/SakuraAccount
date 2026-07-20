'use client';

import { useState, useEffect, useCallback, memo } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/components/ConfirmProvider';
import Search from '@/components/Search';
import Pagination from '@/components/Pagination';
import Modal from '@/components/Modal';
import { AvatarUpload } from '@/components/avatar';
import { Shield, User as UserIcon, Mail, Key, Edit, Trash2, Fingerprint, CalendarClock } from 'lucide-react';
import { getErrorMessage } from '@/lib/api-error';
import { getAvatarColor } from '@/components/AppIcon';
import { Spinner } from '@/components/primitives';
import { useAdminUser } from '@/app/admin/shell';
import { JSON_HEADERS, DEFAULT_PAGE_SIZE } from '@/lib/constants';

interface User {
  id: number;
  username: string;
  email: string;
  nickname: string;
  avatar?: string | null;
  role: string;
  email_verified: boolean;
  two_factor_enabled: boolean;
  created_at: string;
}

interface UserPasskey {
  id: string;
  name: string | null;
  providerName: string;
  providerIcon: string;
}

const UserAvatar = memo(function UserAvatar({ user, size = 'sm' }: { user: User; size?: 'sm' | 'md' }) {
  const [errored, setErrored] = useState(false);
  const dim = size === 'sm' ? 'w-9 h-9' : 'w-16 h-16';
  const textSize = size === 'sm' ? 'text-sm' : 'text-xl';

  const handleError = useCallback(() => setErrored(true), []);

  if (user.avatar && !errored) {
    return (
      <div className={`relative ${dim} rounded-full overflow-hidden shrink-0`}>
        <Image
          src={user.avatar}
          alt={user.username}
          fill
          className="object-cover"
          unoptimized
          onError={handleError}
        />
      </div>
    );
  }

  return (
    <div className={`${dim} rounded-full bg-gradient-to-br ${getAvatarColor(user.username)} flex items-center justify-center text-white font-bold ${textSize} shadow-md shadow-black/10 shrink-0`}>
      {(user.nickname || user.username).charAt(0).toUpperCase()}
    </div>
  );
});

export default function AdminUsersPage() {
  const t = useTranslations('admin.users');

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      user: t('roleUser'),
      developer: t('roleDeveloper'),
      admin: t('roleAdmin'),
    };
    return labels[role] || role;
  };
  const { success, error } = useToast();
  const { confirm } = useConfirm();
  const { setAvatar: setAdminAvatar, setNickname: setAdminNickname } = useAdminUser();
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const page = 1;
  const limit = DEFAULT_PAGE_SIZE;
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ username: '', nickname: '', email: '', newPassword: '', role: 'user', emailVerified: false });
  const [editingAvatar, setEditingAvatar] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [userPasskeys, setUserPasskeys] = useState<UserPasskey[]>([]);
  const [loadingPasskeys, setLoadingPasskeys] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'pending'>('users');
  const [pendingCodes, setPendingCodes] = useState<{ id: number; email: string; expires_at: string; created_at: string }[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);

  const fetchPendingCodes = useCallback(() => {
    setLoadingPending(true);
    fetch('/api/admin/pending-codes', { headers: JSON_HEADERS })
      .then(r => r.json())
      .then(data => setPendingCodes(data.codes || []))
      .catch(() => {})
      .finally(() => setLoadingPending(false));
  }, []);

  useEffect(() => {
    if (activeTab === 'pending') fetchPendingCodes();
  }, [activeTab, fetchPendingCodes]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/users?page=${page}&limit=${limit}`);
      const data = await res.json();
      setUsers(data.users || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  }, [limit, page]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchUsers();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [fetchUsers]);

  useEffect(() => {
    fetch('/api/auth/session').then(res => res.json()).then(data => {
      if (data.user?.id) setCurrentUserId(String(data.user.id));
    }).catch(() => {});
  }, []);

  const handleDeleteUser = async (userId: number, username: string) => {
    confirm(t('deleteConfirm', { name: username }), {
      confirmText: t('delete'),
      confirmColor: 'red',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/users?id=${userId}`, { method: 'DELETE' });
          if (res.ok) {
            success(t('userDeleted'));
            setUsers(prev => prev.filter(u => u.id !== userId));
            setTotal(prev => prev - 1);
          } else {
            const data = await res.json();
            error(getErrorMessage(data, t('deleteFailed')));
          }
        } catch {
          error(t('deleteFailed'));
        }
      },
    });
  };

  const fetchPasskeys = async (userId: string) => {
    setLoadingPasskeys(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/passkeys`);
      const data = await res.json();
      setUserPasskeys(data.credentials || []);
    } catch {
      setUserPasskeys([]);
    } finally {
      setLoadingPasskeys(false);
    }
  };

  const handleDeletePasskey = async (userId: string, credentialId: string) => {
    confirm(t('deletePasskeyConfirm'), {
      confirmText: t('delete'),
      confirmColor: 'red',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/users/${userId}/passkeys?id=${credentialId}`, { method: 'DELETE' });
          if (res.ok) {
            success(t('passkeyDeleted'));
            fetchPasskeys(userId);
          } else {
            error(t('passkeyDeleteFailed'));
          }
        } catch {
          error(t('passkeyDeleteFailed'));
        }
      },
    });
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditingAvatar(user.avatar || null);
    fetchPasskeys(String(user.id));
    setEditForm({
      username: user.username || '',
      nickname: user.nickname || '',
      email: user.email || '',
      newPassword: '',
      role: user.role || 'user',
      emailVerified: user.email_verified,
    });
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    setSaving(true);
    const isSelf = String(editingUser.id) === currentUserId;
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: JSON_HEADERS,
        body: JSON.stringify({
          id: editingUser.id,
          username: editForm.username,
          nickname: editForm.nickname,
          email: editForm.email,
          email_verified: editForm.emailVerified,
          newPassword: editForm.newPassword || undefined,
          ...(isSelf ? {} : { role: editForm.role }),
        }),
      });
      if (res.ok) {
        success(t('userUpdated'));
        // Local update instead of full re-fetch
        setUsers(prev => prev.map(u => u.id === editingUser.id ? {
          ...u,
          username: editForm.username,
          nickname: editForm.nickname,
          email: editForm.email,
          role: isSelf ? u.role : editForm.role,
          email_verified: editForm.emailVerified,
        } : u));
        // Sync sidebar if editing self
        if (isSelf) {
          setAdminNickname(editForm.nickname);
        }
        setEditingUser(null);
      } else {
        const data = await res.json();
        error(getErrorMessage(data, t('updateFailed')));
      }
    } catch {
      error(t('updateFailed'));
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = (field: string) => ({
    borderColor: focused === field ? 'var(--accent-button)' : 'var(--border-input)',
    boxShadow: focused === field ? '0 0 0 3px color-mix(in srgb, var(--accent-button) 12%, transparent)' : 'none',
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">
          {activeTab === 'users' ? t('title') : t('pendingTitle')}
        </h1>
        <div className="flex gap-1 p-1.5 bg-gray-100 dark:bg-gray-800/80 rounded-xl shrink-0">
          {([
            { key: 'users' as const, label: t('title') },
            { key: 'pending' as const, label: t('pendingTab') },
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-card text-text-primary shadow-sm'
                  : 'text-text-tertiary hover:text-text-secondary'
              }`}
            >
              {tab.label}
              {tab.key === 'pending' && pendingCodes.length > 0 && (
                <span className="ml-1.5 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full">
                  {pendingCodes.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="relative overflow-hidden">
        <div className={`transition-all duration-300 ease-out ${
          activeTab === 'pending'
            ? 'opacity-100 translate-x-0'
            : 'opacity-0 translate-x-6 absolute inset-0 pointer-events-none'
        }`}>
        <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <span className="text-sm text-text-tertiary">{t('pendingCount', { count: pendingCodes.length })}</span>
            {pendingCodes.length > 0 && (
              <button
                onClick={() => {
                  fetch('/api/admin/pending-codes', { method: 'DELETE', headers: JSON_HEADERS })
                    .then(() => fetchPendingCodes());
                }}
                className="text-xs text-text-tertiary hover:text-red-500 transition-colors"
              >
                {t('cleanExpired')}
              </button>
            )}
          </div>
          {loadingPending ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="animate-pulse h-12 bg-muted rounded-lg" />)}
            </div>
          ) : pendingCodes.length === 0 ? (
            <div className="p-8 text-center text-sm text-text-tertiary">{t('pendingEmpty')}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-text-tertiary border-b border-border">
                    <th className="text-left py-3 px-4 font-medium">{t('email')}</th>
                    <th className="text-left py-3 px-4 font-medium hidden sm:table-cell">{t('sendTime')}</th>
                    <th className="text-left py-3 px-4 font-medium hidden sm:table-cell">{t('expiresAt')}</th>
                    <th className="text-left py-3 px-4 font-medium">{t('status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingCodes.map(c => {
                    const expired = new Date(c.expires_at) < new Date();
                    return (
                      <tr key={c.id} className="border-b border-border/50">
                        <td className="py-3 px-4 text-text-primary font-mono text-xs">{c.email}</td>
                        <td className="py-3 px-4 text-text-tertiary hidden sm:table-cell">{new Date(c.created_at).toLocaleString()}</td>
                        <td className="py-3 px-4 hidden sm:table-cell">
                          <span className={expired ? 'text-red-400' : 'text-text-tertiary'}>
                            {new Date(c.expires_at).toLocaleString()}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            expired
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                              : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                          }`}>
                            {expired ? t('expired') : t('active')}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
        <div className={`transition-all duration-300 ease-out ${
          activeTab === 'users'
            ? 'opacity-100 translate-x-0'
            : 'opacity-0 -translate-x-6 absolute inset-0 pointer-events-none'
        }`}>
      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <Search placeholder={t('searchPlaceholder')} />
        </div>

        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-muted rounded-lg" />
              </div>
            ))}
          </div>
        ) : users.length > 0 ? (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-5 py-3 text-xs font-medium text-text-tertiary tracking-wider uppercase">{t('username')}</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-text-tertiary tracking-wider uppercase">{t('email')}</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-text-tertiary tracking-wider uppercase">{t('role')}</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-text-tertiary tracking-wider uppercase">{t('status')}</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-text-tertiary tracking-wider uppercase">{t('createdAt')}</th>
                    <th className="text-right px-5 py-3 text-xs font-medium text-text-tertiary tracking-wider uppercase">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <UserAvatar user={user} />
                          <div className="min-w-0">
                            <p className="font-medium text-text-primary truncate">{user.username}</p>
                            <p className="text-xs text-text-tertiary truncate">{user.nickname || '-'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-text-secondary">{user.email}</td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${
                            user.role === 'admin'
                              ? 'bg-accent-button/10 text-accent-button'
                              : 'bg-muted text-text-secondary'
                          }`}
                        >
                          <Shield className="w-3 h-3" />
                          {getRoleLabel(user.role)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          {user.email_verified ? (
                            <span className="text-xs px-2 py-0.5 bg-success/10 text-success-foreground rounded-full">{t('verified')}</span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 bg-warning/10 text-warning-foreground rounded-full">{t('unverified')}</span>
                          )}
                          {user.two_factor_enabled && (
                            <span className="text-xs px-2 py-0.5 bg-info/10 text-info-foreground rounded-full">2FA</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-text-tertiary">
                        {new Date(user.created_at).toLocaleDateString('zh-CN')}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleEditUser(user)}
                            className="inline-flex items-center gap-1 text-sm text-accent-foreground hover:bg-accent px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            {t('edit')}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id, user.username)}
                            className="inline-flex items-center gap-1 text-sm text-destructive hover:bg-error px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            {t('delete')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden p-3 space-y-3">
              {users.map((user) => (
                <div
                  key={user.id}
                  className={`relative rounded-2xl overflow-hidden shadow-sm border transition-shadow hover:shadow-md ${
                    user.role === 'admin'
                      ? 'border-accent-button/30 bg-card'
                      : 'border-border/60 bg-card'
                  }`}
                >
                  {/* Role accent bar */}
                  {user.role === 'admin' && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent-button rounded-l-2xl" />
                  )}

                  <div className={`p-4 ${user.role === 'admin' ? 'pl-5' : ''}`}>
                    {/* Top: Avatar + Info + Actions */}
                    <div className="flex items-start gap-3.5">
                      <UserAvatar user={user} />
                      <div className="min-w-0 flex-1">
                        {/* Username + Role */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-text-primary truncate text-[15px] leading-tight">
                            {user.username}
                          </p>
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                              user.role === 'admin'
                                ? 'bg-accent-button/10 text-accent-button'
                                : user.role === 'developer'
                                  ? 'bg-info/10 text-info-foreground'
                                  : 'bg-muted text-text-secondary'
                            }`}
                          >
                            <Shield className="w-3 h-3" />
                            {getRoleLabel(user.role)}
                          </span>
                        </div>
                        {/* Nickname */}
                        {user.nickname && (
                          <p className="text-xs text-text-tertiary mt-0.5 truncate">{user.nickname}</p>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="p-2 text-accent-foreground hover:bg-accent/10 rounded-xl transition-colors"
                          title={t('edit')}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id, user.username)}
                          className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded-xl transition-colors"
                          title={t('delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="mt-3.5 mb-3 h-px bg-border/60" />

                    {/* Bottom: Email, Status, Date */}
                    <div className="space-y-2">
                      {/* Email */}
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-muted/60 flex items-center justify-center shrink-0">
                          <Mail className="w-3.5 h-3.5 text-text-quaternary" />
                        </div>
                        <span className="text-sm text-text-secondary truncate">{user.email}</span>
                      </div>

                      {/* Status + Date */}
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-muted/60 flex items-center justify-center shrink-0">
                          <CalendarClock className="w-3.5 h-3.5 text-text-quaternary" />
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                          {user.email_verified ? (
                            <span className="text-[11px] px-2 py-0.5 bg-success/10 text-success-foreground rounded-full font-medium shrink-0">
                              {t('verified')}
                            </span>
                          ) : (
                            <span className="text-[11px] px-2 py-0.5 bg-warning/10 text-warning-foreground rounded-full font-medium shrink-0">
                              {t('unverified')}
                            </span>
                          )}
                          {user.two_factor_enabled && (
                            <span className="text-[11px] px-2 py-0.5 bg-info/10 text-info-foreground rounded-full font-medium shrink-0">
                              2FA
                            </span>
                          )}
                          <span className="text-xs text-text-quaternary ml-auto shrink-0">
                            {new Date(user.created_at).toLocaleDateString('zh-CN')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Pagination total={total} currentPage={page} itemsPerPage={limit} />
          </>
        ) : (
          <div className="text-center py-16 md:py-20">
            <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
              <UserIcon className="w-8 h-8 text-text-quaternary" />
            </div>
            <p className="text-text-secondary font-medium">{t('noUsers')}</p>
            <p className="text-sm text-text-quaternary mt-1">{t('noUsers')}</p>
          </div>
        )}
      </div>
        </div>
      </div>

      {/* Edit User Modal */}
      <Modal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        title={editingUser?.username || t('editUser')}
        maxWidth="max-w-lg mx-4"
        footer={
          <div className="flex justify-end gap-3 p-4 border-t border-border">
            <button
              onClick={() => setEditingUser(null)}
              className="flex-1 md:flex-none px-4 py-2.5 text-sm text-text-secondary bg-muted rounded-xl hover:bg-border-strong transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleSaveUser}
              disabled={saving}
              className="flex-1 md:flex-none px-4 py-2.5 text-sm text-white bg-accent-button rounded-xl hover:bg-accent-button-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving && <Spinner className="h-4 w-4" />}
              {saving ? t('saving') : t('save')}
            </button>
          </div>
        }
      >
        <div className="space-y-5">
          {/* Avatar */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2 tracking-wide uppercase">
              <UserIcon className="w-3.5 h-3.5" />
              {t('avatar')}
            </label>
            {editingUser && (
              <AvatarUpload
                currentAvatar={editingAvatar}
                onAvatarChange={(url) => {
                  setEditingAvatar(url);
                  // Local update instead of full re-fetch
                  if (editingUser) {
                    setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, avatar: url } : u));
                    // Sync sidebar avatar if editing self
                    if (String(editingUser.id) === currentUserId) {
                      setAdminAvatar(url);
                    }
                  }
                }}
                uploadUrl={`/api/admin/users/${editingUser.id}/avatar`}
                deleteUrl={`/api/admin/users/${editingUser.id}/avatar`}
              >
                {({ isUploading, preview, triggerUpload, handleDelete }) => (
                  <div className="flex items-center gap-4">
                    <div className="relative shrink-0">
                      <div className="relative w-20 h-20 rounded-full overflow-hidden bg-muted border-2 border-border">
                        {(preview || editingAvatar) ? (
                          <Image src={preview || editingAvatar!} alt="" fill className="object-cover" unoptimized />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-text-quaternary text-2xl">
                            👤
                          </div>
                        )}
                      </div>
                      {isUploading && (
                        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                          <svg className="animate-spin h-6 w-6 text-white" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={triggerUpload}
                          disabled={isUploading}
                          className={`inline-block px-4 py-2 bg-accent-button text-white rounded-lg hover:bg-accent-button-hover transition-colors cursor-pointer text-sm font-medium ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {editingAvatar ? t('changeAvatar') : t('uploadAvatar')}
                        </button>
                        {editingAvatar && (
                          <button
                            type="button"
                            onClick={handleDelete}
                            disabled={isUploading}
                            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {t('delete')}
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-text-tertiary">{t('avatarHint')}</p>
                    </div>
                  </div>
                )}
              </AvatarUpload>
            )}
          </div>

          {/* Username */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2 tracking-wide uppercase">
              <UserIcon className="w-3.5 h-3.5" />
              {t('username')}
            </label>
            <input
              type="text"
              value={editForm.username}
              onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
              onFocus={() => setFocused('username')}
              onBlur={() => setFocused(null)}
              className="w-full px-4 py-3 bg-background border rounded-xl text-sm text-foreground placeholder-muted-foreground/50 outline-none transition-all duration-200"
              style={inputStyle('username')}
              placeholder={t('username')}
            />
          </div>

          {/* Nickname */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2 tracking-wide uppercase">
              <UserIcon className="w-3.5 h-3.5" />
              {t('nickname')}
            </label>
            <input
              type="text"
              value={editForm.nickname}
              onChange={(e) => setEditForm({ ...editForm, nickname: e.target.value })}
              onFocus={() => setFocused('nickname')}
              onBlur={() => setFocused(null)}
              className="w-full px-4 py-3 bg-background border rounded-xl text-sm text-foreground placeholder-muted-foreground/50 outline-none transition-all duration-200"
              style={inputStyle('nickname')}
              placeholder={t('nickname')}
            />
          </div>

          {/* Email */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2 tracking-wide uppercase">
              <Mail className="w-3.5 h-3.5" />
              {t('email')}
            </label>
            <input
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              onFocus={() => setFocused('email')}
              onBlur={() => setFocused(null)}
              className="w-full px-4 py-3 bg-background border rounded-xl text-sm text-foreground placeholder-muted-foreground/50 outline-none transition-all duration-200"
              style={inputStyle('email')}
              placeholder={t('email')}
            />
          </div>

          {/* Role */}
          {editingUser && String(editingUser.id) !== currentUserId && (
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2 tracking-wide uppercase">
                <Shield className="w-3.5 h-3.5" />
                {t('role')}
              </label>
              <select
                value={editForm.role}
                onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                className="w-full px-4 py-3 bg-background border border-border-input rounded-xl text-sm text-foreground outline-none transition-all duration-200 focus:border-accent-button focus:ring-2 focus:ring-accent-button/20"
              >
                <option value="user">{t('roleUser')}</option>
                <option value="developer">{t('roleDeveloper')}</option>
                <option value="admin">{t('roleAdmin')}</option>
              </select>
            </div>
          )}

          {/* Email Verified Toggle */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2 tracking-wide uppercase">
              <Mail className="w-3.5 h-3.5" />
              {t('status')}
            </label>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <button
                type="button"
                role="switch"
                aria-checked={editForm.emailVerified}
                onClick={() => setEditForm({ ...editForm, emailVerified: !editForm.emailVerified })}
                className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent-button/20 ${editForm.emailVerified ? '' : 'bg-muted border border-border'}`}
                style={editForm.emailVerified ? { backgroundColor: 'rgb(48, 164, 108)' } : undefined}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                    editForm.emailVerified ? 'left-[22px]' : 'left-0.5'
                  }`}
                />
              </button>
              <span className={`text-sm font-medium ${editForm.emailVerified ? 'text-[rgb(48,164,108)]' : 'text-text-tertiary'}`}>
                {editForm.emailVerified ? t('verified') : t('unverified')}
              </span>
            </label>
          </div>

          {/* Password */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2 tracking-wide uppercase">
              <Key className="w-3.5 h-3.5" />
              {t('resetPassword')}
            </label>
            <input
              type="password"
              value={editForm.newPassword}
              onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
              onFocus={() => setFocused('newPassword')}
              onBlur={() => setFocused(null)}
              className="w-full px-4 py-3 bg-background border rounded-xl text-sm text-foreground placeholder-muted-foreground/50 outline-none transition-all duration-200"
              style={inputStyle('newPassword')}
              placeholder={t('leaveEmptyForNoChange')}
            />
            <p className="text-xs text-text-quaternary mt-1.5">{t('leaveEmptyForNoChangePassword')}</p>
          </div>

          {/* Passkeys */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2 tracking-wide uppercase">
              <Fingerprint className="w-3.5 h-3.5" />
              Passkey
            </label>
            {loadingPasskeys ? (
              <div className="animate-pulse h-16 bg-muted rounded-xl" />
            ) : userPasskeys.length > 0 ? (
              <div className="space-y-2">
                {userPasskeys.map((cred) => (
                  <div
                    key={cred.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <Image src={cred.providerIcon} alt="" width={20} height={20} className="object-contain shrink-0" unoptimized />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-text-primary truncate">{cred.name || t('passkeyUnnamed')}</p>
                        <p className="text-xs text-text-quaternary">{cred.providerName}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeletePasskey(String(editingUser!.id), cred.id)}
                      className="p-2 text-text-quaternary hover:text-destructive hover:bg-error/10 rounded-xl transition-colors shrink-0 ml-2"
                      title={t('delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-quaternary">{t('noPasskeys')}</p>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
