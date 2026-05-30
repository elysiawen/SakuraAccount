import Link from 'next/link';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { PublicNav } from '@/components/PublicNav';
import { SakuraPetal } from '@/components/SakuraPetal';
import { requireSession } from '@/lib/require-session';
import { BRAND_NAME } from '@/lib/constants';

export default async function Home() {
  const t = await getTranslations('common.home');
  const user = await requireSession();

  return (
    <main className="min-h-screen relative overflow-hidden bg-background">
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

        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />

        <SakuraPetal delay={0} left="8%" size={10} duration={14} />
        <SakuraPetal delay={3} left="20%" size={8} duration={16} />
        <SakuraPetal delay={6} left="35%" size={12} duration={12} />
        <SakuraPetal delay={2} left="50%" size={9} duration={15} />
        <SakuraPetal delay={8} left="65%" size={11} duration={13} />
        <SakuraPetal delay={4} left="78%" size={7} duration={17} />
        <SakuraPetal delay={10} left="90%" size={10} duration={14} />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        <div className="animate-slide-in-up" style={{ animationDelay: '0s' }}>
          <PublicNav
            extra={user && (
              <Link href="/dashboard" className="flex items-center gap-3">
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
              </Link>
            )}
          />
        </div>

        <div className="flex-1 flex items-center justify-center px-5 sm:px-8 md:px-16">
          <div className="max-w-4xl w-full">
            <div className="animate-slide-in-up" style={{ animationDelay: '0.25s' }}>
              <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-light text-foreground leading-[0.95] tracking-tight mb-2">
                {t('title1')}
              </h1>
              <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-light leading-[0.95] tracking-tight mb-6 sm:mb-8">
                <span className="text-foreground">{t('title2')}</span>
                <span className="text-muted-foreground/30 ml-2 sm:ml-4">{t('title3')}</span>
              </h1>
            </div>

            <p className="text-base md:text-lg text-muted-foreground max-w-lg mb-8 sm:mb-12 leading-relaxed animate-slide-in-up" style={{ animationDelay: '0.35s' }}>
              {t('subtitle')}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-12 sm:mb-20 animate-slide-in-up" style={{ animationDelay: '0.45s' }}>
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border rounded-xl overflow-hidden animate-slide-in-up" style={{ animationDelay: '0.55s' }}>
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
                  className="group bg-card hover:bg-muted/50 p-5 sm:p-6 md:p-8 transition-colors duration-300"
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

        <footer className="px-5 sm:px-8 md:px-16 py-6 flex items-center justify-between animate-slide-in-up" style={{ animationDelay: '0.7s' }}>
          <span className="text-xs text-muted-foreground/50">&copy; {new Date().getFullYear()} {BRAND_NAME}</span>
          <div className="flex items-center gap-1.5">
            <div className="w-1 h-1 rounded-full bg-emerald-500/60" />
            <span className="text-xs text-muted-foreground/50">v0.1.0</span>
          </div>
        </footer>
      </div>
    </main>
  );
}
