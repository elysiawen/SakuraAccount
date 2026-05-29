'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ToastProvider';

function GridLine({ orientation, position }: { orientation: 'h' | 'v'; position: string }) {
  return (
    <div
      className="absolute pointer-events-none"
      style={
        orientation === 'v'
          ? { left: position, top: 0, bottom: 0, width: '1px', background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.03) 30%, rgba(255,255,255,0.03) 70%, transparent)' }
          : { top: position, left: 0, right: 0, height: '1px', background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.03) 30%, rgba(255,255,255,0.03) 70%, transparent)' }
      }
    />
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const { success, error } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const [mounted, setMounted] = useState(false);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    fetch('/api/auth/session').then(res => res.json()).then(data => {
      if (data.user) {
        router.push('/dashboard');
      }
    });
  }, [router]);

  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setMousePos({
          x: (e.clientX - rect.left) / rect.width,
          y: (e.clientY - rect.top) / rect.height,
        });
      }
    };
    window.addEventListener('mousemove', handleMouse);
    return () => window.removeEventListener('mousemove', handleMouse);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !email || !password) {
      error('请填写所有必填字段');
      return;
    }

    if (password !== confirmPassword) {
      error('两次输入的密码不一致');
      return;
    }

    if (password.length < 8) {
      error('密码长度至少8位');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, nickname: nickname || username }),
      });

      const data = await response.json();

      if (response.ok) {
        success('注册成功');
        router.push('/dashboard');
      } else {
        error(data.error || '注册失败');
      }
    } catch {
      error('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideRight { from { opacity: 0; transform: translateX(-12px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>

      <main ref={containerRef} className="min-h-screen relative overflow-hidden flex" style={{ background: '#08090d' }}>
        {/* Background */}
        <div className="absolute inset-0">
          <div
            className="absolute w-[500px] h-[500px] rounded-full blur-[180px] transition-transform duration-[2000ms] ease-out"
            style={{
              background: 'radial-gradient(circle, rgba(244,114,182,0.06) 0%, transparent 70%)',
              left: `${40 + mousePos.x * 8}%`,
              top: `${30 + mousePos.y * 8}%`,
              transform: 'translate(-50%, -50%)',
            }}
          />
          <div
            className="absolute w-[400px] h-[400px] rounded-full blur-[140px] transition-transform duration-[2000ms] ease-out"
            style={{
              background: 'radial-gradient(circle, rgba(56,189,248,0.04) 0%, transparent 70%)',
              right: `${10 + (1 - mousePos.x) * 6}%`,
              bottom: `${10 + (1 - mousePos.y) * 6}%`,
            }}
          />
          <GridLine orientation="v" position="33%" />
          <GridLine orientation="v" position="66%" />
          <GridLine orientation="h" position="50%" />
          <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")` }} />
        </div>

        {/* Left side — branding */}
        <div className="hidden lg:flex flex-1 flex-col justify-between p-16 relative z-10">
          <div style={{ animation: mounted ? 'slideRight 0.6s ease-out 0.2s both' : 'none' }}>
            <Link href="/" className="flex items-center gap-3">
              <img src="/sakura.ico" alt="Sakura" className="w-7 h-7" />
              <span className="text-sm font-medium text-white/80 tracking-wide">Sakura Account</span>
            </Link>
          </div>

          <div style={{ animation: mounted ? 'slideRight 0.6s ease-out 0.4s both' : 'none' }}>
            <h1 className="text-4xl xl:text-5xl font-light text-white leading-tight tracking-tight mb-6">
              创建账户
            </h1>
            <p className="text-sm text-white/25 leading-relaxed max-w-sm">
              注册 Sakura Account，获取统一身份认证能力。
            </p>
          </div>

          <div className="space-y-3" style={{ animation: mounted ? 'fadeIn 0.6s ease-out 0.8s both' : 'none' }}>
            {[
              '支持 Passkey 无密码登录',
              'OAuth 2.0 / OIDC 标准协议',
              '完整的安全审计日志',
            ].map((text, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-1 h-1 rounded-full bg-pink-400/30" />
                <span className="text-xs text-white/20">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="hidden lg:block w-px bg-white/[0.04]" />

        {/* Right side — form */}
        <div className="flex-1 flex items-center justify-center p-8 relative z-10">
          <div className="w-full max-w-sm">
            {/* Mobile logo */}
            <div className="lg:hidden mb-8" style={{ animation: mounted ? 'slideUp 0.5s ease-out 0.1s both' : 'none' }}>
              <Link href="/" className="flex items-center gap-3 mb-6">
                <img src="/sakura.ico" alt="Sakura" className="w-7 h-7" />
                <span className="text-sm font-medium text-white/80 tracking-wide">Sakura Account</span>
              </Link>
            </div>

            {/* Form header */}
            <div className="mb-8" style={{ animation: mounted ? 'slideUp 0.5s ease-out 0.2s both' : 'none' }}>
              <h2 className="text-xl font-light text-white mb-1.5">注册</h2>
              <p className="text-sm text-white/25">创建您的新账户</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4" style={{ animation: mounted ? 'slideUp 0.5s ease-out 0.3s both' : 'none' }}>
              <div>
                <label className="block text-xs text-white/30 mb-2 tracking-wider uppercase">用户名 <span className="text-pink-400/50">*</span></label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-lg text-sm text-white placeholder-white/15 focus:outline-none focus:border-white/[0.12] focus:bg-white/[0.04] transition-all"
                  placeholder="请输入用户名"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-xs text-white/30 mb-2 tracking-wider uppercase">邮箱 <span className="text-pink-400/50">*</span></label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-lg text-sm text-white placeholder-white/15 focus:outline-none focus:border-white/[0.12] focus:bg-white/[0.04] transition-all"
                  placeholder="请输入邮箱"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-xs text-white/30 mb-2 tracking-wider uppercase">昵称</label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-lg text-sm text-white placeholder-white/15 focus:outline-none focus:border-white/[0.12] focus:bg-white/[0.04] transition-all"
                  placeholder="选填，默认使用用户名"
                  disabled={loading}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-white/30 mb-2 tracking-wider uppercase">密码 <span className="text-pink-400/50">*</span></label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-lg text-sm text-white placeholder-white/15 focus:outline-none focus:border-white/[0.12] focus:bg-white/[0.04] transition-all"
                    placeholder="至少8位"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/30 mb-2 tracking-wider uppercase">确认密码 <span className="text-pink-400/50">*</span></label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-lg text-sm text-white placeholder-white/15 focus:outline-none focus:border-white/[0.12] focus:bg-white/[0.04] transition-all"
                    placeholder="再次输入"
                    disabled={loading}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-white text-[#08090d] rounded-lg font-medium text-sm hover:bg-white/90 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
              >
                {loading && (
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {loading ? '注册中...' : '创建账户'}
              </button>
            </form>

            {/* Login link */}
            <p
              className="text-center text-sm text-white/20 mt-8"
              style={{ animation: mounted ? 'fadeIn 0.5s ease-out 0.6s both' : 'none' }}
            >
              已有账号？{' '}
              <Link href="/auth/login" className="text-white/50 hover:text-white/70 transition-colors">
                登录
              </Link>
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
