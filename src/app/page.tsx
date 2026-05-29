'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PublicNav } from '@/components/PublicNav';

function SakuraPetal({ delay, left, size, duration }: { delay: number; left: string; size: number; duration: number }) {
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left,
        top: '-20px',
        animation: `petalFall ${duration}s linear ${delay}s infinite`,
      }}
    >
      <svg width={size} height={size} viewBox="0 0 12 12" fill="none" style={{ opacity: 0.3 }}>
        <path
          d="M6 0C6 0 8 3 10 5C12 7 10 10 8 11C6 12 4 10 2 8C0 6 2 3 4 1.5C5 0.5 6 0 6 0Z"
          fill="currentColor"
          className="text-pink-400"
        />
      </svg>
    </div>
  );
}

export default function Home() {
  const t = useTranslations('common.home');
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    fetch('/api/auth/session').then(res => res.json()).then(data => {
      if (data.user) setUser(data.user);
    }).catch(() => {});
  }, []);

  const fadeUp = (delay: number) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? 'translateY(0)' : 'translateY(24px)',
    transition: `all 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s`,
  });

  if (!mounted) {
    return <main className="min-h-screen bg-background" />;
  }

  return (
    <>
      <style jsx global>{`
        @keyframes petalFall {
          0% { transform: translateY(-20px) rotate(0deg) translateX(0); opacity: 0; }
          10% { opacity: 0.6; }
          90% { opacity: 0.3; }
          100% { transform: translateY(100vh) rotate(360deg) translateX(50px); opacity: 0; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>

      <main className="min-h-screen relative overflow-hidden bg-background">
        {/* Ambient background */}
        <div className="absolute inset-0">
          <div
            className="absolute w-[600px] h-[600px] rounded-full blur-[200px] opacity-30 dark:opacity-20"
            style={{
              background: 'radial-gradient(circle, var(--accent-button) 0%, transparent 70%)',
              left: '15%',
              top: '10%',
              animation: 'float 9s ease-in-out infinite',
            }}
          />
          <div
            className="absolute w-[500px] h-[500px] rounded-full blur-[180px] opacity-20 dark:opacity-15"
            style={{
              background: 'radial-gradient(circle, #f472b6 0%, transparent 70%)',
              right: '5%',
              bottom: '10%',
              animation: 'float 11s ease-in-out 2s infinite',
            }}
          />

          <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.04]" style={{
            backgroundImage: `linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }} />

          <SakuraPetal delay={0} left="8%" size={10} duration={14} />
          <SakuraPetal delay={3} left="20%" size={8} duration={16} />
          <SakuraPetal delay={6} left="35%" size={12} duration={12} />
          <SakuraPetal delay={2} left="50%" size={9} duration={15} />
          <SakuraPetal delay={8} left="65%" size={11} duration={13} />
          <SakuraPetal delay={4} left="78%" size={7} duration={17} />
          <SakuraPetal delay={10} left="90%" size={10} duration={14} />
        </div>

        {/* Content */}
        <div className="relative z-10 min-h-screen flex flex-col">
          {/* Nav */}
          <div style={fadeUp(0)}>
            <PublicNav
              extra={user && (
                <Link href="/dashboard" className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-accent-button/10 flex items-center justify-center text-accent-button font-semibold text-sm overflow-hidden shrink-0">
                    {user.avatar ? (
                      <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      (user.nickname || user.username || '').charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-sm font-medium text-foreground">{user.nickname || user.username}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </Link>
              )}
            />
          </div>

          {/* Hero */}
          <div className="flex-1 flex items-center justify-center px-8 md:px-16">
            <div className="max-w-4xl w-full">
              {/* Status badge */}
              <div className="flex items-center gap-2 mb-8" style={fadeUp(0.15)}>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/80 border border-border">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" style={{ animation: 'pulse 2s ease-in-out infinite' }} />
                  <span className="text-xs text-muted-foreground tracking-wide">{t('systemRunning')}</span>
                </div>
              </div>

              {/* Heading */}
              <div style={fadeUp(0.25)}>
                <h1 className="text-5xl md:text-7xl lg:text-8xl font-light text-foreground leading-[0.95] tracking-tight mb-2">
                  {t('title1')}
                </h1>
                <h1 className="text-5xl md:text-7xl lg:text-8xl font-light leading-[0.95] tracking-tight mb-8">
                  <span className="text-foreground">{t('title2')}</span>
                  <span className="text-muted-foreground/30 ml-4">{t('title3')}</span>
                </h1>
              </div>

              {/* Subtitle */}
              <p className="text-base md:text-lg text-muted-foreground max-w-lg mb-12 leading-relaxed" style={fadeUp(0.35)}>
                {t('subtitle')}
              </p>

              {/* CTA */}
              <div className="flex flex-col sm:flex-row gap-3 mb-20" style={fadeUp(0.45)}>
                {user ? (
                  <Link
                    href="/dashboard"
                    className="group inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-accent-button text-white rounded-lg font-medium text-sm hover:bg-accent-button-hover transition-all duration-200"
                  >
                    <span>{t('enterConsole')}</span>
                    <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/auth/register"
                      className="group inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-accent-button text-white rounded-lg font-medium text-sm hover:bg-accent-button-hover transition-all duration-200"
                    >
                      <span>{t('getStarted')}</span>
                      <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </Link>
                    <Link
                      href="/auth/login"
                      className="inline-flex items-center justify-center gap-2 px-8 py-3.5 text-muted-foreground hover:text-foreground bg-card/60 hover:bg-card border border-border hover:border-border-strong rounded-lg text-sm transition-all duration-200"
                    >
                      {t('loginAccount')}
                    </Link>
                  </>
                )}
              </div>

              {/* Features */}
              <div
                className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border rounded-xl overflow-hidden"
                style={fadeUp(0.55)}
              >
                {[
                  {
                    icon: (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0110 0v4" />
                      </svg>
                    ),
                    title: t('featurePasskey'),
                    desc: t('featurePasskeyDesc'),
                  },
                  {
                    icon: (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2L2 7l10 5 10-5-10-5z" />
                        <path d="M2 17l10 5 10-5" />
                        <path d="M2 12l10 5 10-5" />
                      </svg>
                    ),
                    title: t('featureOAuth'),
                    desc: t('featureOAuthDesc'),
                  },
                  {
                    icon: (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        <path d="M9 12l2 2 4-4" />
                      </svg>
                    ),
                    title: t('featureAudit'),
                    desc: t('featureAuditDesc'),
                  },
                ].map((feature, i) => (
                  <div
                    key={i}
                    className="group bg-card hover:bg-muted/50 p-6 md:p-8 transition-colors duration-300"
                  >
                    <div className="text-muted-foreground/50 group-hover:text-accent-button transition-colors duration-300 mb-4">
                      {feature.icon}
                    </div>
                    <h3 className="text-sm font-medium text-foreground mb-1.5">{feature.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer className="px-8 md:px-16 py-6 flex items-center justify-between" style={fadeUp(0.7)}>
            <span className="text-xs text-muted-foreground/50">&copy; {new Date().getFullYear()} Sakura Account</span>
            <div className="flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-emerald-500/60" />
              <span className="text-xs text-muted-foreground/50">v0.1.0</span>
            </div>
          </footer>
        </div>
      </main>
    </>
  );
}
