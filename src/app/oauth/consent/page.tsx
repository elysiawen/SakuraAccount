'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Shield, User, Mail, Fingerprint, Check, X } from 'lucide-react';

const SCOPE_INFO: Record<string, { label: string; description: string; icon: typeof User }> = {
  openid: { label: '身份验证', description: '验证您的身份', icon: Fingerprint },
  profile: { label: '个人资料', description: '访问您的昵称、头像等基本信息', icon: User },
  email: { label: '电子邮箱', description: '访问您的邮箱地址', icon: Mail },
};

export default function ConsentPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientDescription, setClientDescription] = useState('');

  const clientId = searchParams.get('client_id');
  const redirectUri = searchParams.get('redirect_uri');
  const scope = searchParams.get('scope');
  const state = searchParams.get('state');
  const nonce = searchParams.get('nonce');
  const prompt = searchParams.get('prompt');

  const scopes = scope ? scope.split(' ') : ['openid', 'profile'];

  useEffect(() => {
    if (!clientId) return;
    fetch(`/api/applications/info?id=${clientId}`)
      .then(res => res.json())
      .then(data => {
        if (data.client) {
          setClientName(data.client.name);
          setClientDescription(data.client.description || '');
        }
      })
      .catch(() => {});
  }, [clientId]);

  const handleDecision = async (approved: boolean) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (clientId) params.set('client_id', clientId);
      if (redirectUri) params.set('redirect_uri', redirectUri);
      if (scope) params.set('scope', scope);
      if (state) params.set('state', state);
      if (nonce) params.set('nonce', nonce || '');
      params.set('approved', approved.toString());

      const res = await fetch('/api/applications/consent', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      const data = await res.json();

      if (data.redirect) {
        window.location.href = data.redirect;
      }
    } catch {
      setLoading(false);
    }
  };

  if (!clientId || !redirectUri) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-destructive">缺少必要参数</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-lg border border-border overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-text-primary">授权请求</h1>
          <p className="text-sm text-text-secondary mt-1">
            <span className="font-medium text-text-primary">{clientName || clientId}</span> 请求访问您的账户
          </p>
          {clientDescription && (
            <p className="text-xs text-text-tertiary mt-1">{clientDescription}</p>
          )}
        </div>

        {/* Scopes */}
        <div className="px-6 py-4 border-t border-border">
          <p className="text-sm font-medium text-text-secondary mb-3">此应用请求以下权限：</p>
          <div className="space-y-3">
            {scopes.map((s) => {
              const info = SCOPE_INFO[s];
              if (!info) return null;
              const Icon = info.icon;
              return (
                <div key={s} className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">{info.label}</p>
                    <p className="text-xs text-text-tertiary">{info.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-border flex gap-3">
          <button
            onClick={() => handleDecision(false)}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-text-secondary bg-muted rounded-xl hover:bg-border-strong transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
            拒绝
          </button>
          <button
            onClick={() => handleDecision(true)}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-accent-button rounded-xl hover:bg-accent-button-hover transition-colors disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            {loading ? '处理中...' : '允许'}
          </button>
        </div>
      </div>
    </div>
  );
}
