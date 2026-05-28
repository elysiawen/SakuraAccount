'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/components/ConfirmProvider';
import Search from '@/components/Search';
import Pagination from '@/components/Pagination';
import Modal from '@/components/Modal';

interface User {
  id: number;
  username: string;
  email: string;
  nickname: string;
  role: string;
  email_verified: boolean;
  two_factor_enabled: boolean;
  created_at: string;
}

export default function AdminUsersPage() {
  const { success, error } = useToast();
  const { confirm } = useConfirm();
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ username: '', nickname: '', email: '', newPassword: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [page, limit]);

  const fetchUsers = async () => {
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
  };

  const handleDeleteUser = async (userId: number, username: string) => {
    confirm(`确定要删除用户 "${username}" 吗？此操作不可撤销。`, {
      confirmText: '删除',
      confirmColor: 'red',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/users?id=${userId}`, {
            method: 'DELETE',
          });

          if (res.ok) {
            success('用户已删除');
            fetchUsers();
          } else {
            const data = await res.json();
            error(data.error || '删除失败');
          }
        } catch (err) {
          error('删除失败');
        }
      },
    });
  };

  const handleToggleRole = async (userId: number, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    confirm(`确定要将此用户的角色更改为 "${newRole}" 吗？`, {
      confirmText: '确认',
      onConfirm: async () => {
        try {
          const res = await fetch('/api/admin/users', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: userId, role: newRole }),
          });

          if (res.ok) {
            success('用户角色已更新');
            fetchUsers();
          } else {
            error('更新失败');
          }
        } catch (err) {
          error('更新失败');
        }
      },
    });
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditForm({
      username: user.username || '',
      nickname: user.nickname || '',
      email: user.email || '',
      newPassword: '',
    });
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    setSaving(true);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingUser.id,
          username: editForm.username,
          nickname: editForm.nickname,
          email: editForm.email,
          newPassword: editForm.newPassword || undefined,
        }),
      });

      if (res.ok) {
        success('用户信息已更新');
        setEditingUser(null);
        fetchUsers();
      } else {
        const data = await res.json();
        error(data.error || '更新失败');
      }
    } catch (err) {
      error('更新失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">用户管理</h1>
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <Search placeholder="搜索用户名、邮箱或昵称..." />
        </div>

        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-muted rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : users.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 text-sm font-medium text-text-secondary">用户</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-text-secondary">邮箱</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-text-secondary">角色</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-text-secondary">状态</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-text-secondary">注册时间</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-text-secondary">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-text-primary">{user.username}</p>
                          <p className="text-xs text-text-tertiary">{user.nickname || '-'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">{user.email}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleRole(user.id, user.role)}
                          className={`text-xs px-2 py-1 rounded-full font-medium ${
                            user.role === 'admin'
                              ? 'bg-accent text-accent-foreground'
                              : 'bg-muted text-text-secondary'
                          }`}
                        >
                          {user.role}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {user.email_verified ? (
                            <span className="text-xs px-2 py-0.5 bg-success text-success-foreground rounded-full">
                              已验证
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 bg-warning text-warning-foreground rounded-full">
                              未验证
                            </span>
                          )}
                          {user.two_factor_enabled && (
                            <span className="text-xs px-2 py-0.5 bg-info text-info-foreground rounded-full">
                              2FA
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-tertiary">
                        {new Date(user.created_at).toLocaleDateString('zh-CN')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEditUser(user)}
                            className="text-sm text-accent-foreground hover:bg-accent px-2 py-1 rounded-lg transition-colors"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id, user.username)}
                            className="text-sm text-destructive hover:bg-error px-2 py-1 rounded-lg transition-colors"
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination total={total} currentPage={page} itemsPerPage={limit} />
          </>
        ) : (
          <div className="text-center py-12">
            <span className="text-4xl mb-4 block">👥</span>
            <p className="text-text-tertiary">暂无用户</p>
          </div>
        )}
      </div>

      {/* Edit User Modal */}
      <Modal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        title={`编辑用户 - ${editingUser?.username}`}
        footer={
          <div className="flex justify-end gap-3 p-4 border-t border-border">
            <button
              onClick={() => setEditingUser(null)}
              className="px-4 py-2 text-sm text-text-secondary bg-muted rounded-xl hover:bg-border-strong transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSaveUser}
              disabled={saving}
              className="px-4 py-2 text-sm text-white bg-accent-button rounded-xl hover:bg-accent-button-hover transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving && (
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">用户名</label>
            <input
              type="text"
              value={editForm.username}
              onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
              className="w-full px-4 py-2.5 border border-border-input rounded-xl bg-card text-text-primary focus:outline-none focus:border-accent-foreground focus:ring-1 focus:ring-accent-foreground transition-colors"
              placeholder="输入用户名"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">昵称</label>
            <input
              type="text"
              value={editForm.nickname}
              onChange={(e) => setEditForm({ ...editForm, nickname: e.target.value })}
              className="w-full px-4 py-2.5 border border-border-input rounded-xl bg-card text-text-primary focus:outline-none focus:border-accent-foreground focus:ring-1 focus:ring-accent-foreground transition-colors"
              placeholder="输入昵称"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">邮箱</label>
            <input
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              className="w-full px-4 py-2.5 border border-border-input rounded-xl bg-card text-text-primary focus:outline-none focus:border-accent-foreground focus:ring-1 focus:ring-accent-foreground transition-colors"
              placeholder="输入邮箱"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">重置密码</label>
            <input
              type="password"
              value={editForm.newPassword}
              onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
              className="w-full px-4 py-2.5 border border-border-input rounded-xl bg-card text-text-primary focus:outline-none focus:border-accent-foreground focus:ring-1 focus:ring-accent-foreground transition-colors"
              placeholder="留空则不修改密码"
            />
            <p className="text-xs text-text-quaternary mt-1">留空表示不修改密码</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
