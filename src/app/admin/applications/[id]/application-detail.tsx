'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/components/ConfirmProvider';
import { parseIconConfig, resolveAppIcon } from '@/lib/app-icon';
import Modal from '@/components/Modal';
import {
  ArrowLeft,
  Trash2,
  Edit,
  Copy,
  Key,
  Lock,
  RefreshCw,
  User,
  Mail,
  Fingerprint,
  ExternalLink,
  Clock,
  Box,
  Shield,
} from 'lucide-react';

interface OAuth2Client {
  id: string;
  nanoId: string;
  secret: string;
  name: string;
  description?: string;
  icon?: string;
  appUrl?: string;
  redirectUris: string[];
  grants: string[];
  scopes: string[];
  status?: 'active' | 'disabled';
  userId?: string;
  createdAt?: string;
}

interface ApplicationDetailProps {
  client: OAuth2Client;
}

const GRANT_LABELS: Record<string, { label: string; icon: typeof Key }> = {
  authorization_code: { label: '授权码', icon: Key },
  client_credentials: { label: '客户端凭证', icon: Lock },
  refresh_token: { label: 'refresh_token', icon: RefreshCw },
};

const SCOPE_LABELS: Record<string, { label: string; icon: typeof User }> = {
  profile: { label: '个人资料', icon: User },
  email: { label: '电子邮箱', icon: Mail },
  openid: { label: 'OpenID Connect身份验证', icon: Fingerprint },
};

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

function AppIcon({ client, size = 'w-12 h-12 text-lg' }: { client: Pick<OAuth2Client, 'name' | 'icon' | 'redirectUris'>; size?: string }) {
  const [errored, setErrored] = useState(false);
  const iconUrl = resolveAppIcon(client);

  if (iconUrl && !errored) {
    return (
      <img
        src={iconUrl}
        alt={client.name}
        className={`${size} rounded-xl object-cover bg-muted`}
        onError={() => setErrored(true)}
      />
    );
  }

  return (
    <div className={`${size} rounded-xl bg-gradient-to-br ${getAvatarColor(client.name)} flex items-center justify-center text-white font-bold shadow-lg shadow-black/10`}>
      {client.name.charAt(0).toUpperCase()}
    </div>
  );
}

const OAUTH_ENDPOINTS = [
  { label: '授权端点', path: '/oauth/authorize' },
  { label: '令牌端点', path: '/oauth/token' },
  { label: '用户信息端点', path: '/oauth/userinfo' },
  { label: 'OpenID Connect发现文档', path: '/oauth/.well-known/openid-configuration' },
  { label: 'JWKS公钥', path: '/oauth/.well-known/jwks.json', note: '当启用RS256时，客户端应通过该地址获取公钥（JWKS）以验证ID Token的签名。' },
];

function CopyButton({ text }: { text: string }) {
  const { success } = useToast();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    success('已复制到剪贴板');
  };

  return (
    <button
      onClick={handleCopy}
      className="p-2 rounded-lg border border-border hover:bg-muted transition-colors"
      title="复制"
    >
      <Copy className="w-4 h-4 text-text-tertiary" />
    </button>
  );
}

export default function ApplicationDetail({ client: initialClient }: ApplicationDetailProps) {
  const router = useRouter();
  const { success, error } = useToast();
  const { confirm } = useConfirm();
  const [client, setClient] = useState(initialClient);
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: client.name,
    description: client.description || '',
    appUrl: client.appUrl || '',
    redirectUris: client.redirectUris.join('\n'),
    scopes: client.scopes.join(' '),
    grants: client.grants,
    status: client.status || 'active',
  });
  const [iconMode, setIconMode] = useState<'default' | 'auto' | 'custom'>(parseIconConfig(client.icon).mode);
  const [iconUrl, setIconUrl] = useState(parseIconConfig(client.icon).url || '');
  const [imgError, setImgError] = useState(false);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDelete = () => {
    confirm(`确定要删除应用 "${client.name}" 吗？此操作不可撤销。`, {
      confirmText: '删除',
      confirmColor: 'red',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/applications/${client.nanoId}`, { method: 'DELETE', credentials: 'include' });
          if (res.ok) {
            success('应用已删除');
            router.push('/admin/applications');
          } else {
            error('删除失败');
          }
        } catch {
          error('删除失败');
        }
      },
    });
  };

  const handleEdit = async () => {
    if (!editForm.name || !editForm.redirectUris) {
      error('请填写必要字段');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/applications/${client.nanoId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          description: editForm.description,
          appUrl: editForm.appUrl || null,
          icon: JSON.stringify({ mode: iconMode, url: iconMode === 'custom' ? iconUrl : undefined }),
          redirectUris: editForm.redirectUris.split('\n').map(u => u.trim()).filter(Boolean),
          scopes: editForm.scopes.split(' ').filter(Boolean),
          grants: editForm.grants,
          status: editForm.status,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setClient(data.client);
        setShowEditModal(false);
        success('应用信息已更新');
      } else {
        const data = await res.json().catch(() => ({}));
        error(data.error || '更新失败');
      }
    } catch {
      error('更新失败');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  const getOrigin = () => {
    if (typeof window !== 'undefined') return window.location.origin;
    return 'https://account.example.com';
  };

  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('javascript');

  const integrationExamples = mounted ? {
    javascript: `// 使用授权码流程进行OAuth认证
const clientId = '${client.id}';
const redirectUri = '${client.redirectUris[0] || 'http://localhost:3000/callback'}';

// 重定向用户到授权页面
function authorize() {
  const authUrl = '${getOrigin()}/oauth/authorize';
  const url = \`\${authUrl}?client_id=\${clientId}&redirect_uri=\${encodeURIComponent(redirectUri)}&response_type=code&scope=profile email\`;
  window.location.href = url;
}

// 在回调页面处理授权码
async function handleCallback() {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');

  if (code) {
    const tokenUrl = '${getOrigin()}/oauth/token';
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: '${client.secret}',
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri
      })
    });

    const data = await response.json();

    if (data.access_token) {
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);

      const userInfo = await fetchUserInfo(data.access_token);
      console.log('用户信息:', userInfo);
    }
  }
}

// 获取用户信息
async function fetchUserInfo(accessToken) {
  const response = await fetch('${getOrigin()}/oauth/userinfo', {
    headers: { 'Authorization': \`Bearer \${accessToken}\` }
  });
  return await response.json();
}`,
    php: `<?php
// 使用授权码流程进行OAuth认证
$clientId = '${client.id}';
$clientSecret = '${client.secret}';
$redirectUri = '${client.redirectUris[0] || 'http://localhost:3000/callback'}';

// 重定向用户到授权页面
function redirectToAuth() {
    global $clientId, $redirectUri;
    $authUrl = '${getOrigin()}/oauth/authorize';
    $url = $authUrl . '?client_id=' . $clientId
         . '&redirect_uri=' . urlencode($redirectUri)
         . '&response_type=code&scope=profile email';
    header('Location: ' . $url);
    exit;
}

// 处理授权回调
function handleCallback() {
    global $clientId, $clientSecret, $redirectUri;

    if (isset($_GET['code'])) {
        $code = $_GET['code'];
        $tokenUrl = '${getOrigin()}/oauth/token';

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $tokenUrl);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
            'client_id' => $clientId,
            'client_secret' => $clientSecret,
            'grant_type' => 'authorization_code',
            'code' => $code,
            'redirect_uri' => $redirectUri
        ]));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

        $response = curl_exec($ch);
        curl_close($ch);

        $data = json_decode($response, true);

        if (isset($data['access_token'])) {
            $_SESSION['access_token'] = $data['access_token'];
            $_SESSION['refresh_token'] = $data['refresh_token'];

            $userInfo = getUserInfo($data['access_token']);
            print_r($userInfo);
        }
    }
}

// 获取用户信息
function getUserInfo($accessToken) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, '${getOrigin()}/oauth/userinfo');
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $accessToken
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

    $response = curl_exec($ch);
    curl_close($ch);

    return json_decode($response, true);
}`,
    python: `import requests
from flask import Flask, request, redirect, session
import os

app = Flask(__name__)
app.secret_key = os.urandom(24)

# OAuth配置
client_id = '${client.id}'
client_secret = '${client.secret}'
redirect_uri = '${client.redirectUris[0] || 'http://localhost:3000/callback'}'
auth_url = '${getOrigin()}/oauth/authorize'
token_url = '${getOrigin()}/oauth/token'
userinfo_url = '${getOrigin()}/oauth/userinfo'

@app.route('/login')
def login():
    auth_params = {
        'client_id': client_id,
        'redirect_uri': redirect_uri,
        'response_type': 'code',
        'scope': 'profile email'
    }
    auth_redirect = f"{auth_url}?{'&'.join(f'{k}={v}' for k, v in auth_params.items())}"
    return redirect(auth_redirect)

@app.route('/callback')
def callback():
    code = request.args.get('code')

    if code:
        token_data = {
            'client_id': client_id,
            'client_secret': client_secret,
            'grant_type': 'authorization_code',
            'code': code,
            'redirect_uri': redirect_uri
        }

        token_response = requests.post(token_url, data=token_data)
        token_json = token_response.json()

        if 'access_token' in token_json:
            session['access_token'] = token_json['access_token']
            session['refresh_token'] = token_json['refresh_token']

            user_info = get_user_info(token_json['access_token'])
            return f"{user_info}"

    return "授权失败"

def get_user_info(access_token):
    headers = {'Authorization': f'Bearer {access_token}'}
    response = requests.get(userinfo_url, headers=headers)
    return response.json()

if __name__ == '__main__':
    app.run(debug=True)`,
  } : { javascript: '', php: '', python: '' };

  return (
    <div className="space-y-6">
      {/* Title */}
      <h1 className="text-2xl font-bold text-text-primary">应用详情</h1>

      {/* Header */}
      <div className="bg-card rounded-xl shadow-sm border border-border">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <Link
            href="/admin/applications"
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-text-secondary bg-muted rounded-lg hover:bg-border-strong transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回列表
          </Link>
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-white bg-destructive rounded-lg hover:opacity-90 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            删除应用
          </button>
        </div>

        <div className="p-6">
          {/* App Basic Info */}
          <div className="flex items-center gap-4 mb-6">
            <AppIcon client={client} size="w-20 h-20 text-2xl" />
            <div>
              <h3 className="text-xl font-bold text-text-primary">{client.name}</h3>
              <p className="text-sm text-text-tertiary mt-0.5">{client.description || '无描述'}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  client.status === 'disabled'
                    ? 'bg-destructive text-destructive-foreground'
                    : 'bg-success text-success-foreground'
                }`}>
                  {client.status === 'disabled' ? '禁用' : '活跃'}
                </span>
                <span className="text-xs px-2 py-0.5 bg-info text-info-foreground rounded-full">
                  机密客户端
                </span>
              </div>
            </div>
          </div>

          {/* Detail Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Client ID */}
            <div className="bg-muted/50 rounded-xl p-4">
              <h6 className="text-xs font-medium text-text-tertiary mb-2">客户端ID</h6>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={client.id}
                  readOnly
                  className="flex-1 px-3 py-2 text-sm bg-card border border-border rounded-lg text-text-primary font-mono"
                />
                <CopyButton text={client.id} />
              </div>
            </div>

            {/* Client Secret */}
            <div className="bg-muted/50 rounded-xl p-4">
              <h6 className="text-xs font-medium text-text-tertiary mb-2">客户端密钥</h6>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={client.secret}
                  readOnly
                  className="flex-1 px-3 py-2 text-sm bg-card border border-border rounded-lg text-text-primary font-mono"
                />
                <CopyButton text={client.secret} />
              </div>
              <p className="text-xs text-destructive mt-1.5">请妥善保管，不要泄露给他人</p>
            </div>

            {/* Website */}
            <div className="bg-muted/50 rounded-xl p-4">
              <h6 className="text-xs font-medium text-text-tertiary mb-2">应用网站</h6>
              <p className="text-sm text-text-primary">
                {client.appUrl || client.redirectUris[0] ? (
                  <a
                    href={client.appUrl || client.redirectUris[0]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    {client.appUrl || client.redirectUris[0]}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="text-text-quaternary">未设置</span>
                )}
              </p>
            </div>

            {/* Created At */}
            <div className="bg-muted/50 rounded-xl p-4">
              <h6 className="text-xs font-medium text-text-tertiary mb-2">创建时间</h6>
              <p className="text-sm text-text-primary flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-text-quaternary" />
                {formatDate(client.createdAt)}
              </p>
            </div>
          </div>

          {/* Redirect URIs */}
          <div className="mb-6">
            <h5 className="text-base font-semibold text-text-primary mb-3">重定向URI</h5>
            <ul className="space-y-2">
              {client.redirectUris.map((uri, index) => (
                <li
                  key={index}
                  className="flex items-center justify-between px-4 py-2.5 bg-muted/50 rounded-lg"
                >
                  <span className="text-sm text-text-primary font-mono">{uri}</span>
                  <CopyButton text={uri} />
                </li>
              ))}
            </ul>
          </div>

          {/* Grant Types & Scopes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h5 className="text-base font-semibold text-text-primary mb-3">授权类型</h5>
              <ul className="space-y-2">
                {client.grants.map((grant) => {
                  const info = GRANT_LABELS[grant] || { label: grant, icon: Key };
                  const Icon = info.icon;
                  return (
                    <li
                      key={grant}
                      className="flex items-center gap-3 px-4 py-2.5 bg-muted/50 rounded-lg"
                    >
                      <Icon className="w-4 h-4 text-primary" />
                      <span className="text-sm text-text-primary">{info.label}</span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div>
              <h5 className="text-base font-semibold text-text-primary mb-3">请求权限</h5>
              <ul className="space-y-2">
                {client.scopes.map((scope) => {
                  const info = SCOPE_LABELS[scope] || { label: scope, icon: Shield };
                  const Icon = info.icon;
                  return (
                    <li
                      key={scope}
                      className="flex items-center gap-3 px-4 py-2.5 bg-muted/50 rounded-lg"
                    >
                      <Icon className="w-4 h-4 text-primary" />
                      <span className="text-sm text-text-primary">{info.label}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {/* Edit Button */}
          <button
            onClick={() => {
              const cfg = parseIconConfig(client.icon);
              setEditForm({
                name: client.name,
                description: client.description || '',
                appUrl: client.appUrl || '',
                redirectUris: client.redirectUris.join('\n'),
                scopes: client.scopes.join(' '),
                grants: client.grants,
                status: client.status || 'active',
              });
              setIconMode(cfg.mode);
              setIconUrl(cfg.url || '');
              setShowEditModal(true);
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-accent-button rounded-xl hover:bg-accent-button-hover transition-colors"
          >
            <Edit className="w-4 h-4" />
            编辑应用信息
          </button>
        </div>
      </div>

      {/* OAuth Endpoints */}
      <div className="bg-card rounded-xl shadow-sm border border-border">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text-primary">OAuth端点</h2>
        </div>
        <div className="p-6 space-y-4">
          {OAUTH_ENDPOINTS.map((endpoint) => {
            const url = `${getOrigin()}${endpoint.path}`;
            return (
              <div key={endpoint.path}>
                <h6 className="text-sm font-medium text-text-secondary mb-2">{endpoint.label}</h6>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={url}
                    readOnly
                    className="flex-1 px-3 py-2 text-sm bg-muted border border-border rounded-lg text-text-primary font-mono"
                  />
                  <CopyButton text={url} />
                </div>
                {endpoint.note && (
                  <p className="text-xs text-text-quaternary mt-1.5">{endpoint.note}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Integration Examples */}
      <div className="bg-card rounded-xl shadow-sm border border-border">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text-primary">集成示例</h2>
        </div>
        <div className="p-6">
          {/* Tabs */}
          <div className="flex border-b border-border mb-4">
            {[
              { id: 'javascript', label: 'JavaScript' },
              { id: 'php', label: 'PHP' },
              { id: 'python', label: 'Python' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-tertiary hover:text-text-secondary'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Code */}
          <div className="relative">
            {mounted ? (
              <>
                <pre className="bg-muted/50 rounded-xl p-4 overflow-x-auto">
                  <code className="text-sm text-text-primary font-mono whitespace-pre">
                    {integrationExamples[activeTab as keyof typeof integrationExamples]}
                  </code>
                </pre>
                <div className="absolute top-3 right-3">
                  <CopyButton text={integrationExamples[activeTab as keyof typeof integrationExamples]} />
                </div>
              </>
            ) : (
              <div className="bg-muted/50 rounded-xl p-4 h-48 animate-pulse" />
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="编辑应用信息"
        footer={
          <div className="flex justify-end gap-3 p-4 border-t border-border">
            <button
              onClick={() => setShowEditModal(false)}
              className="px-4 py-2 text-sm text-text-secondary bg-muted rounded-xl hover:bg-border-strong transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleEdit}
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
        <div className="space-y-4 p-4">
          {/* Icon Config */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">应用图标</label>
            <div className="flex items-start gap-4">
              <div className="shrink-0">
                {iconMode === 'custom' && iconUrl ? (
                  <img src={iconUrl} alt="预览" className="w-16 h-16 rounded-xl object-cover bg-muted border border-border" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : iconMode === 'auto' && (editForm.appUrl || editForm.redirectUris.split('\n').filter(Boolean)[0]) ? (
                  <img src={`/api/applications/favicon?domain=${encodeURIComponent(new URL(editForm.appUrl || editForm.redirectUris.split('\n').filter(Boolean)[0]).hostname)}`} alt="预览" className="w-16 h-16 rounded-xl object-cover bg-muted border border-border" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${getAvatarColor(editForm.name || 'A')} flex items-center justify-center text-white text-xl font-bold`}>
                    {(editForm.name || 'A').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-2">
                {[
                  { value: 'default', label: '默认', desc: '使用首字母渐变色' },
                  { value: 'auto', label: '自动抓取', desc: '从应用域名获取 favicon' },
                  { value: 'custom', label: '自定义 URL', desc: '提供图片链接' },
                ].map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="iconMode"
                      checked={iconMode === opt.value}
                      onChange={() => setIconMode(opt.value as any)}
                      className="w-4 h-4 text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-text-primary">{opt.label}</span>
                    <span className="text-xs text-text-quaternary">{opt.desc}</span>
                  </label>
                ))}
                {iconMode === 'custom' && (
                  <input
                    type="text"
                    value={iconUrl}
                    onChange={(e) => setIconUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-border-input rounded-lg bg-card text-text-primary text-sm focus:outline-none focus:border-accent-foreground transition-colors"
                    placeholder="https://example.com/icon.png"
                  />
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">应用名称 *</label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full px-4 py-2.5 border border-border-input rounded-xl bg-card text-text-primary focus:outline-none focus:border-accent-foreground focus:ring-1 focus:ring-accent-foreground transition-colors"
              placeholder="输入应用名称"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">应用描述</label>
            <input
              type="text"
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              className="w-full px-4 py-2.5 border border-border-input rounded-xl bg-card text-text-primary focus:outline-none focus:border-accent-foreground focus:ring-1 focus:ring-accent-foreground transition-colors"
              placeholder="输入应用描述"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">应用网站</label>
            <input
              type="url"
              value={editForm.appUrl}
              onChange={(e) => setEditForm({ ...editForm, appUrl: e.target.value })}
              className="w-full px-4 py-2.5 border border-border-input rounded-xl bg-card text-text-primary focus:outline-none focus:border-accent-foreground focus:ring-1 focus:ring-accent-foreground transition-colors"
              placeholder="https://example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Redirect URIs *（每行一个）</label>
            <textarea
              value={editForm.redirectUris}
              onChange={(e) => setEditForm({ ...editForm, redirectUris: e.target.value })}
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
                    checked={editForm.grants.includes(grant.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setEditForm({ ...editForm, grants: [...editForm.grants, grant.value] });
                      } else {
                        setEditForm({ ...editForm, grants: editForm.grants.filter(g => g !== grant.value) });
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
                    checked={editForm.scopes.split(' ').includes(scope.value)}
                    onChange={(e) => {
                      const current = editForm.scopes.split(' ').filter(Boolean);
                      if (e.target.checked) {
                        setEditForm({ ...editForm, scopes: [...current, scope.value].join(' ') });
                      } else {
                        setEditForm({ ...editForm, scopes: current.filter(s => s !== scope.value).join(' ') });
                      }
                    }}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-text-primary">{scope.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">应用状态</label>
            <button
              type="button"
              onClick={() => setEditForm({ ...editForm, status: editForm.status === 'active' ? 'disabled' : 'active' })}
              className="flex items-center gap-3"
            >
              <div
                className="relative w-11 h-6 rounded-full transition-colors"
                style={{ backgroundColor: editForm.status === 'active' ? '#30a46c' : '#e5e5e5' }}
              >
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                  editForm.status === 'active' ? 'left-[22px]' : 'left-0.5'
                }`} />
              </div>
              <span className="text-sm text-text-primary">
                {editForm.status === 'active' ? '活跃' : '禁用'}
              </span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
