'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/components/ConfirmProvider';
import Modal from '@/components/Modal';
import { Plus, Settings, Box, Info, Shield, Code, Trash2 } from 'lucide-react';
import { resolveAppIcon } from '@/lib/app-icon';

interface OAuth2Client {
  nanoId: string;
  name: string;
  description: string;
  icon?: string;
  appUrl?: string;
  redirectUris: string[];
  status: 'active' | 'disabled';
  userId: string;
  createdAt: string;
}

const AVATAR_COLORS = [
  'from-pink-500/80 to-rose-500/80',
  'from-violet-500/80 to-purple-500/80',
  'from-sky-500/80 to-cyan-500/80',
  'from-emerald-500/80 to-teal-500/80',
  'from-amber-500/80 to-orange-500/80',
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function AppIconSmall({ client }: { client: OAuth2Client }) {
  const [errored, setErrored] = useState(false);
  const iconUrl = resolveAppIcon(client);

  if (iconUrl && !errored) {
    return (
      <img
        src={iconUrl}
        alt={client.name}
        className="w-12 h-12 rounded-lg object-cover bg-muted"
        onError={() => setErrored(true)}
      />
    );
  }

  return (
    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${getAvatarColor(client.name)} flex items-center justify-center text-white font-bold shadow-md shadow-black/10`}>
      {client.name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function AdminOAuth2Page() {
  const { success, error } = useToast();
  const { confirm } = useConfirm();
  const [clients, setClients] = useState<OAuth2Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newClient, setNewClient] = useState({
    name: '',
    description: '',
    appUrl: '',
    redirectUris: '',
    scopes: 'profile email',
    grants: ['authorization_code', 'refresh_token'] as string[],
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/admin/applications');
      const data = await res.json();
      setClients(data.clients || []);
    } catch (err) {
      console.error('Failed to fetch clients:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClient = async () => {
    if (!newClient.name || !newClient.redirectUris) {
      error('请填写必要字段');
      return;
    }

    try {
      const res = await fetch('/api/admin/applications', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newClient.name,
          description: newClient.description,
          appUrl: newClient.appUrl || null,
          redirectUris: newClient.redirectUris.split('\n').map(u => u.trim()).filter(Boolean),
          grants: newClient.grants,
          scopes: newClient.scopes.split(' ').filter(Boolean),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        success('应用创建成功');
        setShowCreateModal(false);
        setNewClient({ name: '', description: '', appUrl: '', redirectUris: '', scopes: 'profile email', grants: ['authorization_code', 'refresh_token'] });
        fetchClients();
      } else {
        error(data.error || '创建失败');
      }
    } catch (err) {
      error('创建失败');
    }
  };

  const handleDeleteClient = async (nanoId: string, clientName: string) => {
    confirm(`确定要删除应用 "${clientName}" 吗？`, {
      confirmText: '删除',
      confirmColor: 'red',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/applications/${nanoId}`, {
            method: 'DELETE',
            credentials: 'include',
          });

          if (res.ok) {
            success('应用已删除');
            fetchClients();
          } else {
            error('删除失败');
          }
        } catch (err) {
          error('删除失败');
        }
      },
    });
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">应用管理</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-accent-button rounded-lg hover:bg-accent-button-hover transition-colors"
        >
          <Plus className="w-4 h-4" />
          创建新应用
        </button>
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-border">
        <div className="p-6">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-40 bg-muted rounded-xl"></div>
                </div>
              ))}
            </div>
          ) : clients.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clients.map((client) => (
                <Link
                  key={client.nanoId}
                  href={`/admin/applications/${client.nanoId}`}
                  className="border border-border rounded-xl p-4 hover:border-accent-foreground/20 hover:shadow-md transition-all block"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <AppIconSmall client={client} />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-text-primary truncate">{client.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        client.status === 'disabled'
                          ? 'bg-destructive text-destructive-foreground'
                          : 'bg-success text-success-foreground'
                      }`}>
                        {client.status === 'disabled' ? '禁用' : '活跃'}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-text-tertiary mb-3 line-clamp-2">
                    {client.description || '无描述'}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-quaternary">
                      ID: {client.nanoId.slice(0, 8)}...
                    </span>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDeleteClient(client.nanoId, client.name);
                      }}
                      className="flex items-center gap-1 text-xs text-destructive hover:bg-error px-2 py-1 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      删除
                    </button>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Box className="w-12 h-12 text-text-quaternary mx-auto mb-4" />
              <p className="text-text-tertiary">暂无应用</p>
              <p className="text-sm text-text-quaternary mt-1">点击上方按钮创建新应用</p>
            </div>
          )}
        </div>
      </div>

      {/* Documentation */}
      <div className="bg-card rounded-xl shadow-sm border border-border">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text-primary">接入说明</h2>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <h3 className="flex items-center gap-2 text-base font-medium text-text-primary mb-2">
              <Info className="w-4 h-4 text-primary" />
              什么是应用接入？
            </h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              通过创建应用，您可以让您的网站或应用使用 Sakura Account 账号系统进行用户认证，无需自己开发和维护用户系统。
            </p>
          </div>

          <div>
            <h3 className="flex items-center gap-2 text-base font-medium text-text-primary mb-2">
              <Shield className="w-4 h-4 text-primary" />
              支持的认证方式
            </h3>
            <ul className="text-sm text-text-secondary space-y-1.5 ml-6">
              <li><strong>OAuth 2.0</strong> - 标准的授权框架，用于授权第三方应用访问用户资源</li>
              <li><strong>OpenID Connect</strong> - 基于 OAuth 2.0 的身份认证层，提供用户身份验证</li>
              <li><strong>单点登录 (SSO)</strong> - 让用户一次登录，访问多个系统</li>
            </ul>
          </div>

          <div>
            <h3 className="flex items-center gap-2 text-base font-medium text-text-primary mb-2">
              <Code className="w-4 h-4 text-primary" />
              开发资源
            </h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              查看我们的 API 文档，了解如何在您的应用中集成 Sakura Account 账号系统。
            </p>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="创建 OAuth2 应用"
        footer={
          <div className="flex justify-end gap-3 p-4 border-t border-border">
            <button
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 text-sm text-text-secondary bg-muted rounded-xl hover:bg-border-strong transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleCreateClient}
              className="px-4 py-2 text-sm text-white bg-accent-button rounded-xl hover:bg-accent-button-hover transition-colors"
            >
              创建
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">应用名称 *</label>
            <input
              type="text"
              value={newClient.name}
              onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
              className="w-full px-4 py-2.5 border border-border-input rounded-xl bg-card text-text-primary focus:outline-none focus:border-accent-foreground focus:ring-1 focus:ring-accent-foreground transition-colors"
              placeholder="输入应用名称"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">应用描述</label>
            <input
              type="text"
              value={newClient.description}
              onChange={(e) => setNewClient({ ...newClient, description: e.target.value })}
              className="w-full px-4 py-2.5 border border-border-input rounded-xl bg-card text-text-primary focus:outline-none focus:border-accent-foreground focus:ring-1 focus:ring-accent-foreground transition-colors"
              placeholder="输入应用描述"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">应用网站</label>
            <input
              type="url"
              value={newClient.appUrl}
              onChange={(e) => setNewClient({ ...newClient, appUrl: e.target.value })}
              className="w-full px-4 py-2.5 border border-border-input rounded-xl bg-card text-text-primary focus:outline-none focus:border-accent-foreground focus:ring-1 focus:ring-accent-foreground transition-colors"
              placeholder="https://example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Redirect URIs *（每行一个）</label>
            <textarea
              value={newClient.redirectUris}
              onChange={(e) => setNewClient({ ...newClient, redirectUris: e.target.value })}
              className="w-full px-4 py-2.5 border border-border-input rounded-xl bg-card text-text-primary focus:outline-none focus:border-accent-foreground focus:ring-1 focus:ring-accent-foreground transition-colors h-24 resize-none"
              placeholder="https://example.com/callback"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">授权类型</label>
            <div className="space-y-2">
              {[
                { value: 'authorization_code', label: '授权码（推荐）' },
                { value: 'client_credentials', label: '客户端凭证' },
                { value: 'refresh_token', label: 'refresh_token' },
              ].map((grant) => (
                <label key={grant.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newClient.grants.includes(grant.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setNewClient({ ...newClient, grants: [...newClient.grants, grant.value] });
                      } else {
                        setNewClient({ ...newClient, grants: newClient.grants.filter(g => g !== grant.value) });
                      }
                    }}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-text-primary">{grant.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">请求权限</label>
            <div className="space-y-2">
              {[
                { value: 'openid', label: 'OpenID Connect身份验证' },
                { value: 'profile', label: '个人资料' },
                { value: 'email', label: '电子邮箱' },
              ].map((scope) => (
                <label key={scope.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newClient.scopes.split(' ').includes(scope.value)}
                    onChange={(e) => {
                      const current = newClient.scopes.split(' ').filter(Boolean);
                      if (e.target.checked) {
                        setNewClient({ ...newClient, scopes: [...current, scope.value].join(' ') });
                      } else {
                        setNewClient({ ...newClient, scopes: current.filter(s => s !== scope.value).join(' ') });
                      }
                    }}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-text-primary">{scope.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
