'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Shield, User, Mail, Fingerprint, Check, X } from 'lucide-react';
import { resolveAppIcon } from '@/lib/app-icon';
import { useTranslations } from 'next-intl';
import { Spinner } from '@/components/primitives';
import { SakuraPetals } from '@/components/SakuraPetal';
import { BRAND_NAME } from '@/lib/constants';

interface ConsentUser {
  username: string;
  nickname?: string;
  email: string;
  avatar?: string | null;
}

interface ClientInfoResponse {
  client?: {
    name: string;
    icon?: string | null;
    appUrl?: string | null;
  };
}

export default function ConsentPage() {
  return (
    <Suspense fallback={null}>
      <ConsentContent />
    </Suspense>
  );
}

function ConsentContent() {
  const t = useTranslations('auth.consent');
  const router = useRouter();
  const searchParams = useSearchParams();
  const SCOPE_INFO: Record<string, { label: string; description: string; icon: typeof User }> = {
    openid: { label: t('scopeIdentity'), description: t('scopeIdentityDesc'), icon: Fingerprint },
    profile: { label: t('scopeProfile'), description: t('scopeProfileDesc'), icon: User },
    email: { label: t('scopeEmail'), description: t('scopeEmailDesc'), icon: Mail },
  };
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null);
  const [mounted, setMounted] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientIcon, setClientIcon] = useState<string | null>(null);
  const [clientAppUrl, setClientAppUrl] = useState('');
  const [iconErrored, setIconErrored] = useState(false);
  const [user, setUser] = useState<ConsentUser | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);

  const clientId = searchParams.get('client_id');
  const redirectUri = searchParams.get('redirect_uri');
  const scope = searchParams.get('scope');
  const state = searchParams.get('state');
  const nonce = searchParams.get('nonce');
  const codeChallenge = searchParams.get('code_challenge');
  const codeChallengeMethod = searchParams.get('code_challenge_method');

  const scopes = scope ? scope.split(/[,\s]+/) : ['openid', 'profile'];

  useEffect(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setMounted(true);
      });
    });
    fetch('/api/auth/session').then(res => res.json()).then(data => {
      if (data.user) setUser(data.user);
    }).catch((err) => { console.error('Failed to fetch session:', err); });
  }, []);

  useEffect(() => {
    if (!clientId) return;
    fetch(`/api/applications/info?id=${clientId}`)
      .then(res => {
        if (!res.ok) {
          setClientError(t('invalidClient'));
          return null;
        }
        return res.json() as Promise<ClientInfoResponse>;
      })
      .then(data => {
        if (data?.client) {
          setClientName(data.client.name);
          setClientIcon(resolveAppIcon(data.client.icon));
          setClientAppUrl(data.client.appUrl || '');
        } else if (data) {
          setClientError(t('invalidClient'));
        }
      })
      .catch(() => setClientError(t('cannotVerify')));
  }, [clientId, t]);

  const handleDecision = async (approved: boolean) => {
    setLoading(approved ? 'approve' : 'reject');
    try {
      const params = new URLSearchParams();
      if (clientId) params.set('client_id', clientId);
      if (redirectUri) params.set('redirect_uri', redirectUri);
      if (scope) params.set('scope', scope);
      if (state) params.set('state', state);
      if (nonce) params.set('nonce', nonce || '');
      if (codeChallenge) params.set('code_challenge', codeChallenge);
      if (codeChallengeMethod) params.set('code_challenge_method', codeChallengeMethod);
      params.set('approved', approved.toString());

      const res = await fetch('/api/applications/consent', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      const data = await res.json();

      if (res.status === 401) {
        window.location.assign(`/auth/login?callbackUrl=${encodeURIComponent(window.location.href)}`);
        return;
      }

      if (data.redirect) {
        window.location.assign(data.redirect);
      } else {
        router.refresh();
      }
    } catch {
      setLoading(null);
    }
  };

  if (!clientId || !redirectUri) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-destructive">{t('missingParams')}</p>
      </main>
    );
  }

  if (clientError) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <div className="bg-card/50 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-lg p-8 max-w-md mx-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <X className="w-7 h-7 text-red-500" />
          </div>
          <h1 className="text-lg font-semibold text-foreground">{t('invalidRequest')}</h1>
          <p className="text-sm text-muted-foreground mt-2">{clientError}</p>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="min-h-screen relative overflow-hidden flex items-center justify-center bg-background">
        {/* Ambient background */}
        <div className="absolute inset-0">
          <div
            className="absolute w-[600px] h-[600px] rounded-full blur-[200px] opacity-30 dark:opacity-20"
            style={{ background: 'radial-gradient(circle, var(--accent-button) 0%, transparent 70%)', left: '-10%', top: '-15%', animation: 'float 9s ease-in-out infinite' }}
          />
          <div
            className="absolute w-[500px] h-[500px] rounded-full blur-[180px] opacity-20 dark:opacity-15"
            style={{ background: 'radial-gradient(circle, #f472b6 0%, transparent 70%)', right: '-5%', bottom: '-10%', animation: 'float 11s ease-in-out 2s infinite' }}
          />
          <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.04]" style={{
            backgroundImage: `linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }} />
          <SakuraPetals count={15} />
        </div>

        {/* Nav */}
        <nav
          className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 md:px-40 lg:px-60 py-5"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(-8px)',
            transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.05s',
          }}
        >
          <Link href="/" className="flex items-center gap-2">
            <Image src="/sakura.ico" alt="Sakura" width={24} height={24} className="w-6 h-6" />
            <span className="text-sm font-semibold text-foreground tracking-tight">{BRAND_NAME}</span>
          </Link>
          {user && (
            <div className="flex items-center gap-3">
              <div className="relative w-8 h-8 rounded-full bg-accent-button/10 flex items-center justify-center text-accent-button font-semibold text-sm overflow-hidden shrink-0">
                {user.avatar ? (
                  <Image src={user.avatar} alt="" fill className="object-cover" unoptimized />
                ) : (
                  (user.nickname || user.username || '').charAt(0).toUpperCase()
                )}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-foreground">{user.nickname || user.username}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>
          )}
        </nav>

        {/* Content */}
        <div
          className="relative z-10 w-full max-w-md mx-4"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(24px)',
            transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.15s',
          }}
        >
          <div className="bg-card/50 dark:bg-card/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg shadow-black/[0.04] dark:shadow-black/20 overflow-hidden">
            {/* Header */}
            <div
              className="px-8 pt-8 pb-6 text-center transition-all duration-700"
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.95)',
                transitionDelay: '0.3s',
              }}
            >
              <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 overflow-hidden bg-muted border border-border shadow-sm">
                {clientIcon && !iconErrored ? (
                  <Image src={clientIcon} alt={clientName} fill className="object-cover" unoptimized onError={() => setIconErrored(true)} />
                ) : (
                  <div className="w-full h-full bg-accent-button/10 flex items-center justify-center">
                    <Shield className="w-7 h-7 text-accent-button" />
                  </div>
                )}
              </div>

              <h1 className="text-lg font-semibold text-foreground">{t('title')}</h1>
              <p className="text-sm text-muted-foreground mt-1.5">
                <span className="font-medium text-foreground">{clientName || clientId}</span> {t('subtitle')}
              </p>
              {clientAppUrl && (
                <a href={clientAppUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-accent-button hover:underline mt-1 inline-block">
                  {clientAppUrl}
                </a>
              )}
            </div>

            {/* Scopes */}
            <div
              className="px-8 py-5 border-t border-border transition-all duration-700"
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? 'translateY(0)' : 'translateY(12px)',
                transitionDelay: '0.5s',
              }}
            >
              <p className="text-xs font-medium text-muted-foreground mb-3 tracking-wide uppercase">{t('requestedPermissions')}</p>
              <div className="space-y-3">
                {scopes.map((s, i) => {
                  const info = SCOPE_INFO[s];
                  if (!info) return null;
                  const Icon = info.icon;
                  return (
                    <div
                      key={s}
                      className="flex items-start gap-3 transition-all duration-500"
                      style={{
                        opacity: mounted ? 1 : 0,
                        transform: mounted ? 'translateX(0)' : 'translateX(-12px)',
                        transitionDelay: `${0.6 + i * 0.1}s`,
                      }}
                    >
                      <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className="w-4 h-4 text-accent-button" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{info.label}</p>
                        <p className="text-xs text-muted-foreground">{info.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div
              className="px-8 py-5 border-t border-border flex gap-3 transition-all duration-700"
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? 'translateY(0)' : 'translateY(12px)',
                transitionDelay: '0.8s',
              }}
            >
              <button
                onClick={() => handleDecision(false)}
                disabled={!!loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-muted-foreground bg-background border border-border rounded-xl hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
              >
                {loading === 'reject' ? (
                  <Spinner className="h-4 w-4" />
                ) : (
                  <X className="w-4 h-4" />
                )}
                {loading === 'reject' ? t('processing') : t('deny')}
              </button>
              <button
                onClick={() => handleDecision(true)}
                disabled={!!loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-accent-button rounded-xl hover:bg-accent-button-hover transition-colors disabled:opacity-50"
              >
                {loading === 'approve' ? (
                  <Spinner className="h-4 w-4" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {loading === 'approve' ? t('processing') : t('allow')}
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
