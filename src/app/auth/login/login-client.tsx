'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ToastProvider';
import { getErrorMessage } from '@/lib/api-error';
import { Spinner } from '@/components/Spinner';
import { useTranslations } from 'next-intl';
import { JSON_HEADERS } from '@/lib/constants';
import { PublicNav } from '@/components/PublicNav';
import { SakuraPetal } from '@/components/SakuraPetal';

interface LoginClientProps {
  callbackUrl?: string;
}

export default function LoginClient({ callbackUrl }: LoginClientProps) {
  const t = useTranslations('auth.login');
  const router = useRouter();
  const { success, error } = useToast();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!username || !password) {
      error(t('enterCredentials'));
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (response.ok) {
        success(t('loginSuccess'));
        if (callbackUrl) {
          window.location.href = callbackUrl;
        } else {
          router.push('/dashboard');
        }
      } else {
        error(getErrorMessage(data, t('loginFailed')));
      }
    } catch {
      error(t('networkError'));
    } finally {
      setLoading(false);
    }
  }, [username, password, callbackUrl, router, success, error, t]);

  const handlePasskeyLogin = useCallback(async () => {
    try {
      const { startAuthentication } = await import('@simplewebauthn/browser');
      const optionsRes = await fetch('/api/auth/webauthn/login', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ action: 'generate' }),
      });
      const { options, challengeId } = await optionsRes.json();
      const response = await startAuthentication({ optionsJSON: options });
      const verifyRes = await fetch('/api/auth/webauthn/login', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ action: 'verify', response, challengeId }),
      });
      const data = await verifyRes.json();
      if (data.verified) {
        success(t('loginSuccess'));
        if (callbackUrl) {
          window.location.href = callbackUrl;
        } else {
          router.push('/dashboard');
        }
      } else {
        error(t('passkeyAuthFailed'));
      }
    } catch (err: unknown) {
      if (!(err instanceof Error) || err.name !== 'NotAllowedError') {
        error(t('passkeyLoginFailed'));
      }
    }
  }, [callbackUrl, router, success, error, t]);

  return (
    <main className="min-h-screen relative overflow-hidden flex items-center justify-center bg-background">
      <PublicNav absolute />

      <div className="absolute inset-0">
        <div
          className="absolute w-[600px] h-[600px] rounded-full blur-[200px] opacity-30 dark:opacity-20"
          style={{
            background: 'radial-gradient(circle, var(--accent-button) 0%, transparent 70%)',
            left: '-10%',
            top: '-15%',
            animation: 'float 8s ease-in-out infinite',
          }}
        />
        <div
          className="absolute w-[500px] h-[500px] rounded-full blur-[180px] opacity-20 dark:opacity-15"
          style={{
            background: 'radial-gradient(circle, #f472b6 0%, transparent 70%)',
            right: '-5%',
            bottom: '-10%',
            animation: 'float 10s ease-in-out 2s infinite',
          }}
        />

        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />

        <SakuraPetal delay={0} left="8%" size={10} duration={14} />
        <SakuraPetal delay={3} left="22%" size={8} duration={16} />
        <SakuraPetal delay={6} left="40%" size={12} duration={13} />
        <SakuraPetal delay={2} left="58%" size={9} duration={15} />
        <SakuraPetal delay={8} left="72%" size={11} duration={14} />
        <SakuraPetal delay={5} left="88%" size={7} duration={17} />
      </div>

      <div className="relative z-10 w-full max-w-[960px] mx-auto px-6 py-12 flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
        <div className="hidden lg:block flex-1 text-center lg:text-left animate-slide-in-up" style={{ animationDelay: '0.1s' }}>
          <h1 className="text-4xl lg:text-5xl font-light text-foreground leading-tight tracking-tight mb-4">
            {t('title')}
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed max-w-sm mx-auto lg:mx-0 mb-10">
            {t('subtitle')}
          </p>

          <div className="hidden lg:flex items-center gap-8">
            {[
              { label: 'Passkey', icon: 'M12 2L2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5' },
              { label: 'OAuth 2.0', icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' },
              { label: 'OIDC', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-muted-foreground/60">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d={item.icon} />
                </svg>
                <span className="text-xs tracking-wide">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full max-w-[400px] animate-slide-in-up" style={{ animationDelay: '0.25s' }}>
          <div className="bg-card/80 dark:bg-card/60 backdrop-blur-xl border border-border rounded-2xl p-8 shadow-lg shadow-black/[0.04] dark:shadow-black/20">
            <div className="mb-7">
              <h2 className="text-xl font-medium text-foreground mb-1">{t('login')}</h2>
              <p className="text-sm text-muted-foreground">{t('formTitle')}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2 tracking-wide uppercase">{t('usernameOrEmail')}</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onFocus={() => setFocused('username')}
                  onBlur={() => setFocused(null)}
                  className="w-full px-4 py-2.5 bg-background border rounded-lg text-sm text-foreground placeholder-muted-foreground/50 outline-none transition-all duration-200"
                  style={{
                    borderColor: focused === 'username' ? 'var(--accent-button)' : 'var(--border-input)',
                    boxShadow: focused === 'username' ? '0 0 0 3px color-mix(in srgb, var(--accent-button) 12%, transparent)' : 'none',
                  }}
                  placeholder={t('usernameOrEmailPlaceholder')}
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2 tracking-wide uppercase">{t('password')}</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                  className="w-full px-4 py-2.5 bg-background border rounded-lg text-sm text-foreground placeholder-muted-foreground/50 outline-none transition-all duration-200"
                  style={{
                    borderColor: focused === 'password' ? 'var(--accent-button)' : 'var(--border-input)',
                    boxShadow: focused === 'password' ? '0 0 0 3px color-mix(in srgb, var(--accent-button) 12%, transparent)' : 'none',
                  }}
                  placeholder={t('passwordPlaceholder')}
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-accent-button text-white rounded-lg font-medium text-sm hover:bg-accent-button-hover transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
              >
                {loading && <Spinner className="h-4 w-4" />}
                {loading ? t('loggingIn') : t('login')}
              </button>
            </form>

            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground/60">{t('or')}</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <button
              onClick={handlePasskeyLogin}
              className="w-full py-2.5 bg-background border border-border-input hover:border-border-strong hover:bg-muted/50 text-foreground/70 hover:text-foreground rounded-lg text-sm transition-all duration-200 flex items-center justify-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              <span>{t('usePasskey')}</span>
            </button>

            <p className="text-center text-sm text-muted-foreground mt-7">
              {t('noAccount')}{' '}
              <Link href="/auth/register" className="text-accent-button hover:text-accent-button-hover transition-colors font-medium">
                {t('register')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
