'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/components/ToastProvider';

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
      <svg width={size} height={size} viewBox="0 0 12 12" fill="none" style={{ opacity: 0.25 }}>
        <path
          d="M6 0C6 0 8 3 10 5C12 7 10 10 8 11C6 12 4 10 2 8C0 6 2 3 4 1.5C5 0.5 6 0 6 0Z"
          fill="currentColor"
          className="text-pink-400"
        />
      </svg>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { success, error } = useToast();
  const callbackUrl = searchParams.get('callbackUrl');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    fetch('/api/auth/session').then(res => res.json()).then(data => {
      if (data.user) {
        router.push(callbackUrl || '/dashboard');
      }
    });
  }, [router, callbackUrl]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      error('请输入用户名和密码');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (response.ok) {
        success('登录成功');
        router.push(callbackUrl || '/dashboard');
      } else {
        error(data.error || '登录失败');
      }
    } catch {
      error('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [username, password, callbackUrl, router, success, error]);

  const handlePasskeyLogin = useCallback(async () => {
    try {
      const { startAuthentication } = await import('@simplewebauthn/browser');
      const optionsRes = await fetch('/api/auth/webauthn/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate' }),
      });
      const { options } = await optionsRes.json();
      const response = await startAuthentication({ optionsJSON: options });
      const verifyRes = await fetch('/api/auth/webauthn/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', response, challenge: options.challenge }),
      });
      const data = await verifyRes.json();
      if (data.verified) {
        success('登录成功');
        router.push(callbackUrl || '/dashboard');
      } else {
        error('Passkey 认证失败');
      }
    } catch (err: any) {
      if (err.name !== 'NotAllowedError') {
        error('Passkey 登录失败');
      }
    }
  }, [callbackUrl, router, success, error]);

  return (
    <>
      <style jsx global>{`
        @keyframes petalFall {
          0% { transform: translateY(-20px) rotate(0deg) translateX(0); opacity: 0; }
          10% { opacity: 0.6; }
          90% { opacity: 0.3; }
          100% { transform: translateY(100vh) rotate(360deg) translateX(50px); opacity: 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}</style>

      <main className="min-h-screen relative overflow-hidden flex items-center justify-center bg-background">
        {/* Ambient background */}
        <div className="absolute inset-0">
          {/* Gradient orbs */}
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

          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.04]" style={{
            backgroundImage: `linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }} />

          {/* Sakura petals */}
          <SakuraPetal delay={0} left="8%" size={10} duration={14} />
          <SakuraPetal delay={3} left="22%" size={8} duration={16} />
          <SakuraPetal delay={6} left="40%" size={12} duration={13} />
          <SakuraPetal delay={2} left="58%" size={9} duration={15} />
          <SakuraPetal delay={8} left="72%" size={11} duration={14} />
          <SakuraPetal delay={5} left="88%" size={7} duration={17} />
        </div>

        {/* Content */}
        <div className="relative z-10 w-full max-w-[960px] mx-auto px-6 py-12 flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
          {/* Left — branding */}
          <div
            className="flex-1 text-center lg:text-left"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(20px)',
              transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.1s',
            }}
          >
            <Link href="/" className="inline-flex items-center gap-2.5 mb-10">
              <img src="/sakura.ico" alt="Sakura" className="w-8 h-8" />
              <span className="text-base font-semibold text-foreground tracking-tight">Sakura Account</span>
            </Link>

            <h1 className="text-4xl lg:text-5xl font-light text-foreground leading-tight tracking-tight mb-4">
              欢迎回来
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed max-w-sm mx-auto lg:mx-0 mb-10">
              登录您的账户，继续管理身份认证与应用接入。
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

          {/* Right — form card */}
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
                <h2 className="text-xl font-medium text-foreground mb-1">登录</h2>
                <p className="text-sm text-muted-foreground">请输入您的账户信息</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-2 tracking-wide uppercase">用户名或邮箱</label>
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
                    placeholder="请输入用户名或邮箱"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-2 tracking-wide uppercase">密码</label>
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
                    placeholder="请输入密码"
                    disabled={loading}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-accent-button text-white rounded-lg font-medium text-sm hover:bg-accent-button-hover transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                >
                  {loading && (
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  {loading ? '登录中...' : '登录'}
                </button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground/60">或</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Passkey */}
              <button
                onClick={handlePasskeyLogin}
                className="w-full py-2.5 bg-background border border-border-input hover:border-border-strong hover:bg-muted/50 text-foreground/70 hover:text-foreground rounded-lg text-sm transition-all duration-200 flex items-center justify-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
                <span>使用 Passkey 登录</span>
              </button>

              {/* Register link */}
              <p className="text-center text-sm text-muted-foreground mt-7">
                还没有账号？{' '}
                <Link href="/auth/register" className="text-accent-button hover:text-accent-button-hover transition-colors font-medium">
                  注册账号
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
