'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { Shield, User, Mail, Fingerprint, Check, X, Play } from 'lucide-react';
import { Spinner } from '@/components/Spinner';
import { SakuraPetal } from '@/components/SakuraPetal';
import { BRAND_NAME } from '@/lib/constants';
import { useToast } from '@/components/ToastProvider';
import { getBaseUrl } from '@/lib/utils';

type Step = 'app' | 'login' | 'consent' | 'success' | 'denied';

interface OAuthSimulatorProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OAuthSimulator({ isOpen, onClose }: OAuthSimulatorProps) {
  const t = useTranslations('docs');
  const { error } = useToast();
  const baseUrl = useMemo(() => getBaseUrl(), []);
  const [step, setStep] = useState<Step>('login');
  const [mounted, setMounted] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [focused, setFocused] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [consentLoading, setConsentLoading] = useState<'approve' | 'reject' | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Reset state when opening
      setStep('app');
      setUsername('');
      setPassword('');
      setFocused(null);
      setLoginLoading(false);
      setConsentLoading(null);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setMounted(true));
      });
    } else {
      document.body.style.overflow = 'unset';
      setMounted(false);
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      error(t('simEnterCredentials'));
      return;
    }
    setLoginLoading(true);
    // Simulate login delay
    await new Promise(r => setTimeout(r, 800));
    setLoginLoading(false);
    setMounted(false);
    setTimeout(() => {
      setStep('consent');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setMounted(true));
      });
    }, 300);
  }, [username, password, error, t]);

  const handlePasskey = useCallback(() => {
    error(t('simPasskeyNotSupported'));
  }, [error, t]);

  const handleConsent = useCallback(async (approved: boolean) => {
    setConsentLoading(approved ? 'approve' : 'reject');
    await new Promise(r => setTimeout(r, 600));
    setConsentLoading(null);
    if (!approved) {
      setMounted(false);
      setTimeout(() => {
        setStep('denied');
        requestAnimationFrame(() => {
          requestAnimationFrame(() => setMounted(true));
        });
      }, 300);
      return;
    }
    setMounted(false);
    setTimeout(() => {
      setStep('success');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setMounted(true));
      });
    }, 300);
  }, []);

  const handleTryAgain = useCallback(() => {
    setMounted(false);
    setTimeout(() => {
      setStep('app');
      setUsername('');
      setPassword('');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setMounted(true));
      });
    }, 300);
  }, []);

  if (typeof document === 'undefined') return null;
  if (!isOpen) return null;

  const SCOPE_INFO = [
    { key: 'openid', label: t('simScopeIdentity'), desc: t('simScopeIdentityDesc'), icon: Fingerprint },
    { key: 'profile', label: t('simScopeProfile'), desc: t('simScopeProfileDesc'), icon: User },
    { key: 'email', label: t('simScopeEmail'), desc: t('simScopeEmailDesc'), icon: Mail },
  ];

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center p-4 min-h-screen" style={{ zIndex: 60 }}>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Browser window */}
      <div className="relative z-20 w-full max-w-6xl animate-zoom-in rounded-2xl shadow-2xl overflow-hidden bg-card border border-border flex flex-col max-h-[97vh]">
        {/* Title bar */}
        <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 bg-muted/80 border-b border-border shrink-0">
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="w-3 h-3 rounded-full bg-red-400 dark:bg-red-500/70" />
            <div className="w-3 h-3 rounded-full bg-yellow-400 dark:bg-yellow-500/70" />
            <div className="w-3 h-3 rounded-full bg-green-400 dark:bg-green-500/70" />
          </div>
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="flex items-center gap-2 bg-background/80 rounded-lg px-3 sm:px-4 py-1.5 text-xs text-text-tertiary border border-border/50 w-full max-w-md mx-auto">
              <svg className="w-3 h-3 text-text-quaternary shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              <span className="truncate">
                {step === 'app' && 'demo-app.example.com'}
                {step === 'login' && `${baseUrl.replace(/^https?:\/\//, '')}/auth/login`}
                {step === 'consent' && `${baseUrl.replace(/^https?:\/\//, '')}/oauth/consent`}
                {step === 'success' && 'demo-app.example.com/callback?code=sim_code'}
                {step === 'denied' && 'demo-app.example.com/callback?error=access_denied'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-text-quaternary hover:text-text-secondary p-1 rounded-md hover:bg-muted transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto">
          {step === 'app' && (
            <div className="relative min-h-[700px] bg-background overflow-hidden flex items-center justify-center">
              {/* Background */}
              <div className="absolute inset-0">
                <div
                  className="absolute w-[600px] h-[600px] rounded-full blur-[200px] opacity-20 dark:opacity-15"
                  style={{
                    background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)',
                    left: '30%',
                    top: '20%',
                    animation: 'float 10s ease-in-out infinite',
                  }}
                />
                <div
                  className="absolute inset-0 opacity-[0.03] dark:opacity-[0.04]"
                  style={{
                    backgroundImage: `linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)`,
                    backgroundSize: '60px 60px',
                  }}
                />
              </div>

              {/* Simulated third-party app */}
              <div
                className="relative z-10 text-center px-6"
                style={{
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? 'translateY(0)' : 'translateY(24px)',
                  transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.15s',
                }}
              >
                <div className="mb-8">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <span className="text-2xl text-white font-bold">D</span>
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">{t('simDemoApp')}</h2>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto">{t('simAppDesc')}</p>
                </div>

                <button
                  onClick={() => {
                    setMounted(false);
                    setTimeout(() => {
                      setStep('login');
                      requestAnimationFrame(() => {
                        requestAnimationFrame(() => setMounted(true));
                      });
                    }, 300);
                  }}
                  className="inline-flex items-center gap-3 px-6 py-3 bg-card border border-border rounded-xl text-foreground font-medium text-sm hover:bg-muted hover:border-border-strong hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
                >
                  <span className="text-lg">🌸</span>
                  <span>{t('simLoginWithSakura')}</span>
                </button>

                <p className="text-xs text-muted-foreground/50 mt-6">{t('simAppHint')}</p>
              </div>
            </div>
          )}

          {step === 'login' && (
            <div className="relative min-h-[700px] bg-background overflow-hidden flex items-center justify-center">
              {/* Background */}
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
                <SakuraPetal delay={0} left="10%" size={10} duration={14} />
                <SakuraPetal delay={3} left="25%" size={8} duration={16} />
                <SakuraPetal delay={6} left="42%" size={12} duration={13} />
                <SakuraPetal delay={2} left="60%" size={9} duration={15} />
                <SakuraPetal delay={8} left="78%" size={11} duration={14} />
                <SakuraPetal delay={5} left="92%" size={7} duration={17} />
              </div>

              {/* Nav bar */}
              <div
                className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-4"
                style={{
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? 'translateY(0)' : 'translateY(-8px)',
                  transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.05s',
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">🌸</span>
                  <span className="text-sm font-semibold text-foreground tracking-tight">{BRAND_NAME}</span>
                </div>
              </div>

              {/* Two-column layout */}
              <div className="relative z-10 w-full max-w-[960px] mx-auto px-6 flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
                {/* Left: Hero text */}
                <div
                  className="hidden lg:block flex-1 text-center lg:text-left"
                  style={{
                    opacity: mounted ? 1 : 0,
                    transform: mounted ? 'translateY(0)' : 'translateY(24px)',
                    transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.1s',
                  }}
                >
                  <h1 className="text-4xl lg:text-5xl font-light text-foreground leading-tight tracking-tight mb-4">
                    {t('simWelcomeTitle')}
                  </h1>
                  <p className="text-base text-muted-foreground leading-relaxed max-w-sm mx-auto lg:mx-0 mb-10">
                    {t('simWelcomeSubtitle')}
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

                {/* Right: Login card */}
                <div
                  className="w-full max-w-[400px]"
                  style={{
                    opacity: mounted ? 1 : 0,
                    transform: mounted ? 'translateY(0)' : 'translateY(24px)',
                    transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.25s',
                  }}
                >
                  <div className="bg-card/80 dark:bg-card/60 backdrop-blur-xl border border-border rounded-2xl p-8 shadow-lg shadow-black/[0.04] dark:shadow-black/20">
                    <div className="mb-7">
                      <h2 className="text-xl font-medium text-foreground mb-1">{t('simLogin')}</h2>
                      <p className="text-sm text-muted-foreground">{t('simLoginHint')}</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-5">
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-2 tracking-wide uppercase">{t('simUsernameOrEmail')}</label>
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
                          placeholder={t('simUsernameOrEmailPlaceholder')}
                          disabled={loginLoading}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-2 tracking-wide uppercase">{t('simPassword')}</label>
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
                          placeholder={t('simPasswordPlaceholder')}
                          disabled={loginLoading}
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={loginLoading}
                        className="w-full py-2.5 bg-accent-button text-white rounded-lg font-medium text-sm hover:bg-accent-button-hover transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                      >
                        {loginLoading && <Spinner className="h-4 w-4" />}
                        {loginLoading ? t('simLoggingIn') : t('simLogin')}
                      </button>
                    </form>

                    <div className="flex items-center gap-4 my-6">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-xs text-muted-foreground/60">{t('simOr')}</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>

                    <button
                      onClick={handlePasskey}
                      className="w-full py-2.5 bg-background border border-border-input hover:border-border-strong hover:bg-muted/50 text-foreground/70 hover:text-foreground rounded-lg text-sm transition-all duration-200 flex items-center justify-center gap-2"
                      disabled={loginLoading}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0110 0v4" />
                      </svg>
                      <span>{t('simUsePasskey')}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'consent' && (
            <div className="relative min-h-[700px] flex items-center justify-center bg-background overflow-hidden">
              {/* Background */}
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
                <SakuraPetal delay={0} left="8%" size={8} duration={14} />
                <SakuraPetal delay={2} left="25%" size={6} duration={16} />
                <SakuraPetal delay={5} left="45%" size={9} duration={12} />
                <SakuraPetal delay={3} left="65%" size={7} duration={15} />
                <SakuraPetal delay={7} left="85%" size={5} duration={13} />
              </div>

              {/* Nav */}
              <div
                className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-4"
                style={{
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? 'translateY(0)' : 'translateY(-8px)',
                  transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.05s',
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">🌸</span>
                  <span className="text-sm font-semibold text-foreground tracking-tight">{BRAND_NAME}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative w-8 h-8 rounded-full bg-accent-button/10 flex items-center justify-center text-accent-button font-semibold text-sm overflow-hidden shrink-0">
                    {(username || 'U').charAt(0).toUpperCase()
                    }
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-sm font-medium text-foreground">{username || 'User'}</p>
                    <p className="text-xs text-muted-foreground">{username || 'user'}@example.com</p>
                  </div>
                </div>
              </div>

              {/* Consent card */}
              <div
                className="relative z-10 w-full max-w-md mx-6"
                style={{
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? 'translateY(0)' : 'translateY(24px)',
                  transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.15s',
                }}
              >
                <div className="bg-card/50 dark:bg-card/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg shadow-black/[0.04] dark:shadow-black/20 overflow-hidden">
                  {/* Header */}
                  <div
                    className="px-7 pt-7 pb-5 text-center transition-all duration-700"
                    style={{
                      opacity: mounted ? 1 : 0,
                      transform: mounted ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.95)',
                      transitionDelay: '0.3s',
                    }}
                  >
                    <div className="relative w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 overflow-hidden bg-muted border border-border shadow-sm">
                      <div className="w-full h-full bg-accent-button/10 flex items-center justify-center">
                        <Shield className="w-6 h-6 text-accent-button" />
                      </div>
                    </div>
                    <h1 className="text-lg font-semibold text-foreground">{t('simConsentTitle')}</h1>
                    <p className="text-sm text-muted-foreground mt-1.5">
                      <span className="font-medium text-foreground">{t('simDemoApp')}</span> {t('simDemoAppDesc')}
                    </p>
                  </div>

                  {/* Scopes */}
                  <div
                    className="px-7 py-4 border-t border-border transition-all duration-700"
                    style={{
                      opacity: mounted ? 1 : 0,
                      transform: mounted ? 'translateY(0)' : 'translateY(12px)',
                      transitionDelay: '0.5s',
                    }}
                  >
                    <p className="text-xs font-medium text-muted-foreground mb-3 tracking-wide uppercase">{t('simRequestedPermissions')}</p>
                    <div className="space-y-3">
                      {SCOPE_INFO.map((s, i) => {
                        const Icon = s.icon;
                        return (
                          <div
                            key={s.key}
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
                              <p className="text-sm font-medium text-foreground">{s.label}</p>
                              <p className="text-xs text-muted-foreground">{s.desc}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Actions */}
                  <div
                    className="px-7 py-4 border-t border-border flex gap-3 transition-all duration-700"
                    style={{
                      opacity: mounted ? 1 : 0,
                      transform: mounted ? 'translateY(0)' : 'translateY(12px)',
                      transitionDelay: '0.8s',
                    }}
                  >
                    <button
                      onClick={() => handleConsent(false)}
                      disabled={!!consentLoading}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-muted-foreground bg-background border border-border rounded-xl hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
                    >
                      {consentLoading === 'reject' ? (
                        <Spinner className="h-4 w-4" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                      {consentLoading === 'reject' ? t('simProcessing') : t('simDeny')}
                    </button>
                    <button
                      onClick={() => handleConsent(true)}
                      disabled={!!consentLoading}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-accent-button rounded-xl hover:bg-accent-button-hover transition-colors disabled:opacity-50"
                    >
                      {consentLoading === 'approve' ? (
                        <Spinner className="h-4 w-4" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      {consentLoading === 'approve' ? t('simProcessing') : t('simAllow')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="relative min-h-[700px] flex items-center justify-center bg-background overflow-hidden">
              {/* Background */}
              <div className="absolute inset-0">
                <div
                  className="absolute w-[600px] h-[600px] rounded-full blur-[200px] opacity-30 dark:opacity-20"
                  style={{ background: 'radial-gradient(circle, var(--accent-button) 0%, transparent 70%)', left: '20%', top: '10%', animation: 'float 8s ease-in-out infinite' }}
                />
                <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.04]" style={{
                  backgroundImage: `linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)`,
                  backgroundSize: '60px 60px',
                }} />
              </div>

              <div
                className="relative z-10 w-full max-w-md mx-6"
                style={{
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.95)',
                  transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.15s',
                }}
              >
                <div className="bg-card/50 dark:bg-card/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg overflow-hidden">
                  {/* Success header */}
                  <div className="px-7 pt-7 pb-5 text-center">
                    <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                      <Check className="w-8 h-8 text-green-500" />
                    </div>
                    <h2 className="text-xl font-semibold text-foreground mb-1">{t('simSuccess')}</h2>
                    <p className="text-sm text-muted-foreground">{t('simDemoComplete')}</p>
                  </div>

                  {/* User info card */}
                  <div className="px-7 py-5 border-t border-border">
                    <p className="text-xs font-medium text-muted-foreground mb-3 tracking-wide uppercase">{t('simUserInfoTitle')}</p>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-full bg-accent-button/10 flex items-center justify-center text-accent-button font-bold text-lg shrink-0">
                        {(username || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-base font-semibold text-foreground">{username || 'User'}</p>
                        <p className="text-sm text-muted-foreground">{username || 'user'}@example.com</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {[
                        { label: 'sub', value: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
                        { label: 'name', value: username || 'User' },
                        { label: 'email', value: `${username || 'user'}@example.com` },
                        { label: 'email_verified', value: 'true' },
                        { label: 'picture', value: 'https://account.sakura.example.com/avatar/default.png' },
                      ].map((field) => (
                        <div key={field.label} className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground font-mono w-28 shrink-0">{field.label}</span>
                          <span className="text-foreground font-mono truncate">{field.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action */}
                  <div className="px-7 py-4 border-t border-border flex justify-center">
                    <button
                      onClick={handleTryAgain}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent-button text-white rounded-xl text-sm font-medium hover:bg-accent-button-hover transition-all duration-200"
                    >
                      <Play className="w-4 h-4" />
                      {t('simTryAgain')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'denied' && (
            <div className="relative min-h-[700px] flex items-center justify-center bg-background overflow-hidden">
              {/* Background */}
              <div className="absolute inset-0">
                <div
                  className="absolute w-[600px] h-[600px] rounded-full blur-[200px] opacity-20 dark:opacity-15"
                  style={{ background: 'radial-gradient(circle, #ef4444 0%, transparent 70%)', left: '30%', top: '20%', animation: 'float 10s ease-in-out infinite' }}
                />
                <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.04]" style={{
                  backgroundImage: `linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)`,
                  backgroundSize: '60px 60px',
                }} />
              </div>

              <div
                className="relative z-10 w-full max-w-md mx-6"
                style={{
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.95)',
                  transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.15s',
                }}
              >
                <div className="bg-card/50 dark:bg-card/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg overflow-hidden">
                  {/* Denied header */}
                  <div className="px-7 pt-7 pb-5 text-center">
                    <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                      <X className="w-8 h-8 text-red-500" />
                    </div>
                    <h2 className="text-xl font-semibold text-foreground mb-1">{t('simDenied')}</h2>
                    <p className="text-sm text-muted-foreground">{t('simDeniedDesc')}</p>
                  </div>

                  {/* Error info */}
                  <div className="px-7 py-5 border-t border-border">
                    <div className="rounded-xl bg-red-500/5 border border-red-500/10 p-4">
                      <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-2">{t('simErrorReturned')}</p>
                      <div className="space-y-1.5">
                        {[
                          { label: 'error', value: 'access_denied' },
                          { label: 'error_description', value: 'The user denied the authorization request' },
                        ].map((field) => (
                          <div key={field.label} className="flex items-start gap-2 text-xs">
                            <span className="text-muted-foreground font-mono w-32 shrink-0">{field.label}</span>
                            <span className="text-foreground font-mono">{field.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Action */}
                  <div className="px-7 py-4 border-t border-border flex justify-center">
                    <button
                      onClick={handleTryAgain}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent-button text-white rounded-xl text-sm font-medium hover:bg-accent-button-hover transition-all duration-200"
                    >
                      <Play className="w-4 h-4" />
                      {t('simTryAgain')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
