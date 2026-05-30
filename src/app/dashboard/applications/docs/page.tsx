'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Globe,
  Key,
  RefreshCw,
  Shield,
  Code,
  BookOpen,
  Lock,
  CheckCircle,
  AlertTriangle,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import { BRAND_NAME } from '@/lib/constants';

const SECTIONS = [
  'overview',
  'endpoints',
  'flow',
  'scopes',
  'code',
  'tokens',
  'security',
] as const;

type Section = (typeof SECTIONS)[number];

export default function DocsPage() {
  const t = useTranslations('dashboard.docs');
  const { success } = useToast();
  const [activeSection, setActiveSection] = useState<Section>('overview');
  const [activeLang, setActiveLang] = useState<'javascript' | 'php' | 'python' | 'curl'>('javascript');

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://account.example.com';

  const copyText = async (text: string) => {
    await navigator.clipboard.writeText(text);
    success('Copied');
  };

  const EndpointRow = ({ path, label, desc }: { path: string; label: string; desc: string }) => (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-3 border-b border-border last:border-0">
      <div className="sm:w-2/5">
        <p className="text-sm font-medium text-text-primary">{label}</p>
        <code className="text-xs text-primary bg-primary/5 px-1.5 py-0.5 rounded font-mono break-all">{`${origin}${path}`}</code>
      </div>
      <p className="text-sm text-text-secondary sm:w-3/5">{desc}</p>
    </div>
  );

  const codeSamples = {
    javascript: `// 1. 引导用户跳转到授权页面
const clientId = 'YOUR_CLIENT_ID';
const redirectUri = 'https://your-app.com/callback';
const scope = 'openid profile email';

const authUrl = '${origin}/oauth/authorize'
  + '?client_id=' + encodeURIComponent(clientId)
  + '&redirect_uri=' + encodeURIComponent(redirectUri)
  + '&response_type=code'
  + '&scope=' + encodeURIComponent(scope);

window.location.href = authUrl;

// 2. 在回调页面处理授权码
const params = new URLSearchParams(window.location.search);
const code = params.get('code');

if (code) {
  // 3. 用授权码换取 Token（应在后端完成）
  const tokenRes = await fetch('${origin}/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: 'YOUR_CLIENT_SECRET',
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri,
    }),
  });
  const tokens = await tokenRes.json();

  // 4. 使用 Access Token 获取用户信息
  const userRes = await fetch('${origin}/oauth/userinfo', {
    headers: { Authorization: 'Bearer ' + tokens.access_token },
  });
  const user = await userRes.json();
  console.log(user);
}`,
    php: `<?php
$clientId     = 'YOUR_CLIENT_ID';
$clientSecret = 'YOUR_CLIENT_SECRET';
$redirectUri  = 'https://your-app.com/callback';

// 1. 引导用户跳转到授权页面
$authUrl = '${origin}/oauth/authorize'
  . '?client_id=' . urlencode($clientId)
  . '&redirect_uri=' . urlencode($redirectUri)
  . '&response_type=code'
  . '&scope=openid profile email';

header('Location: ' . $authUrl);
exit;

// 2. 在回调页面处理授权码（callback.php）
if (isset($_GET['code'])) {
  $code = $_GET['code'];

  // 3. 用授权码换取 Token
  $ch = curl_init('${origin}/oauth/token');
  curl_setopt($ch, CURLOPT_POST, true);
  curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
    'client_id'     => $clientId,
    'client_secret' => $clientSecret,
    'grant_type'    => 'authorization_code',
    'code'          => $code,
    'redirect_uri'  => $redirectUri,
  ]));
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  $tokens = json_decode(curl_exec($ch), true);
  curl_close($ch);

  // 4. 使用 Access Token 获取用户信息
  $ch = curl_init('${origin}/oauth/userinfo');
  curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . $tokens['access_token'],
  ]);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  $user = json_decode(curl_exec($ch), true);
  curl_close($ch);

  print_r($user);
}`,
    python: `import requests
from urllib.parse import urlencode

client_id     = 'YOUR_CLIENT_ID'
client_secret = 'YOUR_CLIENT_SECRET'
redirect_uri  = 'https://your-app.com/callback'
base_url      = '${origin}'

# 1. 引导用户跳转到授权页面
auth_params = {
    'client_id': client_id,
    'redirect_uri': redirect_uri,
    'response_type': 'code',
    'scope': 'openid profile email',
}
auth_url = f"{base_url}/oauth/authorize?{urlencode(auth_params)}"
# return redirect(auth_url)

# 2. 在回调页面处理授权码
code = 'AUTHORIZATION_CODE_FROM_CALLBACK'

# 3. 用授权码换取 Token
token_res = requests.post(f"{base_url}/oauth/token", data={
    'client_id': client_id,
    'client_secret': client_secret,
    'grant_type': 'authorization_code',
    'code': code,
    'redirect_uri': redirect_uri,
})
tokens = token_res.json()

# 4. 使用 Access Token 获取用户信息
user_res = requests.get(f"{base_url}/oauth/userinfo", headers={
    'Authorization': f"Bearer {tokens['access_token']}",
})
user = user_res.json()
print(user)`,
    curl: `# 1. 在浏览器中打开授权链接（替换 YOUR_CLIENT_ID 和 redirect_uri）
# ${origin}/oauth/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=https%3A%2F%2Fyour-app.com%2Fcallback&response_type=code&scope=openid%20profile%20email

# 2. 用户授权后，浏览器会跳转到您的 redirect_uri 并携带 code 参数
# 例如：https://your-app.com/callback?code=abc123

# 3. 用授权码换取 Token
curl -X POST '${origin}/oauth/token' \\
  -H 'Content-Type: application/x-www-form-urlencoded' \\
  -d 'client_id=YOUR_CLIENT_ID' \\
  -d 'client_secret=YOUR_CLIENT_SECRET' \\
  -d 'grant_type=authorization_code' \\
  -d 'code=abc123' \\
  -d 'redirect_uri=https://your-app.com/callback'

# 返回示例：
# {
#   "access_token": "eyJhbGciOiJIUzI1NiIs...",
#   "token_type": "Bearer",
#   "expires_in": 3600,
#   "refresh_token": "dGhpcyBpcyBhIHJlZnJl...",
#   "scope": "openid profile email"
# }

# 4. 使用 Access Token 获取用户信息
curl '${origin}/oauth/userinfo' \\
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIs...'`,
  };

  const navItems: { key: Section; icon: typeof BookOpen }[] = [
    { key: 'overview', icon: BookOpen },
    { key: 'endpoints', icon: Globe },
    { key: 'flow', icon: RefreshCw },
    { key: 'scopes', icon: Key },
    { key: 'code', icon: Code },
    { key: 'tokens', icon: Lock },
    { key: 'security', icon: Shield },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">{t('title')}</h1>
        <p className="text-text-secondary mt-1">{t('subtitle')}</p>
      </div>

      {/* Navigation */}
      <nav className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
        {navItems.map(({ key, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveSection(key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
              activeSection === key
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-text-secondary hover:bg-muted hover:text-text-primary'
            }`}
          >
            <Icon className="w-4 h-4" />
            {t(`nav${key.charAt(0).toUpperCase() + key.slice(1)}`)}
          </button>
        ))}
      </nav>

      {/* Content */}
      <div className="bg-card rounded-xl shadow-sm border border-border">
        <div className="p-4 sm:p-6 lg:p-8">

          {/* Overview */}
          {activeSection === 'overview' && (
            <div className="prose-custom space-y-4">
              <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                {t('overviewTitle')}
              </h2>
              <p className="text-text-secondary leading-relaxed">{t('overviewP1')}</p>
              <p className="text-text-secondary leading-relaxed">{t('overviewP2')}</p>
              <div className="bg-primary/5 border border-primary/10 rounded-lg p-4 mt-4">
                <p className="text-sm text-primary font-medium">{BRAND_NAME} OAuth 2.0 / OIDC</p>
                <p className="text-sm text-text-secondary mt-1">
                  支持 Authorization Code、Client Credentials、Refresh Token 授权类型，兼容 OpenID Connect 1.0 规范。
                </p>
              </div>
            </div>
          )}

          {/* Endpoints */}
          {activeSection === 'endpoints' && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                {t('endpointsTitle')}
              </h2>
              <p className="text-text-secondary">{t('endpointsDesc')}</p>
              <div className="mt-4">
                <EndpointRow path="/oauth/authorize" label={t('endpointAuthorize')} desc={t('endpointAuthorizeDesc')} />
                <EndpointRow path="/oauth/token" label={t('endpointToken')} desc={t('endpointTokenDesc')} />
                <EndpointRow path="/oauth/userinfo" label={t('endpointUserinfo')} desc={t('endpointUserinfoDesc')} />
                <EndpointRow path="/oauth/revoke" label={t('endpointRevoke')} desc={t('endpointRevokeDesc')} />
                <EndpointRow path="/oauth/.well-known/openid-configuration" label={t('endpointOpenIdConfig')} desc={t('endpointOpenIdConfigDesc')} />
                <EndpointRow path="/oauth/.well-known/jwks.json" label={t('endpointJwks')} desc={t('endpointJwksDesc')} />
              </div>
            </div>
          )}

          {/* Authorization Code Flow */}
          {activeSection === 'flow' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-primary" />
                {t('flowTitle')}
              </h2>
              <p className="text-text-secondary">{t('flowDesc')}</p>

              {[
                { num: '1', title: t('flowStep1Title'), desc: t('flowStep1Desc'), icon: ExternalLink },
                { num: '2', title: t('flowStep2Title'), desc: t('flowStep2Desc'), icon: CheckCircle },
                { num: '3', title: t('flowStep3Title'), desc: t('flowStep3Desc'), icon: Key },
                { num: '4', title: t('flowStep4Title'), desc: t('flowStep4Desc'), icon: Lock },
                { num: '5', title: t('flowStep5Title'), desc: t('flowStep5Desc'), icon: RefreshCw },
              ].map(({ num, title, desc, icon: Icon }) => (
                <div key={num} className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                    {num}
                  </div>
                  <div>
                    <h3 className="text-base font-medium text-text-primary flex items-center gap-2">
                      <Icon className="w-4 h-4 text-primary" />
                      {title}
                    </h3>
                    <p className="text-sm text-text-secondary mt-1 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}

              <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-4 flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-text-secondary">{t('flowNote')}</p>
              </div>
            </div>
          )}

          {/* Scopes */}
          {activeSection === 'scopes' && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
                <Key className="w-5 h-5 text-primary" />
                {t('scopesTitle')}
              </h2>
              <p className="text-text-secondary">{t('scopesDesc')}</p>

              <div className="mt-4 space-y-3">
                {[
                  { scope: 'openid', desc: t('scopeOpenidDesc'), required: true },
                  { scope: 'profile', desc: t('scopeProfileDesc'), required: false },
                  { scope: 'email', desc: t('scopeEmailDesc'), required: false },
                ].map(({ scope, desc, required }) => (
                  <div key={scope} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <code className="text-sm font-mono bg-card px-2 py-0.5 rounded text-primary border border-border flex-shrink-0">
                      {scope}
                    </code>
                    <div>
                      <p className="text-sm text-text-secondary">{desc}</p>
                      {required && (
                        <span className="text-xs text-amber-500 font-medium mt-1 inline-block">Required</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-sm text-text-tertiary mt-2">{t('scopesDefault')}</p>
            </div>
          )}

          {/* Code Samples */}
          {activeSection === 'code' && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
                <Code className="w-5 h-5 text-primary" />
                {t('codeTitle')}
              </h2>
              <p className="text-text-secondary">{t('codeDesc')}</p>

              {/* Language tabs */}
              <div className="flex gap-1 border-b border-border">
                {(['javascript', 'php', 'python', 'curl'] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setActiveLang(lang)}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                      activeLang === lang
                        ? 'border-primary text-primary'
                        : 'border-transparent text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {t(`code${lang.charAt(0).toUpperCase() + lang.slice(1)}`)}
                  </button>
                ))}
              </div>

              {/* Code block */}
              <div className="relative">
                <button
                  onClick={() => copyText(codeSamples[activeLang])}
                  className="absolute top-3 right-3 p-2 rounded-lg bg-muted hover:bg-muted/80 text-text-secondary hover:text-text-primary transition-colors z-10"
                  title="Copy"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <pre className="bg-muted/50 rounded-lg p-4 overflow-x-auto text-sm leading-relaxed">
                  <code className="text-text-secondary font-mono whitespace-pre">{codeSamples[activeLang]}</code>
                </pre>
              </div>
            </div>
          )}

          {/* Tokens */}
          {activeSection === 'tokens' && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" />
                {t('tokensTitle')}
              </h2>
              <p className="text-text-secondary">{t('tokensDesc')}</p>

              <div className="space-y-3 mt-4">
                {[
                  { title: t('tokenAccess'), desc: t('tokenAccessDesc'), color: 'text-emerald-500', bg: 'bg-emerald-500/5 border-emerald-500/10' },
                  { title: t('tokenRefresh'), desc: t('tokenRefreshDesc'), color: 'text-blue-500', bg: 'bg-blue-500/5 border-blue-500/10' },
                  { title: t('tokenId'), desc: t('tokenIdDesc'), color: 'text-violet-500', bg: 'bg-violet-500/5 border-violet-500/10' },
                ].map(({ title, desc, color, bg }) => (
                  <div key={title} className={`rounded-lg border p-4 ${bg}`}>
                    <h3 className={`text-sm font-semibold ${color}`}>{title}</h3>
                    <p className="text-sm text-text-secondary mt-1 leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>

              <div className="bg-muted/50 rounded-lg p-4 mt-2">
                <p className="text-sm text-text-secondary font-mono">{t('tokenTypeInfo')}</p>
              </div>
            </div>
          )}

          {/* Security */}
          {activeSection === 'security' && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                {t('securityTitle')}
              </h2>
              <p className="text-text-secondary">{t('securityDesc')}</p>

              <div className="space-y-3 mt-4">
                {[
                  { title: t('securitySecretTitle'), desc: t('securitySecretDesc') },
                  { title: t('securityHttpsTitle'), desc: t('securityHttpsDesc') },
                  { title: t('securityStateTitle'), desc: t('securityStateDesc') },
                  { title: t('securityScopeTitle'), desc: t('securityScopeDesc') },
                  { title: t('securityTokenTitle'), desc: t('securityTokenDesc') },
                  { title: t('securityExpiryTitle'), desc: t('securityExpiryDesc') },
                ].map(({ title, desc }) => (
                  <div key={title} className="flex gap-3 p-3 rounded-lg bg-muted/50">
                    <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-medium text-text-primary">{title}</h3>
                      <p className="text-sm text-text-secondary mt-1 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
