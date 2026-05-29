'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';

function SakuraPetal({ delay, left, duration }: { delay: number; left: string; duration: number }) {
  return (
    <div
      className="absolute top-0 pointer-events-none"
      style={{
        left,
        animation: `petalFall ${duration}s linear ${delay}s infinite`,
      }}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ opacity: 0.4 }}>
        <path
          d="M6 0C6 0 8 3 10 5C12 7 10 10 8 11C6 12 4 10 2 8C0 6 2 3 4 1.5C5 0.5 6 0 6 0Z"
          fill="currentColor"
          className="text-pink-400/60"
        />
      </svg>
    </div>
  );
}

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

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  if (!mounted) {
    return (
      <main className="min-h-screen bg-[#08090d]" />
    );
  }

  return (
    <>
      <style jsx global>{`
        @keyframes petalFall {
          0% { transform: translateY(-20px) rotate(0deg) translateX(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(100vh) rotate(360deg) translateX(40px); opacity: 0; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes glow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideRight {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

      <main ref={containerRef} className="min-h-screen relative overflow-hidden" style={{ background: '#08090d' }}>
        {/* Ambient background */}
        <div className="absolute inset-0">
          {/* Subtle gradient orbs */}
          <div
            className="absolute w-[600px] h-[600px] rounded-full blur-[180px] transition-transform duration-[2000ms] ease-out"
            style={{
              background: 'radial-gradient(circle, rgba(244,114,182,0.08) 0%, transparent 70%)',
              left: `${30 + mousePos.x * 10}%`,
              top: `${20 + mousePos.y * 10}%`,
              transform: 'translate(-50%, -50%)',
            }}
          />
          <div
            className="absolute w-[500px] h-[500px] rounded-full blur-[160px] transition-transform duration-[2000ms] ease-out"
            style={{
              background: 'radial-gradient(circle, rgba(56,189,248,0.05) 0%, transparent 70%)',
              right: `${10 + (1 - mousePos.x) * 8}%`,
              bottom: `${20 + (1 - mousePos.y) * 8}%`,
            }}
          />

          {/* Grid lines */}
          <GridLine orientation="v" position="25%" />
          <GridLine orientation="v" position="50%" />
          <GridLine orientation="v" position="75%" />
          <GridLine orientation="h" position="33%" />
          <GridLine orientation="h" position="66%" />

          {/* Noise texture overlay */}
          <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")` }} />

          {/* Floating sakura petals */}
          <SakuraPetal delay={0} left="10%" duration={12} />
          <SakuraPetal delay={3} left="25%" duration={15} />
          <SakuraPetal delay={6} left="45%" duration={11} />
          <SakuraPetal delay={2} left="65%" duration={14} />
          <SakuraPetal delay={8} left="80%" duration={13} />
          <SakuraPetal delay={4} left="90%" duration={16} />
          <SakuraPetal delay={10} left="35%" duration={12} />
          <SakuraPetal delay={7} left="55%" duration={15} />
        </div>

        {/* Content */}
        <div className="relative z-10 min-h-screen flex flex-col">
          {/* Nav */}
          <nav className="flex items-center justify-between px-8 md:px-16 py-6" style={{ animation: 'fadeIn 0.8s ease-out' }}>
            <div className="flex items-center gap-3">
              <img src="/sakura.ico" alt="Sakura" className="w-7 h-7" />
              <span className="text-sm font-medium text-white/80 tracking-wide">Sakura Account</span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/auth/login"
                className="text-sm text-white/50 hover:text-white/80 transition-colors px-4 py-2"
              >
                登录
              </Link>
              <Link
                href="/auth/register"
                className="text-sm text-white/90 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] rounded-lg px-4 py-2 transition-all"
              >
                注册
              </Link>
            </div>
          </nav>

          {/* Hero */}
          <div className="flex-1 flex items-center justify-center px-8 md:px-16">
            <div className="max-w-4xl w-full">
              {/* Status badge */}
              <div
                className="flex items-center gap-2 mb-8"
                style={{ animation: 'slideUp 0.6s ease-out 0.2s both' }}
              >
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06]">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ animation: 'glow 2s ease-in-out infinite' }} />
                  <span className="text-xs text-white/40 tracking-wider uppercase">系统运行中</span>
                </div>
              </div>

              {/* Heading */}
              <div style={{ animation: 'slideUp 0.6s ease-out 0.3s both' }}>
                <h1 className="text-5xl md:text-7xl lg:text-8xl font-light text-white leading-[0.95] tracking-tight mb-2">
                  统一身份
                </h1>
                <h1 className="text-5xl md:text-7xl lg:text-8xl font-light leading-[0.95] tracking-tight mb-8">
                  <span className="text-white">认证</span>
                  <span className="text-white/20 ml-4">平台</span>
                </h1>
              </div>

              {/* Subtitle */}
              <p
                className="text-base md:text-lg text-white/30 max-w-lg mb-12 leading-relaxed"
                style={{ animation: 'slideUp 0.6s ease-out 0.4s both' }}
              >
                安全、可扩展的身份认证基础设施。
                <br />
                为您的应用提供企业级认证能力。
              </p>

              {/* CTA */}
              <div
                className="flex flex-col sm:flex-row gap-3 mb-20"
                style={{ animation: 'slideUp 0.6s ease-out 0.5s both' }}
              >
                <Link
                  href="/auth/register"
                  className="group relative inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-white text-[#08090d] rounded-lg font-medium text-sm hover:bg-white/90 transition-all duration-300 overflow-hidden"
                >
                  <span className="relative z-10">开始使用</span>
                  <svg className="relative z-10 w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <Link
                  href="/auth/login"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 text-white/60 hover:text-white/80 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.1] rounded-lg text-sm transition-all duration-300"
                >
                  登录账户
                </Link>
              </div>

              {/* Features */}
              <div
                className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/[0.04] rounded-xl overflow-hidden"
                style={{ animation: 'slideUp 0.6s ease-out 0.6s both' }}
              >
                {[
                  {
                    icon: (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0110 0v4" />
                      </svg>
                    ),
                    title: 'Passkey / WebAuthn',
                    desc: '无密码认证，基于 FIDO2 标准',
                  },
                  {
                    icon: (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M12 2L2 7l10 5 10-5-10-5z" />
                        <path d="M2 17l10 5 10-5" />
                        <path d="M2 12l10 5 10-5" />
                      </svg>
                    ),
                    title: 'OAuth 2.0 / OIDC',
                    desc: '标准授权协议，支持第三方接入',
                  },
                  {
                    icon: (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        <path d="M9 12l2 2 4-4" />
                      </svg>
                    ),
                    title: '安全审计',
                    desc: '完整的操作日志与设备管理',
                  },
                ].map((feature, i) => (
                  <div
                    key={i}
                    className="group bg-[#08090d] p-6 md:p-8 hover:bg-white/[0.02] transition-colors duration-500"
                    style={{ animation: `slideUp 0.5s ease-out ${0.7 + i * 0.1}s both` }}
                  >
                    <div className="text-white/20 group-hover:text-pink-400/40 transition-colors duration-500 mb-4">
                      {feature.icon}
                    </div>
                    <h3 className="text-sm font-medium text-white/70 mb-1.5">{feature.title}</h3>
                    <p className="text-xs text-white/25 leading-relaxed">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer className="px-8 md:px-16 py-6 flex items-center justify-between" style={{ animation: 'fadeIn 1s ease-out 1s both' }}>
            <span className="text-xs text-white/15">&copy; {new Date().getFullYear()} Sakura Account</span>
            <div className="flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-emerald-500/50" />
              <span className="text-xs text-white/15">v0.1.0</span>
            </div>
          </footer>
        </div>
      </main>
    </>
  );
}
