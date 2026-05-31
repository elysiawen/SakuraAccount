'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  BookOpen,
  Rocket,
  Key,
  ArrowRightToLine,
  ShieldCheck,
  Fingerprint,
  FileCode,
  Sliders,
  Globe,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  CopyCheck,
  Zap,
  ExternalLink,
  AlertTriangle,
  Shield,
  Lock,
  RotateCw,
} from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import { getBaseUrl } from '@/lib/utils';

function useScrollReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.unobserve(el);
        }
      },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, visible };
}


const ENDPOINTS = [
  { path: '/oauth/authorize', key: 'epAuthorize', desc: 'epAuthorizeDesc' },
  { path: '/oauth/token', key: 'epToken', desc: 'epTokenDesc' },
  { path: '/oauth/userinfo', key: 'epUserInfo', desc: 'epUserInfoDesc' },
  { path: '/oauth/.well-known/openid-configuration', key: 'epOpenIdConfig', desc: 'epOpenIdConfigDesc' },
  { path: '/oauth/.well-known/jwks.json', key: 'epJwks', desc: 'epJwksDesc' },
  { path: '/oauth/revoke', key: 'epRevoke', desc: 'epRevokeDesc' },
] as const;

const AUTH_PARAMS = [
  { param: 'response_type', type: 'string', required: true, desc: 'responseTypeDesc' },
  { param: 'client_id', type: 'string', required: true, desc: 'clientIdDesc' },
  { param: 'redirect_uri', type: 'string', required: true, desc: 'redirectUriDesc' },
  { param: 'scope', type: 'string', required: true, desc: 'scopeDesc' },
  { param: 'state', type: 'string', required: true, desc: 'stateDesc' },
  { param: 'code_challenge', type: 'string', required: true, desc: 'codeChallengeDesc' },
  { param: 'code_challenge_method', type: 'string', required: true, desc: 'codeChallengeMethodDesc' },
  { param: 'prompt', type: 'string', required: false, desc: 'promptDesc' },
];

type CodeTab = 'nextjs' | 'nodejs' | 'python' | 'go';

const DUMMY_BASE = 'https://account.sakura.example.com';

function getCodeSamples(baseUrl: string): Record<CodeTab, { code: string }> {
  const replace = (s: string) => s.replaceAll(DUMMY_BASE, baseUrl);
  return {
  nextjs: {
    code: replace(`// 1. 生成 PKCE code_verifier & code_challenge
import crypto from 'crypto';

function generateCodeVerifier() {
  return crypto.randomBytes(32).toString('base64url');
}

function generateCodeChallenge(verifier: string) {
  return crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url');
}

// 2. 构建授权 URL 并重定向
const state = crypto.randomBytes(16).toString('hex');
const codeVerifier = generateCodeVerifier();
const codeChallenge = generateCodeChallenge(codeVerifier);

const params = new URLSearchParams({
  response_type: 'code',
  client_id: 'YOUR_CLIENT_ID',
  redirect_uri: 'YOUR_CALLBACK_URL',
  scope: 'openid profile email',
  state,
  code_challenge: codeChallenge,
  code_challenge_method: 'S256',
  prompt: 'consent',
});

const authUrl = \`https://account.sakura.example.com/oauth/authorize?\${params}\`;

// 存储 code_verifier（Session 或临时存储）
// res.redirect(authUrl);

// 3. 回调处理 - 换取 Token
// 在 /api/auth/callback 中:
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const returnedState = searchParams.get('state');

  // 验证 state 防止 CSRF
  if (returnedState !== storedState) throw new Error('Invalid state');

  const res = await fetch('https://account.sakura.example.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code!,
      redirect_uri: 'YOUR_CALLBACK_URL',
      client_id: 'YOUR_CLIENT_ID',
      client_secret: 'YOUR_CLIENT_SECRET',
      code_verifier: codeVerifier,
    }),
  });

  const tokens = await res.json();
  // tokens.access_token, tokens.id_token, tokens.refresh_token

  // 4. 获取用户信息
  const userRes = await fetch('https://account.sakura.example.com/oauth/userinfo', {
    headers: { Authorization: \`Bearer \${tokens.access_token}\` },
  });
  const user = await userRes.json();
  // user.sub, user.name, user.email, user.picture ...
}`,),
  },
  nodejs: {
    code: replace(`const crypto = require('crypto');
const express = require('express');
const app = express();

// 1. PKCE 工具函数
function generateCodeVerifier() {
  return crypto.randomBytes(32).toString('base64url');
}
function generateCodeChallenge(verifier) {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

// 存储（生产环境请使用 Redis / 数据库）
const sessions = new Map();

// 2. 登录入口 - 重定向到 Sakura Account
app.get('/auth/login', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  sessions.set(state, { codeVerifier });

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: 'YOUR_CLIENT_ID',
    redirect_uri: 'http://localhost:3000/auth/callback',
    scope: 'openid profile email',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    prompt: 'consent',
  });

  res.redirect(\`https://account.sakura.example.com/oauth/authorize?\${params}\`);
});

// 3. 回调处理 - 换取令牌
app.get('/auth/callback', async (req, res) => {
  const { code, state } = req.query;
  const session = sessions.get(state);
  if (!session) return res.status(400).send('Invalid state');

  const tokenRes = await fetch('https://account.sakura.example.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: 'http://localhost:3000/auth/callback',
      client_id: 'YOUR_CLIENT_ID',
      client_secret: 'YOUR_CLIENT_SECRET',
      code_verifier: session.codeVerifier,
    }),
  });

  const tokens = await tokenRes.json();
  sessions.delete(state);
  sessions.set(tokens.access_token, tokens);

  // 4. 获取用户信息
  const userRes = await fetch('https://account.sakura.example.com/oauth/userinfo', {
    headers: { Authorization: \`Bearer \${tokens.access_token}\` },
  });
  const user = await userRes.json();

  res.json({ user, tokens });
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));`,
),
  },
  python: {
    code: replace(`import hashlib
import base64
import os
import secrets
from urllib.parse import urlencode
import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import RedirectResponse

app = FastAPI()

# 临时存储（生产环境请使用 Redis）
sessions = {}

# 1. PKCE 工具函数
def generate_code_verifier() -> str:
    return base64.urlsafe_b64encode(os.urandom(32)).rstrip(b'=').decode()

def generate_code_challenge(verifier: str) -> str:
    digest = hashlib.sha256(verifier.encode()).digest()
    return base64.urlsafe_b64encode(digest).rstrip(b'=').decode()

CLIENT_ID = "YOUR_CLIENT_ID"
CLIENT_SECRET = "YOUR_CLIENT_SECRET"
REDIRECT_URI = "http://localhost:8000/auth/callback"
SAKURA_BASE = "https://account.sakura.example.com"

# 2. 登录 - 重定向到 Sakura Account
@app.get("/auth/login")
async def login():
    state = secrets.token_hex(16)
    code_verifier = generate_code_verifier()
    code_challenge = generate_code_challenge(code_verifier)
    sessions[state] = code_verifier

    params = {
        "response_type": "code",
        "client_id": CLIENT_ID,
        "redirect_uri": REDIRECT_URI,
        "scope": "openid profile email",
        "state": state,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
        "prompt": "consent",
    }

    return RedirectResponse(f"{SAKURA_BASE}/oauth/authorize?{urlencode(params)}")


# 3. 回调 - 换取令牌
@app.get("/auth/callback")
async def callback(code: str, state: str):
    code_verifier = sessions.pop(state, None)
    if not code_verifier:
        raise HTTPException(400, "Invalid state")

    async with httpx.AsyncClient() as client:
        token_res = await client.post(
            f"{SAKURA_BASE}/oauth/token",
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": REDIRECT_URI,
                "client_id": CLIENT_ID,
                "client_secret": CLIENT_SECRET,
                "code_verifier": code_verifier,
            },
        )
        tokens = token_res.json()

        # 4. 获取用户信息
        user_res = await client.get(
            f"{SAKURA_BASE}/oauth/userinfo",
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )
        user = user_res.json()

    return {"user": user, "tokens": tokens}`,
),
  },
  go: {
    code: replace(`package main

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
)

const (
	clientID     = "YOUR_CLIENT_ID"
	clientSecret = "YOUR_CLIENT_SECRET"
	redirectURI  = "http://localhost:8080/auth/callback"
	sakuraBase   = "https://account.sakura.example.com"
)

var sessions = map[string]string{} // state -> codeVerifier

// 1. PKCE 工具
func generateCodeVerifier() string {
	b := make([]byte, 32)
	rand.Read(b)
	return base64.RawURLEncoding.EncodeToString(b)
}

func generateCodeChallenge(verifier string) string {
	h := sha256.Sum256([]byte(verifier))
	return base64.RawURLEncoding.EncodeToString(h[:])
}

// 2. 登录
func loginHandler(w http.ResponseWriter, r *http.Request) {
	stateBytes := make([]byte, 16)
	rand.Read(stateBytes)
	state := hex.EncodeToString(stateBytes)

	verifier := generateCodeVerifier()
	sessions[state] = verifier

	params := url.Values{
		"response_type":         {"code"},
		"client_id":             {clientID},
		"redirect_uri":          {redirectURI},
		"scope":                 {"openid profile email"},
		"state":                 {state},
		"code_challenge":        {generateCodeChallenge(verifier)},
		"code_challenge_method": {"S256"},
		"prompt":                {"consent"},
	}

	redirectURL := fmt.Sprintf("%s/oauth/authorize?%s",
		sakuraBase, params.Encode())
	http.Redirect(w, r, redirectURL, http.StatusFound)
}

// 3. 回调
func callbackHandler(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	code := q.Get("code")
	state := q.Get("state")

	codeVerifier, ok := sessions[state]
	if !ok {
		http.Error(w, "Invalid state", http.StatusBadRequest)
		return
	}
	delete(sessions, state)

	tokenRes, _ := http.PostForm(sakuraBase+"/oauth/token", url.Values{
		"grant_type":    {"authorization_code"},
		"code":          {code},
		"redirect_uri":  {redirectURI},
		"client_id":     {clientID},
		"client_secret": {clientSecret},
		"code_verifier": {codeVerifier},
	})
	defer tokenRes.Body.Close()

	var tokens map[string]interface{}
	json.NewDecoder(tokenRes.Body).Decode(&tokens)

	// 4. 获取用户信息
	req, _ := http.NewRequest("GET",
		sakuraBase+"/oauth/userinfo", nil)
	req.Header.Set("Authorization",
		"Bearer "+tokens["access_token"].(string))

	userRes, _ := http.DefaultClient.Do(req)
	defer userRes.Body.Close()

	var user map[string]interface{}
	json.NewDecoder(userRes.Body).Decode(&user)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"user": user, "tokens": tokens,
	})
}

func main() {
	http.HandleFunc("/auth/login", loginHandler)
	http.HandleFunc("/auth/callback", callbackHandler)
	log.Fatal(http.ListenAndServe(":8080", nil))
}`,
),
  },
};
}

const SCOPES_DATA = [
  { scope: 'openid', icon: Key, key: 'scopeOpenidInfo' },
  { scope: 'profile', icon: BookOpen, key: 'scopeProfileInfo' },
  { scope: 'email', icon: Globe, key: 'scopeEmailInfo' },
];

const FEATURES = [
  { icon: ShieldCheck, key: 'featureOAuth', descKey: 'featureOAuthDesc', color: 'text-blue-500' },
  { icon: Fingerprint, key: 'featureOIDC', descKey: 'featureOIDCDesc', color: 'text-purple-500' },
  { icon: Zap, key: 'featureSSO', descKey: 'featureSSODesc', color: 'text-amber-500' },
  { icon: Fingerprint, key: 'featurePasskey', descKey: 'featurePasskeyDesc', color: 'text-emerald-500' },
  { icon: FileCode, key: 'featureJWT', descKey: 'featureJWTDesc', color: 'text-cyan-500' },
  { icon: Sliders, key: 'featureScopes', descKey: 'featureScopesDesc', color: 'text-rose-500' },
];

const SEC_ITEMS = [
  { icon: Shield, key: 'secState', descKey: 'secStateDesc' },
  { icon: Lock, key: 'secPKCE', descKey: 'secPKCEDesc' },
  { icon: AlertTriangle, key: 'secSecret', descKey: 'secSecretDesc' },
  { icon: CheckCircle2, key: 'secValidate', descKey: 'secValidateDesc' },
  { icon: Globe, key: 'secHTTPS', descKey: 'secHTTPSDesc' },
  { icon: RotateCw, key: 'secRotation', descKey: 'secRotationDesc' },
];

const FAQ_DATA = [
  { q: 'faqQ1', a: 'faqA1' },
  { q: 'faqQ2', a: 'faqA2' },
  { q: 'faqQ3', a: 'faqA3' },
  { q: 'faqQ4', a: 'faqA4' },
  { q: 'faqQ5', a: 'faqA5' },
  { q: 'faqQ6', a: 'faqA6' },
];

export default function DocsPage() {
  const t = useTranslations('dashboard.applications.docs');
  const { success } = useToast();
  const [activeTab, setActiveTab] = useState<CodeTab>('nextjs');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null);

  const baseUrl = useMemo(() => getBaseUrl(), []);
  const codeSamples = useMemo(() => getCodeSamples(baseUrl), [baseUrl]);

  // Scroll reveal hooks
  const heroRef = useScrollReveal(0.2);
  const featuresRef = useScrollReveal(0.1);
  const quickStartRef = useScrollReveal(0.1);
  const flowRef = useScrollReveal(0.1);
  const endpointsRef = useScrollReveal(0.1);
  const paramsRef = useScrollReveal(0.1);
  const codeRef = useScrollReveal(0.05);
  const securityRef = useScrollReveal(0.1);
  const scopesRef = useScrollReveal(0.1);
  const faqRef = useScrollReveal(0.1);
  const ctaRef = useScrollReveal(0.2);

  const handleCopyEndpoint = useCallback(
    async (path: string) => {
      const url = `${baseUrl}${path}`;
      try {
        await navigator.clipboard.writeText(url);
        setCopiedEndpoint(path);
        success(t('copySuccess'));
        setTimeout(() => setCopiedEndpoint(null), 2000);
      } catch {
        // fallback
        const ta = document.createElement('textarea');
        ta.value = url;
        document.body.appendChild(ta);
        ta.select();
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        document.execCommand('copy');
        document.body.removeChild(ta);
        setCopiedEndpoint(path);
        success(t('copySuccess'));
        setTimeout(() => setCopiedEndpoint(null), 2000);
      }
    },
    [success, t],
  );

  return (
    <div className="space-y-16 sm:space-y-24 pb-16">
      {/* ===== HERO ===== */}
      <div ref={heroRef.ref}>
        <div
          className={`relative overflow-hidden bg-card rounded-2xl sm:rounded-3xl border border-border p-8 sm:p-12 lg:p-16 transition-all duration-700 ${
            heroRef.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          {/* Animated background blobs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-3xl animate-blob" />
            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-500/10 dark:bg-purple-500/5 rounded-full blur-3xl animate-blob animation-delay-2000" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl animate-blob animation-delay-4000" />
          </div>

          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 text-xs font-medium mb-6 animate-fade-in">
              <BookOpen className="w-3.5 h-3.5" />
              OAuth 2.0 / OpenID Connect
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-text-primary mb-4 animate-slide-in-up">
              {t('hero')}
            </h1>
            <p className="text-base sm:text-lg text-text-secondary leading-relaxed animate-slide-in-up delay-100">
              {t('heroDesc')}
            </p>
            <div className="flex flex-wrap gap-3 mt-8 animate-slide-in-up delay-200">
              <Link
                href="/dashboard/applications"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-accent-button rounded-xl hover:bg-accent-button-hover transition-all hover:shadow-lg hover:shadow-accent-button/25"
              >
                <Rocket className="w-4 h-4" />
                {t('quickStart')}
              </Link>
              <a
                href="#code-examples"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-text-secondary bg-muted rounded-xl hover:bg-border strong transition-all hover:shadow-md"
              >
                <FileCode className="w-4 h-4" />
                {t('codeExamples')}
              </a>
            </div>
          </div>

          {/* Decorative dots */}
          <div className="absolute right-8 top-8 sm:right-12 sm:top-12 grid grid-cols-3 gap-2 opacity-30">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-accent-button animate-pulse"
                style={{ animationDelay: `${i * 200}ms` }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ===== FEATURES ===== */}
      <div ref={featuresRef.ref}>
        <div
          className={`transition-all duration-700 ${
            featuresRef.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <h2 className="text-2xl font-bold text-text-primary mb-2">{t('features')}</h2>
          <p className="text-sm text-text-tertiary mb-8">{t('heroDesc')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((feature, i) => (
              <div
                key={feature.key}
                className="group relative bg-card border border-border rounded-2xl p-5 sm:p-6 hover:border-accent-foreground/20 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                style={{
                  animationDelay: `${i * 80}ms`,
                  opacity: featuresRef.visible ? 1 : 0,
                  transform: featuresRef.visible ? 'translateY(0)' : 'translateY(20px)',
                  transition: `all 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${i * 80}ms`,
                }}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-muted group-hover:scale-110 transition-transform duration-300`}
                >
                  <feature.icon className={`w-5 h-5 ${feature.color}`} />
                </div>
                <h3 className="text-base font-semibold text-text-primary mb-1.5">{t(feature.key)}</h3>
                <p className="text-sm text-text-tertiary leading-relaxed">{t(feature.descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== QUICK START ===== */}
      <div ref={quickStartRef.ref}>
        <div
          className={`transition-all duration-700 ${
            quickStartRef.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Rocket className="w-4 h-4 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold text-text-primary">{t('quickStart')}</h2>
          </div>
          <p className="text-sm text-text-tertiary mb-8 ml-11">{t('quickStartDesc')}</p>

          <div className="relative ml-4 sm:ml-6">
            {/* Vertical line */}
            <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-gradient-to-b from-blue-500 via-purple-500 to-emerald-500 rounded-full" />

            {[1, 2, 3, 4, 5].map((step, i) => (
              <div
                key={step}
                className="relative pl-8 sm:pl-10 pb-8 last:pb-0"
                style={{
                  opacity: quickStartRef.visible ? 1 : 0,
                  transform: quickStartRef.visible ? 'translateX(0)' : 'translateX(-16px)',
                  transition: `all 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${i * 120}ms`,
                }}
              >
                {/* Step number circle */}
                <div className="absolute left-0 top-0 -translate-x-1/2 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-purple-500/25 z-10 ring-4 ring-background">
                  {step}
                </div>

                <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 hover:border-accent-foreground/10 hover:shadow-md transition-all duration-300">
                  <h3 className="text-base font-semibold text-text-primary mb-1">
                    {t(`step${step}Title`)}
                  </h3>
                  <p className="text-sm text-text-tertiary leading-relaxed">
                    {t(`step${step}Desc`)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== AUTH FLOW ===== */}
      <div ref={flowRef.ref}>
        <div
          className={`bg-card border border-border rounded-2xl sm:rounded-3xl p-6 sm:p-8 transition-all duration-700 ${
            flowRef.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
              <ArrowRightToLine className="w-4 h-4 text-cyan-500" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-text-primary">{t('authFlow')}</h2>
          </div>
          <p className="text-sm text-text-tertiary mb-8 ml-11">{t('authFlowDesc')}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((step, i) => (
              <div
                key={step}
                className="relative group"
                style={{
                  opacity: flowRef.visible ? 1 : 0,
                  transform: flowRef.visible ? 'scale(1)' : 'scale(0.95)',
                  transition: `all 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${i * 80}ms`,
                }}
              >
                <div className="bg-muted border border-border rounded-2xl p-4 sm:p-5 h-full hover:border-accent-foreground/20 hover:shadow-md transition-all duration-300">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                      {step}
                    </span>
                    {/* Arrow connector for all except last */}
                    {step < 6 && (
                      <ChevronRight className="w-4 h-4 text-text-quaternary hidden sm:block" />
                    )}
                  </div>
                  <p className="text-sm text-text-secondary leading-relaxed">{t(`flowStep${step}`)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== ENDPOINTS ===== */}
      <div ref={endpointsRef.ref}>
        <div
          className={`transition-all duration-700 ${
            endpointsRef.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Globe className="w-4 h-4 text-amber-500" />
            </div>
            <h2 className="text-2xl font-bold text-text-primary">{t('endpoints')}</h2>
          </div>
          <p className="text-sm text-text-tertiary mb-8 ml-11">{t('endpointsDesc')}</p>

          <div className="space-y-3">
            {ENDPOINTS.map((ep, i) => (
              <div
                key={ep.path}
                className="group bg-card border border-border rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-accent-foreground/20 hover:shadow-md transition-all duration-300"
                style={{
                  opacity: endpointsRef.visible ? 1 : 0,
                  transform: endpointsRef.visible ? 'translateY(0)' : 'translateY(12px)',
                  transition: `all 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${i * 60}ms`,
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      GET
                    </span>
                    <h3 className="text-sm font-semibold text-text-primary">{t(ep.key)}</h3>
                  </div>
                  <p className="text-xs text-text-tertiary mb-2">{t(ep.desc)}</p>
                  <code className="text-xs sm:text-sm font-mono text-text-secondary bg-muted px-2 py-1 rounded-lg break-all">
                    {baseUrl}{ep.path}
                  </code>
                </div>
                <button
                  onClick={() => handleCopyEndpoint(ep.path)}
                  className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary bg-muted rounded-lg hover:bg-border-strong hover:text-text-primary transition-all active:scale-95"
                >
                  {copiedEndpoint === ep.path ? (
                    <CopyCheck className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  {copiedEndpoint === ep.path ? t('copySuccess') : t('copyEndpoint')}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== AUTH PARAMETERS ===== */}
      <div ref={paramsRef.ref}>
        <div
          className={`bg-card border border-border rounded-2xl sm:rounded-3xl overflow-hidden transition-all duration-700 ${
            paramsRef.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="p-4 sm:p-6 border-b border-border">
            <h2 className="text-lg font-semibold text-text-primary">{t('authCode')}</h2>
            <p className="text-sm text-text-tertiary mt-1">{t('authCodeDesc')}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th className="text-left px-4 sm:px-6 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">
                    {t('param')}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">
                    {t('type')}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">
                    {t('required')}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">
                    {t('description')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {AUTH_PARAMS.map((p) => (
                  <tr key={p.param} className="border-b border-border/50 hover:bg-muted transition-colors">
                    <td className="px-4 sm:px-6 py-3">
                      <code className="text-xs font-mono text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-500/10 px-1.5 py-0.5 rounded">
                        {p.param}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-text-tertiary text-xs font-mono">{p.type}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        {t('required')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-secondary text-xs leading-relaxed">{t(p.desc)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Notes */}
          <div className="p-4 sm:p-6 space-y-2">
            <div className="flex items-start gap-2.5 p-3 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-0.5">{t('note')}</p>
                <p className="text-xs text-amber-600/80 dark:text-amber-400/70">{t('notePkce')}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 p-3 bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-0.5">{t('note')}</p>
                <p className="text-xs text-blue-600/80 dark:text-blue-400/70">{t('noteRedirectUri')}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 p-3 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-0.5">{t('note')}</p>
                <p className="text-xs text-emerald-600/80 dark:text-emerald-400/70">{t('noteTokenExpiry')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== CODE EXAMPLES ===== */}
      <div id="code-examples" ref={codeRef.ref}>
        <div
          className={`transition-all duration-700 ${
            codeRef.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <FileCode className="w-4 h-4 text-violet-500" />
            </div>
            <h2 className="text-2xl font-bold text-text-primary">{t('codeExamples')}</h2>
          </div>
          <p className="text-sm text-text-tertiary mb-6 ml-11">{t('codeExamplesDesc')}</p>

          <div className="bg-card border border-border rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm">
            {/* Tabs */}
            <div className="flex gap-1 p-1.5 bg-muted rounded-xl mx-4 mt-4 overflow-x-auto">
              {(['nextjs', 'nodejs', 'python', 'go'] as CodeTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-shrink-0 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                    activeTab === tab
                      ? 'bg-card text-text-primary shadow-sm'
                      : 'text-text-tertiary hover:text-text-secondary'
                  }`}
                >
                  {t(`tab${tab.charAt(0).toUpperCase() + tab.slice(1)}` as any)}
                </button>
              ))}
            </div>
            {/* Code block */}
            <div className="p-4 sm:p-6 overflow-x-auto">
              <pre className="text-xs sm:text-sm leading-relaxed">
                <code className="font-mono text-text-secondary block whitespace-pre">
                  {codeSamples[activeTab].code}
                </code>
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* ===== SECURITY ===== */}
      <div ref={securityRef.ref}>
        <div
          className={`transition-all duration-700 ${
            securityRef.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
              <Shield className="w-4 h-4 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-text-primary">{t('security')}</h2>
          </div>
          <p className="text-sm text-text-tertiary mb-8 ml-11">{t('securityDesc')}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SEC_ITEMS.map((item, i) => (
              <div
                key={item.key}
                className="group bg-card border border-border rounded-2xl p-5 hover:border-red-500/20 hover:shadow-md transition-all duration-300"
                style={{
                  opacity: securityRef.visible ? 1 : 0,
                  transform: securityRef.visible ? 'translateY(0)' : 'translateY(16px)',
                  transition: `all 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${i * 80}ms`,
                }}
              >
                <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center mb-3 group-hover:bg-red-500/20 transition-colors">
                  <item.icon className="w-4.5 h-4.5 text-red-500" />
                </div>
                <h3 className="text-sm font-semibold text-text-primary mb-1.5">{t(item.key)}</h3>
                <p className="text-xs text-text-tertiary leading-relaxed">{t(item.descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== SCOPES ===== */}
      <div ref={scopesRef.ref}>
        <div
          className={`bg-card border border-border rounded-2xl sm:rounded-3xl p-6 sm:p-8 transition-all duration-700 ${
            scopesRef.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <h2 className="text-xl font-bold text-text-primary mb-1">{t('scopesTitle')}</h2>
          <p className="text-sm text-text-tertiary mb-6">{t('scopesDesc')}</p>

          <div className="space-y-3">
            {SCOPES_DATA.map((scope, i) => (
              <div
                key={scope.scope}
                className="flex items-center gap-4 p-4 bg-muted rounded-2xl"
                style={{
                  opacity: scopesRef.visible ? 1 : 0,
                  transform: scopesRef.visible ? 'translateX(0)' : 'translateX(-16px)',
                  transition: `all 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${i * 80}ms`,
                }}
              >
                <div className="w-9 h-9 rounded-lg bg-card flex items-center justify-center flex-shrink-0">
                  <scope.icon className="w-4 h-4 text-accent-button" />
                </div>
                <div>
                  <code className="text-sm font-mono font-bold text-pink-600 dark:text-pink-400">
                    {scope.scope}
                  </code>
                  <p className="text-xs text-text-tertiary mt-0.5">{t(scope.key)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== FAQ ===== */}
      <div ref={faqRef.ref}>
        <div
          className={`transition-all duration-700 ${
            faqRef.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <h2 className="text-2xl font-bold text-text-primary mb-1">{t('faq')}</h2>
          <p className="text-sm text-text-tertiary mb-6">{t('faqDesc')}</p>

          <div className="space-y-3">
            {FAQ_DATA.map((faq, i) => {
              const isOpen = expandedFaq === i;
              return (
                <div
                  key={i}
                  className="bg-card border border-border rounded-2xl overflow-hidden transition-all duration-300 hover:border-accent-foreground/10"
                  style={{
                    opacity: faqRef.visible ? 1 : 0,
                    transform: faqRef.visible ? 'translateY(0)' : 'translateY(12px)',
                    transition: `all 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${i * 60}ms`,
                  }}
                >
                  <button
                    onClick={() => setExpandedFaq(isOpen ? null : i)}
                    className="w-full flex items-center justify-between gap-4 p-4 sm:p-5 text-left"
                  >
                    <span className="text-sm font-semibold text-text-primary">{t(faq.q)}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-text-quaternary flex-shrink-0 transition-transform duration-300 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  <div
                    className={`overflow-hidden transition-all duration-300 ${
                      isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <p className="px-4 sm:px-5 pb-4 sm:pb-5 text-sm text-text-secondary leading-relaxed">
                      {t(faq.a)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ===== CTA ===== */}
      <div ref={ctaRef.ref}>
        <div
          className={`relative overflow-hidden bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-emerald-500/10 dark:from-blue-500/5 dark:via-purple-500/5 dark:to-emerald-500/5 border border-blue-500/20 dark:border-blue-500/10 rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center transition-all duration-700 ${
            ctaRef.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          {/* Blob decorations */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 animate-blob" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 animate-blob animation-delay-2000" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 dark:bg-white/5 border border-white/20 backdrop-blur-sm text-text-secondary text-xs font-medium mb-5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              {t('quickStart')}
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-3">{t('conclusion')}</h2>
            <p className="text-sm sm:text-base text-text-secondary max-w-lg mx-auto mb-8">
              {t('conclusionDesc')}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/dashboard/applications"
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-accent-button rounded-xl hover:bg-accent-button-hover transition-all hover:shadow-lg hover:shadow-accent-button/25 hover:-translate-y-0.5"
              >
                <Rocket className="w-4 h-4" />
                {t('quickStart')}
              </Link>
              <a
                href={`${baseUrl}/.well-known/openid-configuration`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-text-secondary bg-card border border-border rounded-xl hover:bg-muted hover:border-border-strong transition-all hover:-translate-y-0.5"
              >
                <ExternalLink className="w-4 h-4" />
                {t('epOpenIdConfig')}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
