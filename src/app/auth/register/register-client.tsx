'use client';

import { useCallback, useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PublicNav } from '@/components/PublicNav';
import { SakuraBackground } from '@/components/SakuraPetal';
import { useToast } from '@/components/ToastProvider';
import { getErrorMessage } from '@/lib/api-error';
import { Spinner } from '@/components/primitives';
import { JSON_HEADERS, LOGIN_PATH } from '@/lib/constants';

export default function RegisterClient() {
  const t = useTranslations('auth.register');
  const router = useRouter();
  const { success, error } = useToast();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [code, setCode] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [focused, setFocused] = useState<string | null>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown(prev => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleSendCode = useCallback(async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      error(t('invalidEmail'));
      return;
    }
    setSendLoading(true);
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST', headers: JSON_HEADERS,
        body: JSON.stringify({ email, registration: true }),
      });
      const data = await res.json();
      if (res.ok) {
        success(data.message || t('codeSent'));
        setCountdown(60);
        setCode('');
        codeRef.current?.focus();
      } else {
        error(getErrorMessage(data, t('sendFailed')));
      }
    } catch {
      error(t('networkError'));
    } finally {
      setSendLoading(false);
    }
  }, [email, success, error, t]);

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!username || !email || !password || !code) {
      error(t('fillRequired'));
      return;
    }
    if (password !== confirmPassword) {
      error(t('passwordMismatch'));
      return;
    }
    if (password.length < 8) {
      error(t('passwordTooShort'));
      return;
    }
    if (code.length !== 6) {
      error(t('invalidCode'));
      return;
    }
    if (!agreed) {
      error(t('agreeRequired'));
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ username, email, password, nickname: nickname || username, code }),
      });
      const data = await response.json();
      if (response.ok) {
        success(t('registerSuccess'));
        router.push('/dashboard');
      } else {
        error(getErrorMessage(data, t('registerFailed')));
      }
    } catch {
      error(t('networkError'));
    } finally {
      setLoading(false);
    }
  }, [username, email, password, confirmPassword, nickname, code, agreed, router, success, error, t]);

  const inputStyle = (field: string) => ({
    borderColor: focused === field ? 'var(--accent-button)' : 'var(--border-input)',
    boxShadow: focused === field ? '0 0 0 3px color-mix(in srgb, var(--accent-button) 12%, transparent)' : 'none',
  });

  return (
    <main className="min-h-screen relative overflow-hidden flex items-center justify-center bg-background">
      <PublicNav absolute />

      <SakuraBackground count={15}>
        <div
          className="absolute w-[600px] h-[600px] rounded-full blur-[200px] opacity-30 dark:opacity-20"
          style={{ background: 'radial-gradient(circle, #f472b6 0%, transparent 70%)', right: '-10%', top: '-15%', animation: 'float 9s ease-in-out infinite' }}
        />
        <div
          className="absolute w-[500px] h-[500px] rounded-full blur-[180px] opacity-20 dark:opacity-15"
          style={{ background: 'radial-gradient(circle, var(--accent-button) 0%, transparent 70%)', left: '-5%', bottom: '-10%', animation: 'float 11s ease-in-out 3s infinite' }}
        />
      </SakuraBackground>

      <div className="relative z-10 w-full max-w-[960px] mx-auto px-6 py-12 flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
        <div className="hidden lg:block flex-1 text-center lg:text-left animate-slide-in-up" style={{ animationDelay: '0.1s' }}>
          <h1 className="text-4xl lg:text-5xl font-light text-foreground leading-tight tracking-tight mb-4">
            {t('title')}
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed max-w-sm mx-auto lg:mx-0 mb-10">
            {t('subtitle')}
          </p>

          <div className="hidden lg:flex flex-col gap-3">
            {[
              t('featurePasskey'),
              t('featureOAuth'),
              t('featureAudit'),
            ].map((text, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-pink-400/50" />
                <span className="text-sm text-muted-foreground/70">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full max-w-[400px] animate-slide-in-up" style={{ animationDelay: '0.25s' }}>
          <div className="bg-card/80 dark:bg-card/60 backdrop-blur-xl border border-border rounded-2xl p-8 shadow-lg shadow-black/[0.04] dark:shadow-black/20">
            <div className="mb-7">
              <h2 className="text-xl font-medium text-foreground mb-1">{t('formTitle')}</h2>
              <p className="text-sm text-muted-foreground">{t('register')}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2 tracking-wide uppercase">
                  {t('username')} <span className="text-pink-400">*</span>
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onFocus={() => setFocused('username')}
                  onBlur={() => setFocused(null)}
                  className="w-full px-4 py-2.5 bg-background border rounded-lg text-sm text-foreground placeholder-muted-foreground/50 outline-none transition-all duration-200"
                  style={inputStyle('username')}
                  placeholder={t('username')}
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2 tracking-wide uppercase">
                  {t('email')} <span className="text-pink-400">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused(null)}
                  className="w-full px-4 py-2.5 bg-background border rounded-lg text-sm text-foreground placeholder-muted-foreground/50 outline-none transition-all duration-200"
                  style={inputStyle('email')}
                  placeholder={t('email')}
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2 tracking-wide uppercase">{t('nickname')}</label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  onFocus={() => setFocused('nickname')}
                  onBlur={() => setFocused(null)}
                  className="w-full px-4 py-2.5 bg-background border rounded-lg text-sm text-foreground placeholder-muted-foreground/50 outline-none transition-all duration-200"
                  style={inputStyle('nickname')}
                  placeholder={t('nicknameHint')}
                  disabled={loading}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-2 tracking-wide uppercase">
                    {t('password')} <span className="text-pink-400">*</span>
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocused('password')}
                    onBlur={() => setFocused(null)}
                    className="w-full px-4 py-2.5 bg-background border rounded-lg text-sm text-foreground placeholder-muted-foreground/50 outline-none transition-all duration-200"
                    style={inputStyle('password')}
                    placeholder={t('passwordHint')}
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-2 tracking-wide uppercase">
                    {t('confirmPassword')} <span className="text-pink-400">*</span>
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onFocus={() => setFocused('confirmPassword')}
                    onBlur={() => setFocused(null)}
                    className="w-full px-4 py-2.5 bg-background border rounded-lg text-sm text-foreground placeholder-muted-foreground/50 outline-none transition-all duration-200"
                    style={inputStyle('confirmPassword')}
                    placeholder={t('confirmPasswordHint')}
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2 tracking-wide uppercase">
                  {t('verifyCode')} <span className="text-pink-400">*</span>
                </label>
                <div className="flex gap-3">
                  <input
                    ref={codeRef}
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    onFocus={() => setFocused('code')}
                    onBlur={() => setFocused(null)}
                    className="flex-1 px-4 py-2.5 bg-background border rounded-lg text-sm text-foreground placeholder-muted-foreground/50 outline-none transition-all duration-200"
                    style={inputStyle('code')}
                    placeholder={t('codePlaceholder')}
                    maxLength={6}
                    autoComplete="one-time-code"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={sendLoading || countdown > 0 || loading}
                    className="shrink-0 px-4 py-2.5 bg-accent-button text-white rounded-lg text-sm font-medium hover:bg-accent-button-hover transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {sendLoading ? t('sending') : countdown > 0 ? `${countdown}s` : t('sendCode')}
                  </button>
                </div>
              </div>

              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative mt-0.5">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="sr-only peer"
                    disabled={loading}
                  />
                  <div className="w-4 h-4 border border-border rounded transition-all peer-checked:bg-accent-button peer-checked:border-accent-button flex items-center justify-center">
                    {agreed && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="1,4 4,7 9,1" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground leading-relaxed">
                  {t('agreeText')}{' '}
                  <a target="_blank" className="text-accent-button hover:text-accent-button-hover transition-colors underline" href="/auth/terms">
                    {t('termsOfService')}
                  </a>
                </span>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-accent-button text-white rounded-lg font-medium text-sm hover:bg-accent-button-hover transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
              >
                {loading && <Spinner className="h-4 w-4" />}
                {loading ? t('registering') : t('createAccount')}
              </button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-7">
              {t('hasAccount')}{' '}
              <Link href={LOGIN_PATH} className="text-accent-button hover:text-accent-button-hover transition-colors font-medium">
                {t('login')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
