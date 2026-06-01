'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/components/ConfirmProvider';
import { AppIcon, getAvatarColor } from '@/components/AppIcon';
import { JSON_HEADERS } from '@/lib/constants';
import Modal from '@/components/Modal';
import { getErrorMessage } from '@/lib/api-error';
import { Spinner } from '@/components/Spinner';
import {
  ArrowLeft,
  Trash2,
  Edit,
  Copy,
  Key,
  Lock,
  RefreshCw,
  User,
  Users,
  Mail,
  Fingerprint,
  ExternalLink,
  Clock,
  Shield,
  Calendar,
  Search,
} from 'lucide-react';

import type { OAuth2Client } from '@/types';

interface ApplicationDetailProps {
  client: OAuth2Client;
  apiPrefix?: string;
  backHref?: string;
  appUrl: string;
}

function getGrantLabels(t: (key: string) => string): Record<string, { label: string; icon: typeof Key }> {
  return {
    authorization_code: { label: t('grantAuthorizationCode'), icon: Key },
    client_credentials: { label: t('grantClientCredentials'), icon: Lock },
    refresh_token: { label: t('grantRefreshToken'), icon: RefreshCw },
  };
}

function getScopeLabels(t: (key: string) => string): Record<string, { label: string; icon: typeof User }> {
  return {
    profile: { label: t('scopeProfile'), icon: User },
    email: { label: t('scopeEmail'), icon: Mail },
    openid: { label: t('scopeOpenid'), icon: Fingerprint },
  };
}

function getOAuthEndpoints(t: (key: string) => string) {
  return [
    { label: t('endpointAuthorize'), path: '/oauth/authorize' },
    { label: t('endpointToken'), path: '/oauth/token' },
    { label: t('endpointUserinfo'), path: '/oauth/userinfo' },
    { label: t('endpointOpenIdConfig'), path: '/oauth/.well-known/openid-configuration' },
    { label: t('endpointJwks'), path: '/oauth/.well-known/jwks.json', note: t('endpointJwksNote') },
  ];
}

function CopyButton({ text }: { text: string }) {
  const t = useTranslations('admin.applications');
  const { success } = useToast();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    success(t('copied'));
  };

  return (
    <button
      onClick={handleCopy}
      className="p-2 rounded-lg border border-border hover:bg-muted transition-colors"
      title={t('copySecret')}
    >
      <Copy className="w-4 h-4 text-text-tertiary" />
    </button>
  );
}

export default function ApplicationDetail({ client: initialClient, apiPrefix = '/api/admin/applications', backHref = '/admin/applications', appUrl }: ApplicationDetailProps) {
  const t = useTranslations('admin.applications');
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
  // iconMode: default=默认, custom=自定义图标
  const [iconMode, setIconMode] = useState<'default' | 'custom'>(
    client.icon && client.icon !== 'default' ? 'custom' : 'default'
  );
  const [iconUrl, setIconUrl] = useState(client.icon || '');
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [activeTab, setActiveTab] = useState('javascript');
  const [showChangeIdModal, setShowChangeIdModal] = useState(false);
  const [newClientId, setNewClientId] = useState('');
  const [changingId, setChangingId] = useState(false);
  const [showChangeSecretModal, setShowChangeSecretModal] = useState(false);
  const [newSecret, setNewSecret] = useState('');
  const [changingSecret, setChangingSecret] = useState(false);

  // View toggle: details vs authorized users
  const [activeView, setActiveView] = useState<'details' | 'users'>('details');
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');
  const [authorizedUsers, setAuthorizedUsers] = useState<Array<{
    userId: string;
    username: string;
    nickname: string;
    avatar: string | null;
    scopes: string[];
    consentedAt: string;
  }>>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');

  const fetchAuthorizedUsers = useCallback(async () => {
    if (usersLoaded) return;
    setLoadingUsers(true);
    try {
      const res = await fetch(`${apiPrefix}/${client.nanoId}/consents`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setAuthorizedUsers(data.users || []);
        setUsersLoaded(true);
      }
    } catch {
      // ignore
    } finally {
      setLoadingUsers(false);
    }
  }, [apiPrefix, client.nanoId, usersLoaded]);

  useEffect(() => {
    if (activeView === 'users') {
      fetchAuthorizedUsers();
    }
  }, [activeView, fetchAuthorizedUsers]);

  const handleRevokeUser = (userId: string, nickname: string) => {
    confirm(t('revokeAccessConfirm'), {
      confirmText: t('revokeAccess'),
      confirmColor: 'red',
      onConfirm: async () => {
        try {
          const res = await fetch(`${apiPrefix}/${client.nanoId}/consents?userId=${userId}`, {
            method: 'DELETE',
            credentials: 'include',
          });
          if (res.ok) {
            setAuthorizedUsers((prev) => prev.filter((u) => u.userId !== userId));
            success(t('revokeAccessSuccess'));
          } else {
            error(t('revokeAccessFailed'));
          }
        } catch {
          error(t('revokeAccessFailed'));
        }
      },
    });
  };

  const handleRevokeAll = () => {
    confirm(t('revokeAllConfirm'), {
      confirmText: t('revokeAll'),
      confirmColor: 'red',
      onConfirm: async () => {
        try {
          const results = await Promise.all(
            authorizedUsers.map((u) =>
              fetch(`${apiPrefix}/${client.nanoId}/consents?userId=${u.userId}`, {
                method: 'DELETE',
                credentials: 'include',
              })
            )
          );
          if (results.every((r) => r.ok)) {
            setAuthorizedUsers([]);
            success(t('revokeAllSuccess'));
          } else {
            error(t('revokeAllFailed'));
          }
        } catch {
          error(t('revokeAllFailed'));
        }
      },
    });
  };

  const handleDelete = () => {
    confirm(t('deleteConfirm', { name: client.name }), {
      confirmText: t('deleteApp'),
      confirmColor: 'red',
      onConfirm: async () => {
        try {
          const res = await fetch(`${apiPrefix}/${client.nanoId}`, { method: 'DELETE', credentials: 'include' });
          if (res.ok) {
            success(t('appDeleted'));
            router.push(backHref);
          } else {
            error(t('deleteFailed'));
          }
        } catch {
          error(t('deleteFailed'));
        }
      },
    });
  };

  const handleEdit = async () => {
    if (!editForm.name || !editForm.redirectUris) {
      error(t('requiredFields'));
      return;
    }

    setSaving(true);

    // 根据 iconMode 生成 icon 值
    let iconValue = 'default';
    if (iconMode === 'custom' && iconUrl) {
      iconValue = iconUrl;
    }

    try {
      const res = await fetch(`${apiPrefix}/${client.nanoId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: JSON_HEADERS,
        body: JSON.stringify({
          name: editForm.name,
          description: editForm.description,
          appUrl: editForm.appUrl || null,
          icon: iconValue,
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
        success(t('appUpdated'));
      } else {
        const data = await res.json().catch(() => ({}));
        error(getErrorMessage(data, t('updateFailed')));
      }
    } catch {
      error(t('updateFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleChangeClientId = async () => {
    if (!newClientId || newClientId.length < 3 || newClientId.length > 255) {
      error(t('clientIdInvalid'));
      return;
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(newClientId)) {
      error(t('clientIdInvalid'));
      return;
    }
    if (newClientId === client.clientId) {
      error(t('clientIdSameAsCurrent'));
      return;
    }

    setChangingId(true);
    try {
      const res = await fetch(`${apiPrefix}/${client.nanoId}/client-id`, {
        method: 'PUT',
        credentials: 'include',
        headers: JSON_HEADERS,
        body: JSON.stringify({ newClientId }),
      });

      if (res.ok) {
        const data = await res.json();
        setClient(data.client);
        setShowChangeIdModal(false);
        success(t('clientIdChanged'));
      } else {
        const data = await res.json().catch(() => ({}));
        if (data.error === 'APP_CLIENT_ID_DUPLICATE') {
          error(t('clientIdDuplicate'));
        } else {
          error(getErrorMessage(data, t('clientIdChangeFailed')));
        }
      }
    } catch {
      error(t('clientIdChangeFailed'));
    } finally {
      setChangingId(false);
    }
  };

  const handleChangeSecret = async () => {
    if (!newSecret || newSecret.length < 16 || newSecret.length > 128) {
      error(t('secretInvalid'));
      return;
    }

    setChangingSecret(true);
    try {
      const res = await fetch(`${apiPrefix}/${client.nanoId}/secret`, {
        method: 'PUT',
        credentials: 'include',
        headers: JSON_HEADERS,
        body: JSON.stringify({ newSecret }),
      });

      if (res.ok) {
        const data = await res.json();
        setClient(data.client);
        setShowChangeSecretModal(false);
        success(t('secretChanged'));
      } else {
        const data = await res.json().catch(() => ({}));
        error(getErrorMessage(data, t('secretChangeFailed')));
      }
    } catch {
      error(t('secretChangeFailed'));
    } finally {
      setChangingSecret(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  const origin = appUrl;

  const integrationExamples = {
    javascript: `// 使用授权码流程进行OAuth认证
const clientId = '${client.clientId}';
const redirectUri = '${client.redirectUris[0] || 'http://localhost:3000/callback'}';

// 重定向用户到授权页面
function authorize() {
  const authUrl = '${origin}/oauth/authorize';
  const url = \`\${authUrl}?client_id=\${clientId}&redirect_uri=\${encodeURIComponent(redirectUri)}&response_type=code&scope=profile email\`;
  window.location.href = url;
}

// 在回调页面处理授权码
async function handleCallback() {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');

  if (code) {
    const tokenUrl = '${origin}/oauth/token';
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
  const response = await fetch('${origin}/oauth/userinfo', {
    headers: { 'Authorization': \`Bearer \${accessToken}\` }
  });
  return await response.json();
}`,
    php: `<?php
// 使用授权码流程进行OAuth认证
$clientId = '${client.clientId}';
$clientSecret = '${client.secret}';
$redirectUri = '${client.redirectUris[0] || 'http://localhost:3000/callback'}';

// 重定向用户到授权页面
function redirectToAuth() {
    global $clientId, $redirectUri;
    $authUrl = '${origin}/oauth/authorize';
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
        $tokenUrl = '${origin}/oauth/token';

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
    curl_setopt($ch, CURLOPT_URL, '${origin}/oauth/userinfo');
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
client_id = '${client.clientId}'
client_secret = '${client.secret}'
redirect_uri = '${client.redirectUris[0] || 'http://localhost:3000/callback'}'
auth_url = '${origin}/oauth/authorize'
token_url = '${origin}/oauth/token'
userinfo_url = '${origin}/oauth/userinfo'

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
  };

  const filteredUsers = userSearchQuery.trim()
    ? authorizedUsers.filter((u) => {
        const q = userSearchQuery.toLowerCase();
        return (
          u.nickname.toLowerCase().includes(q) ||
          u.username.toLowerCase().includes(q) ||
          u.scopes.some((s) => s.toLowerCase().includes(q))
        );
      })
    : authorizedUsers;

  return (
    <div className="space-y-6">
      {/* Title with view toggle */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-text-primary">{t('appDetail')}</h1>
        <div className="flex gap-1 p-1.5 bg-gray-100 dark:bg-gray-800/80 rounded-xl overflow-x-auto shrink-0">
          {([
            { key: 'details' as const, label: t('details') },
            { key: 'users' as const, label: t('authorizedUsers') },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setSlideDirection(tab.key === 'users' ? 'right' : 'left');
                setActiveView(tab.key);
              }}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap ${
                activeView === tab.key
                  ? 'bg-card text-text-primary shadow-sm'
                  : 'text-text-tertiary hover:text-text-secondary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Views Container */}
      <div className="relative overflow-hidden">
      {/* Details View */}
      <div className={`space-y-6 transition-all duration-300 ease-out ${activeView === 'details' ? 'opacity-100 translate-x-0' : slideDirection === 'left' ? 'opacity-0 -translate-x-6 absolute inset-0 pointer-events-none' : 'opacity-0 translate-x-6 absolute inset-0 pointer-events-none'}`}>
      {/* Header */}
      <div className="bg-card rounded-xl shadow-sm border border-border">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border">
          <Link
            href={backHref}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-text-secondary bg-muted rounded-lg hover:bg-border-strong transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">{t('backToList')}</span>
          </Link>
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-white bg-destructive rounded-lg hover:opacity-90 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">{t('deleteApp')}</span>
          </button>
        </div>

        <div className="p-4 sm:p-6">
          {/* App Basic Info */}
          <div className="flex items-start sm:items-center gap-4 mb-6">
            <AppIcon name={client.name} icon={client.icon} className="w-14 h-14 sm:w-20 sm:h-20 text-xl sm:text-2xl" />
            <div className="min-w-0 flex-1">
              <h3 className="text-lg sm:text-xl font-bold text-text-primary truncate">{client.name}</h3>
              <p className="text-sm text-text-tertiary mt-0.5 line-clamp-2">{client.description || t('noDescription')}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  client.status === 'disabled'
                    ? 'bg-destructive text-destructive-foreground'
                    : 'bg-success text-success-foreground'
                }`}>
                  {client.status === 'disabled' ? t('disabled') : t('active')}
                </span>
                <span className="text-xs px-2 py-0.5 bg-info text-info-foreground rounded-full">
                  {t('confidentialClient')}
                </span>
              </div>
            </div>
          </div>

          {/* Detail Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6">
            {/* Client ID */}
            <div className="bg-muted/50 rounded-xl p-4">
              <h6 className="text-xs font-medium text-text-tertiary mb-2">{t('clientId')}</h6>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={client.clientId}
                  readOnly
                  className="flex-1 px-3 py-2 text-sm bg-card border border-border rounded-lg text-text-primary font-mono"
                />
                <CopyButton text={client.clientId} />
                {apiPrefix.includes('admin') && (
                  <button
                    onClick={() => { setNewClientId(''); setShowChangeIdModal(true); }}
                    className="p-2 rounded-lg border border-border hover:bg-muted transition-colors"
                    title={t('changeClientId')}
                  >
                    <Edit className="w-4 h-4 text-text-tertiary" />
                  </button>
                )}
              </div>
            </div>

            {/* Client Secret */}
            <div className="bg-muted/50 rounded-xl p-4">
              <h6 className="text-xs font-medium text-text-tertiary mb-2">{t('appSecret')}</h6>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={client.secret}
                  readOnly
                  className="flex-1 px-3 py-2 text-sm bg-card border border-border rounded-lg text-text-primary font-mono"
                />
                <CopyButton text={client.secret} />
                {apiPrefix.includes('admin') && (
                  <button
                    onClick={() => { setNewSecret(''); setShowChangeSecretModal(true); }}
                    className="p-2 rounded-lg border border-border hover:bg-muted transition-colors"
                    title={t('changeSecret')}
                  >
                    <Edit className="w-4 h-4 text-text-tertiary" />
                  </button>
                )}
              </div>
              <p className="text-xs text-destructive mt-1.5">{t('secretWarning')}</p>
            </div>

            {/* Website */}
            <div className="bg-muted/50 rounded-xl p-4">
              <h6 className="text-xs font-medium text-text-tertiary mb-2">{t('appWebsite')}</h6>
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
                  <span className="text-text-quaternary">{t('notSet')}</span>
                )}
              </p>
            </div>

            {/* Created At */}
            <div className="bg-muted/50 rounded-xl p-4">
              <h6 className="text-xs font-medium text-text-tertiary mb-2">{t('createdAt')}</h6>
              <p className="text-sm text-text-primary flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-text-quaternary" />
                {formatDate(client.createdAt)}
              </p>
            </div>
          </div>

          {/* Redirect URIs */}
          <div className="mb-6">
            <h5 className="text-base font-semibold text-text-primary mb-3">{t('redirectUri')}</h5>
            <ul className="space-y-2">
              {client.redirectUris.map((uri, index) => (
                <li
                  key={index}
                  className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5 bg-muted/50 rounded-lg"
                >
                  <span className="text-sm text-text-primary font-mono truncate">{uri}</span>
                  <CopyButton text={uri} />
                </li>
              ))}
            </ul>
          </div>

          {/* Grant Types & Scopes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
            <div>
              <h5 className="text-base font-semibold text-text-primary mb-3">{t('grantTypes')}</h5>
              <ul className="space-y-2">
                {client.grants.map((grant) => {
                  const grantLabels = getGrantLabels(t);
                  const info = grantLabels[grant] || { label: grant, icon: Key };
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
              <h5 className="text-base font-semibold text-text-primary mb-3">{t('scopes')}</h5>
              <ul className="space-y-2">
                {client.scopes.map((scope) => {
                  const scopeLabels = getScopeLabels(t);
                  const info = scopeLabels[scope] || { label: scope, icon: Shield };
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
              setEditForm({
                name: client.name,
                description: client.description || '',
                appUrl: client.appUrl || '',
                redirectUris: client.redirectUris.join('\n'),
                scopes: client.scopes.join(' '),
                grants: client.grants,
                status: client.status || 'active',
              });
              // 根据 icon 值设置 iconMode
              if (client.icon && client.icon !== 'default') {
                setIconMode('custom');
                setIconUrl(client.icon);
              } else {
                setIconMode('default');
                setIconUrl('');
              }
              setShowEditModal(true);
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-accent-button rounded-xl hover:bg-accent-button-hover transition-colors"
          >
            <Edit className="w-4 h-4" />
            {t('editApp')}
          </button>
        </div>
      </div>

      {/* OAuth Endpoints */}
      <div className="bg-card rounded-xl shadow-sm border border-border">
        <div className="px-4 sm:px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text-primary">{t('oauthEndpoints')}</h2>
        </div>
        <div className="p-4 sm:p-6 space-y-4">
          {getOAuthEndpoints(t).map((endpoint) => {
            const url = `${origin}${endpoint.path}`;
            return (
              <div key={endpoint.path}>
                <h6 className="text-sm font-medium text-text-secondary mb-2">{endpoint.label}</h6>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={url}
                    readOnly
                    className="flex-1 min-w-0 px-3 py-2 text-sm bg-muted border border-border rounded-lg text-text-primary font-mono"
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
        <div className="px-4 sm:px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text-primary">{t('integrationExamples')}</h2>
        </div>
        <div className="p-4 sm:p-6">
          {/* Tabs */}
          <div className="flex overflow-x-auto border-b border-border mb-4">
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
            <>
              <pre className="bg-muted/50 rounded-xl p-3 sm:p-4 overflow-x-auto">
                <code className="text-xs sm:text-sm text-text-primary font-mono whitespace-pre">
                  {integrationExamples[activeTab as keyof typeof integrationExamples]}
                </code>
              </pre>
              <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
                <CopyButton text={integrationExamples[activeTab as keyof typeof integrationExamples]} />
              </div>
            </>
          </div>
        </div>
      </div>
      </div>

      {/* Authorized Users View */}
      <div className={`transition-all duration-300 ease-out ${activeView === 'users' ? 'opacity-100 translate-x-0' : slideDirection === 'right' ? 'opacity-0 translate-x-6 absolute inset-0 pointer-events-none' : 'opacity-0 -translate-x-6 absolute inset-0 pointer-events-none'}`}>
        <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2 px-3 py-1.5 text-sm text-text-secondary bg-muted rounded-lg">
              <Users className="w-4 h-4" />
              <span>
                {loadingUsers ? '...' : t('authorizedUserCount', { count: authorizedUsers.length })}
              </span>
            </div>
            {!loadingUsers && authorizedUsers.length > 0 && (
              <button
                onClick={handleRevokeAll}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-white bg-destructive rounded-lg hover:opacity-90 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">{t('revokeAll')}</span>
              </button>
            )}
          </div>

          {/* Search bar */}
          {!loadingUsers && authorizedUsers.length > 0 && (
            <div className="px-4 sm:px-6 pt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-quaternary pointer-events-none" />
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder={t('searchUsers')}
                  className="w-full pl-10 pr-3 py-2 text-sm bg-muted border border-border rounded-lg text-text-primary placeholder:text-text-quaternary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
          )}

          <div className="p-4 sm:p-6">
            {loadingUsers ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse flex items-center gap-4 p-4 rounded-xl">
                    <div className="w-10 h-10 bg-muted rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-1/3" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : authorizedUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Users className="w-8 h-8 text-text-quaternary" />
                </div>
                <p className="text-sm font-medium text-text-tertiary">{t('noAuthorizedUsers')}</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Search className="w-8 h-8 text-text-quaternary" />
                </div>
                <p className="text-sm font-medium text-text-tertiary">{t('noSearchResults')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredUsers.map((u) => (
                  <div
                    key={u.userId}
                    className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl hover:bg-muted/50 transition-colors"
                  >
                    {/* Avatar */}
                    {u.avatar ? (
                      <Image
                        src={u.avatar}
                        alt={u.nickname}
                        width={40}
                        height={40}
                        unoptimized
                        className="w-10 h-10 rounded-full object-cover shrink-0 ring-2 ring-background"
                      />
                    ) : (
                      <div
                        className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(u.username)} flex items-center justify-center text-white text-sm font-bold shadow-md shadow-black/10 shrink-0 ring-2 ring-background`}
                      >
                        {u.nickname.charAt(0).toUpperCase()}
                      </div>
                    )}

                    {/* User Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-text-primary truncate">{u.nickname}</span>
                        <span className="text-xs text-text-quaternary font-mono">@{u.username}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        {u.scopes.map((scope) => (
                          <span
                            key={scope}
                            className="text-xs px-2 py-0.5 bg-muted text-text-secondary rounded-md font-medium"
                          >
                            {scope}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5 text-text-quaternary">
                        <Calendar className="w-3 h-3" />
                        <span className="text-xs">
                          {new Date(u.consentedAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Revoke */}
                    <button
                      onClick={() => handleRevokeUser(u.userId, u.nickname)}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-destructive hover:bg-destructive/10 rounded-lg transition-colors shrink-0"
                      title={t('revokeAccess')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{t('revokeAccess')}</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={t('editApp')}
        footer={
          <div className="flex justify-end gap-3 p-4 border-t border-border">
            <button
              onClick={() => setShowEditModal(false)}
              className="px-4 py-2 text-sm text-text-secondary bg-muted rounded-xl hover:bg-border-strong transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleEdit}
              disabled={saving}
              className="px-4 py-2 text-sm text-white bg-accent-button rounded-xl hover:bg-accent-button-hover transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <Spinner className="h-4 w-4" />}
              {saving ? t('saving') : t('save')}
            </button>
          </div>
        }
      >
        <div className="space-y-4 p-4">
          {/* Icon Config */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">{t('icon')}</label>
            <div className="flex items-start gap-4">
              <div className="shrink-0">
                {iconMode === 'custom' && iconUrl ? (
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-muted border border-border">
                    <Image src={iconUrl} alt={t('preview')} fill className="object-cover" unoptimized onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  </div>
                ) : (
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${getAvatarColor(editForm.name || 'A')} flex items-center justify-center text-white text-xl font-bold`}>
                    {(editForm.name || 'A').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-3">
                {/* 默认图标 */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="iconMode"
                    checked={iconMode === 'default'}
                    onChange={() => { setIconMode('default'); setIconUrl(''); }}
                    className="w-4 h-4 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-text-primary">{t('iconDefault')}</span>
                </label>

                {/* 自定义图标 */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="iconMode"
                      checked={iconMode === 'custom'}
                      onChange={() => setIconMode('custom')}
                      className="w-4 h-4 text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-text-primary">{t('iconCustom')}</span>
                  </label>

                  {iconMode === 'custom' && (
                    <div className="ml-6 space-y-2">
                      {/* 自动获取按钮 */}
                      {editForm.appUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            try {
                              const domain = new URL(editForm.appUrl).hostname;
                              const faviconUrl = `/api/applications/favicon?domain=${encodeURIComponent(domain)}`;
                              setIconUrl(faviconUrl);
                              success(t('iconAutoFetched'));
                            } catch {
                              error(t('invalidAppUrl'));
                            }
                          }}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary border border-border-input rounded-lg hover:bg-muted transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          {t('autoFetchIcon')}
                        </button>
                      )}

                      {/* 上传按钮 */}
                      <div className="flex items-center gap-2">
                        <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-border-input rounded-lg cursor-pointer hover:bg-muted transition-colors text-sm text-text-secondary">
                          {uploadingIcon ? (
                            <>
                              <Spinner className="h-4 w-4" />
                              {t('saving')}
                            </>
                          ) : (
                            <>{t('uploadIcon')}</>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setUploadingIcon(true);
                              try {
                                const formData = new FormData();
                                formData.append('icon', file);
                                const res = await fetch(`${apiPrefix}/${client.nanoId}/icon`, {
                                  method: 'POST',
                                  credentials: 'include',
                                  body: formData,
                                });
                                const data = await res.json();
                                if (res.ok) {
                                  setIconUrl(data.iconUrl);
                                  success(t('iconUploadSuccess'));
                                } else {
                                  error(getErrorMessage(data, t('iconUploadFailed')));
                                }
                              } catch {
                                error(t('iconUploadFailed'));
                              } finally {
                                setUploadingIcon(false);
                              }
                            }}
                          />
                        </label>
                        {iconUrl && (
                          <button
                            type="button"
                            onClick={() => setIconUrl('')}
                            className="px-3 py-2 text-sm text-destructive hover:bg-error rounded-lg transition-colors"
                          >
                            {t('clearIcon')}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">{t('appNameLabel')}</label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full px-4 py-2.5 border border-border-input rounded-xl bg-card text-text-primary focus:outline-none focus:border-accent-foreground focus:ring-1 focus:ring-accent-foreground transition-colors"
              placeholder={t('appNamePlaceholder')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">{t('description')}</label>
            <input
              type="text"
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              className="w-full px-4 py-2.5 border border-border-input rounded-xl bg-card text-text-primary focus:outline-none focus:border-accent-foreground focus:ring-1 focus:ring-accent-foreground transition-colors"
              placeholder={t('descriptionPlaceholder')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">{t('appWebsite')}</label>
            <input
              type="url"
              value={editForm.appUrl}
              onChange={(e) => setEditForm({ ...editForm, appUrl: e.target.value })}
              className="w-full px-4 py-2.5 border border-border-input rounded-xl bg-card text-text-primary focus:outline-none focus:border-accent-foreground focus:ring-1 focus:ring-accent-foreground transition-colors"
              placeholder="https://example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">{t('redirectUri')}</label>
            <textarea
              value={editForm.redirectUris}
              onChange={(e) => setEditForm({ ...editForm, redirectUris: e.target.value })}
              className="w-full px-4 py-2.5 border border-border-input rounded-xl bg-card text-text-primary focus:outline-none focus:border-accent-foreground focus:ring-1 focus:ring-accent-foreground transition-colors h-24 resize-none"
              placeholder="https://example.com/callback"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">{t('grantTypes')}</label>
            <div className="space-y-2">
              {[
                { value: 'authorization_code', label: t('grantAuthorizationCode') },
                { value: 'client_credentials', label: t('grantClientCredentials') },
                { value: 'refresh_token', label: t('grantRefreshToken') },
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
            <label className="block text-sm font-medium text-text-secondary mb-1.5">{t('scopes')}</label>
            <div className="space-y-2">
              {[
                { value: 'openid', label: t('scopeOpenid') },
                { value: 'profile', label: t('scopeProfile') },
                { value: 'email', label: t('scopeEmail') },
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
            <label className="block text-sm font-medium text-text-secondary mb-1.5">{t('appStatus')}</label>
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
                {editForm.status === 'active' ? t('active') : t('disabled')}
              </span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Change Client ID Modal */}
      <Modal
        isOpen={showChangeIdModal}
        onClose={() => setShowChangeIdModal(false)}
        title={t('changeClientId')}
        footer={
          <div className="flex justify-end gap-3 p-4 border-t border-border">
            <button
              onClick={() => setShowChangeIdModal(false)}
              className="px-4 py-2 text-sm text-text-secondary bg-muted rounded-xl hover:bg-border-strong transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleChangeClientId}
              disabled={changingId}
              className="px-4 py-2 text-sm text-white bg-destructive rounded-xl hover:opacity-90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {changingId && <Spinner className="h-4 w-4" />}
              {changingId ? t('saving') : t('changeClientId')}
            </button>
          </div>
        }
      >
        <div className="space-y-4 p-4">
          <div className="bg-warning/10 border border-warning/30 rounded-xl p-4">
            <p className="text-sm text-warning-foreground">{t('changeClientIdConfirm')}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">{t('clientId')} (current)</label>
            <input
              type="text"
              value={client.clientId}
              readOnly
              className="w-full px-4 py-2.5 border border-border-input rounded-xl bg-muted text-text-secondary font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">{t('newClientId')}</label>
            <input
              type="text"
              value={newClientId}
              onChange={(e) => setNewClientId(e.target.value)}
              className="w-full px-4 py-2.5 border border-border-input rounded-xl bg-card text-text-primary font-mono focus:outline-none focus:border-accent-foreground focus:ring-1 focus:ring-accent-foreground transition-colors"
              placeholder={t('newClientIdPlaceholder')}
              autoFocus
            />
          </div>
        </div>
      </Modal>

      {/* Change Secret Modal */}
      <Modal
        isOpen={showChangeSecretModal}
        onClose={() => setShowChangeSecretModal(false)}
        title={t('changeSecret')}
        footer={
          <div className="flex justify-end gap-3 p-4 border-t border-border">
            <button
              onClick={() => setShowChangeSecretModal(false)}
              className="px-4 py-2 text-sm text-text-secondary bg-muted rounded-xl hover:bg-border-strong transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleChangeSecret}
              disabled={changingSecret}
              className="px-4 py-2 text-sm text-white bg-destructive rounded-xl hover:opacity-90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {changingSecret && <Spinner className="h-4 w-4" />}
              {changingSecret ? t('saving') : t('changeSecret')}
            </button>
          </div>
        }
      >
        <div className="space-y-4 p-4">
          <div className="bg-warning/10 border border-warning/30 rounded-xl p-4">
            <p className="text-sm text-warning-foreground">{t('changeSecretConfirm')}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">{t('newSecret')}</label>
            <input
              type="text"
              value={newSecret}
              onChange={(e) => setNewSecret(e.target.value)}
              className="w-full px-4 py-2.5 border border-border-input rounded-xl bg-card text-text-primary font-mono focus:outline-none focus:border-accent-foreground focus:ring-1 focus:ring-accent-foreground transition-colors"
              placeholder={t('newSecretPlaceholder')}
              autoFocus
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
