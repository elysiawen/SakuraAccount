'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/components/ConfirmProvider';

interface Credential {
  id: string;
  device_type: string;
  backup_state: boolean;
  created_at: string;
}

export default function SettingsPage() {
  const { success, error } = useToast();
  const { confirm } = useConfirm();

  // Profile state
  const [user, setUser] = useState<any>(null);
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Passkey state
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loadingCredentials, setLoadingCredentials] = useState(true);

  // General
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
    fetchCredentials();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/auth/session');
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
        setNickname(data.user.nickname || '');
        setEmail(data.user.email || '');
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCredentials = async () => {
    try {
      const res = await fetch('/api/auth/webauthn');
      const data = await res.json();
      setCredentials(data.credentials || []);
    } catch (err) {
      console.error('Failed to fetch credentials:', err);
    } finally {
      setLoadingCredentials(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);

    try {
      const res = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, email }),
      });

      const data = await res.json();

      if (res.ok) {
        success('个人资料已更新');
        fetchProfile();
      } else {
        error(data.error || '更新失败');
      }
    } catch (err) {
      error('网络错误');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      error('请填写所有密码字段');
      return;
    }

    if (newPassword !== confirmPassword) {
      error('两次输入的密码不一致');
      return;
    }

    if (newPassword.length < 8) {
      error('新密码长度至少8位');
      return;
    }

    setChangingPassword(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (res.ok) {
        success('密码修改成功');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        error(data.error || '密码修改失败');
      }
    } catch (err) {
      error('网络错误');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleAddPasskey = async () => {
    try {
      const { startRegistration } = await import('@simplewebauthn/browser');

      const optionsRes = await fetch('/api/auth/webauthn/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate' }),
      });

      const { options } = await optionsRes.json();
      const response = await startRegistration({ optionsJSON: options });

      const verifyRes = await fetch('/api/auth/webauthn/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          response,
          challenge: options.challenge,
        }),
      });

      const data = await verifyRes.json();

      if (data.verified) {
        success('Passkey 添加成功');
        fetchCredentials();
      } else {
        error('Passkey 添加失败');
      }
    } catch (err: any) {
      if (err.name !== 'NotAllowedError') {
        error('Passkey 添加失败');
      }
    }
  };

  const handleRemovePasskey = async (credentialId: string) => {
    confirm('确定要删除此 Passkey 吗？', {
      confirmText: '删除',
      confirmColor: 'red',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/auth/webauthn?id=${credentialId}`, {
            method: 'DELETE',
          });

          if (res.ok) {
            success('Passkey 已删除');
            fetchCredentials();
          } else {
            error('删除失败');
          }
        } catch (err) {
          error('删除失败');
        }
      },
    });
  };

  const handleDeleteAccount = async () => {
    confirm('确定要删除账号吗？此操作不可撤销，所有数据将被永久删除。', {
      confirmText: '删除账号',
      confirmColor: 'red',
      onConfirm: async () => {
        try {
          const res = await fetch('/api/auth/delete-account', {
            method: 'POST',
          });

          if (res.ok) {
            success('账号已删除');
            window.location.href = '/';
          } else {
            error('删除失败');
          }
        } catch (err) {
          error('删除失败');
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
      <h1 className="text-2xl font-bold text-text-primary">设置</h1>

      {/* Profile Section */}
      <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-2xl">👤</span>
          <h2 className="text-lg font-semibold text-text-primary">个人资料</h2>
        </div>

        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-text-tertiary text-2xl font-semibold border-2 border-border">
            {user?.avatar ? (
              <img src={user.avatar} alt="头像" className="w-full h-full object-cover rounded-full" />
            ) : (
              <span>{(nickname || user?.username || '').slice(0, 2).toUpperCase()}</span>
            )}
          </div>
          <div>
            <p className="font-medium text-text-primary">{user?.username}</p>
            <p className="text-sm text-text-tertiary">{user?.role}</p>
          </div>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">用户名</label>
            <input
              type="text"
              value={user?.username || ''}
              className="w-full px-4 py-2.5 border border-border-input rounded-xl bg-muted text-text-tertiary cursor-not-allowed"
              disabled
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">昵称</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full px-4 py-2.5 border border-border-input rounded-xl bg-card text-text-primary focus:outline-none focus:border-accent-foreground focus:ring-1 focus:ring-accent-foreground transition-colors"
              placeholder="输入昵称"
              disabled={savingProfile}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 border border-border-input rounded-xl bg-card text-text-primary focus:outline-none focus:border-accent-foreground focus:ring-1 focus:ring-accent-foreground transition-colors"
              placeholder="输入邮箱"
              disabled={savingProfile}
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingProfile}
              className="px-6 py-2.5 bg-accent-button text-white rounded-xl font-medium hover:bg-accent-button-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {savingProfile && (
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {savingProfile ? '保存中...' : '保存资料'}
            </button>
          </div>
        </form>
      </div>

      {/* Password Section */}
      <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-2xl">🔑</span>
          <h2 className="text-lg font-semibold text-text-primary">修改密码</h2>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">当前密码</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-border-input rounded-xl bg-card text-text-primary focus:outline-none focus:border-accent-foreground focus:ring-1 focus:ring-accent-foreground transition-colors"
              placeholder="请输入当前密码"
              disabled={changingPassword}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">新密码</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-border-input rounded-xl bg-card text-text-primary focus:outline-none focus:border-accent-foreground focus:ring-1 focus:ring-accent-foreground transition-colors"
              placeholder="请输入新密码（至少8位）"
              disabled={changingPassword}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">确认新密码</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-border-input rounded-xl bg-card text-text-primary focus:outline-none focus:border-accent-foreground focus:ring-1 focus:ring-accent-foreground transition-colors"
              placeholder="请再次输入新密码"
              disabled={changingPassword}
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={changingPassword}
              className="px-6 py-2.5 bg-accent-button text-white rounded-xl font-medium hover:bg-accent-button-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {changingPassword && (
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {changingPassword ? '修改中...' : '修改密码'}
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
              <p className="text-sm text-text-tertiary">无密码登录</p>
            </div>
          </div>
          <button
            onClick={handleAddPasskey}
            className="px-4 py-2 bg-accent-button text-white rounded-xl text-sm font-medium hover:bg-accent-button-hover transition-colors flex items-center gap-2"
          >
            <span>+</span>
            <span>添加 Passkey</span>
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
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🔑</span>
                  <div>
                    <p className="font-medium text-text-primary">{cred.device_type || 'Passkey'}</p>
                    <p className="text-xs text-text-tertiary">
                      添加于 {new Date(cred.created_at).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemovePasskey(cred.id)}
                  className="px-3 py-1.5 text-sm text-destructive hover:bg-error rounded-lg transition-colors"
                >
                  删除
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <span className="text-4xl mb-4 block">🔐</span>
            <p className="text-text-tertiary">暂无 Passkey</p>
            <p className="text-sm text-text-quaternary mt-1">添加 Passkey 以启用无密码登录</p>
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className="bg-card rounded-xl p-6 shadow-sm border border-destructive/30">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-2xl">⚠️</span>
          <h2 className="text-lg font-semibold text-destructive">危险操作</h2>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-text-primary">删除账号</p>
            <p className="text-sm text-text-tertiary">永久删除您的账号和所有数据，此操作不可撤销</p>
          </div>
          <button
            onClick={handleDeleteAccount}
            className="px-4 py-2 text-sm text-destructive border border-destructive/30 rounded-xl hover:bg-error transition-colors"
          >
            删除账号
          </button>
        </div>
      </div>
    </div>
  );
}
