'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PublicNav } from '@/components/PublicNav';
import { SakuraBackground } from '@/components/SakuraPetal';
import { useToast } from '@/components/ToastProvider';
import { getErrorMessage } from '@/lib/api-error';
import { Spinner } from '@/components/primitives';
import { JSON_HEADERS, LOGIN_PATH } from '@/lib/constants';

interface ResetPasswordClientProps {
  token?: string;
}

export default function ResetPasswordClient({ token }: ResetPasswordClientProps) {
  const t = useTranslations('auth.resetPassword');
  const router = useRouter();
  const { success, error } = useToast();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const invalidToken = !token;

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
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
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (res.ok) {
        success(data.message || t('success'));
        setDone(true);
      } else {
        error(getErrorMessage(data, t('failed')));
      }
    } catch {
      error(t('networkError'));
    } finally {
      setLoading(false);
    }
  }, [token, password, confirmPassword, success, error, t]);

  if (done) {
    return (
      <main className="min-h-screen relative overflow-hidden flex items-center justify-center bg-background">
        <PublicNav absolute />
        <SakuraBackground count={10}>
          <div className="absolute w-[500px] h-[500px] rounded-full blur-[180px] opacity-20 dark:opacity-15"
            style={{ background: 'radial-gradient(circle, var(--accent-button) 0%, transparent 70%)', right: '-10%', top: '-10%', animation: 'float 10s ease-in-out infinite' }} />
        </SakuraBackground>

        <div className="relative z-10 w-full max-w-[400px] mx-auto px-6 animate-slide-in-up">
          <div className="bg-card/80 dark:bg-card/60 backdrop-blur-xl border border-border rounded-2xl p-8 shadow-lg text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="text-lg font-medium text-foreground mb-2">{t('success')}</h2>
            <p className="text-sm text-muted-foreground mb-6">{t('successDesc')}</p>
            <button
              onClick={() => router.push(LOGIN_PATH)}
              className="w-full py-2.5 bg-accent-button text-white rounded-lg font-medium text-sm hover:bg-accent-button-hover transition-all duration-200"
            >
              {t('goToLogin')}
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (invalidToken) {
    return (
      <main className="min-h-screen relative overflow-hidden flex items-center justify-center bg-background">
        <PublicNav absolute />
        <SakuraBackground count={10}>
          <div className="absolute w-[500px] h-[500px] rounded-full blur-[180px] opacity-20 dark:opacity-15"
            style={{ background: 'radial-gradient(circle, var(--accent-button) 0%, transparent 70%)', left: '-10%', top: '-10%', animation: 'float 10s ease-in-out infinite' }} />
        </SakuraBackground>

        <div className="relative z-10 w-full max-w-[400px] mx-auto px-6 animate-slide-in-up">
          <div className="bg-card/80 dark:bg-card/60 backdrop-blur-xl border border-border rounded-2xl p-8 shadow-lg text-center">
            <h2 className="text-lg font-medium text-foreground mb-2">{t('invalidTitle')}</h2>
            <p className="text-sm text-muted-foreground mb-6">{t('invalidDesc')}</p>
            <Link href="/auth/forgot-password" className="text-sm text-accent-button hover:text-accent-button-hover transition-colors font-medium">
              {t('requestNew')}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen relative overflow-hidden flex items-center justify-center bg-background">
      <PublicNav absolute />
      <SakuraBackground count={10}>
        <div className="absolute w-[500px] h-[500px] rounded-full blur-[180px] opacity-20 dark:opacity-15"
          style={{ background: 'radial-gradient(circle, var(--accent-button) 0%, transparent 70%)', right: '-10%', top: '-10%', animation: 'float 10s ease-in-out infinite' }} />
      </SakuraBackground>

      <div className="relative z-10 w-full max-w-[400px] mx-auto px-6 animate-slide-in-up">
        <div className="bg-card/80 dark:bg-card/60 backdrop-blur-xl border border-border rounded-2xl p-8 shadow-lg shadow-black/[0.04] dark:shadow-black/20">
          <div className="mb-7">
            <h2 className="text-xl font-medium text-foreground mb-1">{t('title')}</h2>
            <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2 tracking-wide uppercase">
                {t('newPassword')} <span className="text-pink-400">*</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-background border border-border-input rounded-lg text-sm text-foreground placeholder-muted-foreground/50 outline-none transition-all duration-200 focus:border-accent-button focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent-button)_12%,transparent)]"
                placeholder={t('passwordHint')}
                autoComplete="new-password"
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
                className="w-full px-4 py-2.5 bg-background border border-border-input rounded-lg text-sm text-foreground placeholder-muted-foreground/50 outline-none transition-all duration-200 focus:border-accent-button focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent-button)_12%,transparent)]"
                placeholder={t('confirmPasswordHint')}
                autoComplete="new-password"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-accent-button text-white rounded-lg font-medium text-sm hover:bg-accent-button-hover transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {loading && <Spinner className="h-4 w-4" />}
              {loading ? t('resetting') : t('reset')}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
