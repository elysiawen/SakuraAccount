'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/components/ConfirmProvider';
import { Plus, Settings, Box, Info, Shield, Code } from 'lucide-react';

interface App {
  id: string;
  name: string;
  description: string;
  scopes: string[];
  createdAt: string;
}

export default function AuthorizedAppsPage() {
  const { success, error } = useToast();
  const { confirm } = useConfirm();
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApps();
  }, []);

  const fetchApps = async () => {
    try {
      const res = await fetch('/api/applications/tokens');
      const data = await res.json();
      // Group tokens by clientId to get unique apps
      const tokenList = data.tokens || [];
      const appMap = new Map<string, App>();
      tokenList.forEach((token: any) => {
        if (!appMap.has(token.clientId)) {
          appMap.set(token.clientId, {
            id: token.clientId,
            name: token.clientId,
            description: '',
            scopes: token.scopes,
            createdAt: token.expiresAt,
          });
        }
      });
      setApps(Array.from(appMap.values()));
    } catch (err) {
      console.error('Failed to fetch apps:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (appId: string) => {
    confirm('确定要撤销此应用的授权吗？该应用将无法再访问您的数据。', {
      confirmText: '撤销授权',
      confirmColor: 'red',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/applications/tokens?id=${appId}`, {
            method: 'DELETE',
          });
          if (res.ok) {
            success('授权已撤销');
            fetchApps();
          } else {
            error('撤销失败');
          }
        } catch (err) {
          error('撤销失败');
        }
      },
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* My Apps */}
      <div className="bg-card rounded-xl shadow-sm border border-border">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text-primary">已授权应用</h2>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-40 bg-muted rounded-xl"></div>
                </div>
              ))}
            </div>
          ) : apps.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {apps.map((app) => (
                <div key={app.id} className="border border-border rounded-xl p-4 hover:border-accent-foreground/20 transition-colors">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                      <Box className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-text-primary">{app.name}</h3>
                      <span className="text-xs px-2 py-0.5 bg-success text-success-foreground rounded-full">
                        活跃
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-text-tertiary mb-3">
                    {app.description || '无描述'}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-quaternary">
                      授权于: {formatDate(app.createdAt)}
                    </span>
                    <button
                      onClick={() => handleRevoke(app.id)}
                      className="text-xs text-destructive hover:bg-error px-2 py-1 rounded-lg transition-colors"
                    >
                      撤销授权
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Box className="w-12 h-12 text-text-quaternary mx-auto mb-4" />
              <p className="text-text-tertiary">暂无已授权的应用</p>
              <p className="text-sm text-text-quaternary mt-1">当您使用第三方应用登录时，授权的应用会显示在这里</p>
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
    </div>
  );
}
