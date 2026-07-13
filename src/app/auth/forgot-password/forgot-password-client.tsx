'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PublicNav } from '@/components/PublicNav';
import { SakuraBackground } from '@/components/SakuraPetal';
import { useToast } from '@/components/ToastProvider';
import { getErrorMessage } from '@/lib/api-error';
import { Spinner } from '@/components/primitives';
import { JSON_HEADERS, LOGIN_PATH } from '@/lib/constants';

export default function ForgotPasswordClient() {
  const t = useTranslations('auth.forgotPassword');
  const { success, error } = useToast();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email) {
      error(t('enterEmail'));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setSent(true);
        success(data.message || t('sent'));
      } else {
        error(getErrorMessage(data, t('sendFailed')));
      }
    } catch {
      error(t('networkError'));
    } finally {
      setLoading(false);
    }
  }, [email, success, error, t]);

  if (sent) {
    return (
      <main className="min-h-screen relative overflow-hidden flex items-center justify-center bg-background">
        <PublicNav absolute />
        <SakuraBackground count={10}>
          <div className="absolute w-[500px] h-[500px] rounded-full blur-[180px] opacity-20 dark:opacity-15"
            style={{ background: 'radial-gradient(circle, var(--accent-button) 0%, transparent 70%)', right: '-10%', top: '-10%', animation: 'float 10s ease-in-out infinite' }} />
        </SakuraBackground>

        <div className="relative z-10 w-full max-w-[400px] mx-auto px-6 animate-slide-in-up">
          <div className="bg-card/80 dark:bg-card/60 backdrop-blur-xl border border-border rounded-2xl p-8 shadow-lg text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M22 7l-10 7L2 7" />
              </svg>
            </div>
            <h2 className="text-lg font-medium text-foreground mb-2">{t('sentTitle')}</h2>
            <p className="text-sm text-muted-foreground mb-6">{t('sentDesc')}</p>
            <Link href={LOGIN_PATH} className="text-sm text-accent-button hover:text-accent-button-hover transition-colors font-medium">
              {t('backToLogin')}
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
          style={{ background: 'radial-gradient(circle, var(--accent-button) 0%, transparent 70%)', left: '-10%', top: '-10%', animation: 'float 10s ease-in-out infinite' }} />
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
                {t('email')} <span className="text-pink-400">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-background border border-border-input rounded-lg text-sm text-foreground placeholder-muted-foreground/50 outline-none transition-all duration-200 focus:border-accent-button focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent-button)_12%,transparent)]"
                placeholder={t('emailPlaceholder')}
                autoComplete="email"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-accent-button text-white rounded-lg font-medium text-sm hover:bg-accent-button-hover transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <Spinner className="h-4 w-4" />}
              {loading ? t('sending') : t('send')}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-7">
            <Link href={LOGIN_PATH} className="text-accent-button hover:text-accent-button-hover transition-colors font-medium">
              {t('backToLogin')}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
