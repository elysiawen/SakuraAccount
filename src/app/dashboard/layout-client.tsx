'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useConfirm } from '@/components/ConfirmProvider';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import {
  LayoutDashboard,
  Link2,
  Smartphone,
  Settings,
  Shield,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

interface DashboardLayoutClientProps {
  children: React.ReactNode;
  username?: string;
  role?: string;
  nickname?: string;
  avatar?: string;
  sessionInvalid?: boolean;
}

export default function DashboardLayoutClient({
  children,
  username,
  role,
  nickname,
  avatar,
  sessionInvalid,
}: DashboardLayoutClientProps) {
  const pathname = usePathname();
  const { confirm } = useConfirm();
  const t = useTranslations('dashboard.nav');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (sessionInvalid) {
      window.location.href = '/auth/login';
    }
  }, [sessionInvalid]);

  // Periodic session validation — redirects to login if session is revoked
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        if (!data.user) {
          window.location.href = '/auth/login';
        }
      } catch {
        // Network error — don't redirect, just skip this check
      }
    };

    const interval = setInterval(checkSession, 5 * 60 * 1000); // every 5 minutes
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  if (sessionInvalid) return null;

  const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: t('overview') },
    { href: '/dashboard/authorized-apps', icon: Link2, label: t('authorizedApps') },
    { href: '/dashboard/sessions', icon: Smartphone, label: t('sessions') },
    { href: '/dashboard/settings', icon: Settings, label: t('settings') },
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  const handleLogout = async () => {
    confirm(t('logoutConfirm'), {
      confirmText: t('logoutConfirmBtn'),
      confirmColor: 'red',
      onConfirm: async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/';
      },
    });
  };

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="p-6 border-b">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-2xl">🌸</span>
          <div>
            <span className="text-xl font-bold tracking-tight text-text-primary">Sakura Account</span>
            <p className="text-xs text-text-tertiary mt-0.5">{t('brandSubtitle')}</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                active
                  ? 'bg-accent text-accent-foreground font-semibold shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t bg-muted/50 space-y-3">
        {/* Theme Toggle & Language Switcher */}
        <div className="flex justify-center gap-2">
          <ThemeToggle />
          <LanguageSwitcher />
        </div>

        {/* User Info */}
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-muted transition-colors"
        >
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm overflow-hidden">
            {avatar ? (
              <img src={avatar} alt="头像" className="w-full h-full object-cover" />
            ) : (
              (nickname || username || '').charAt(0).toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-text-primary truncate">{nickname || username}</div>
            <div className="text-xs text-text-tertiary truncate">{role === 'admin' ? t('admin') : t('user')}</div>
          </div>
        </Link>

        {/* Buttons */}
        {role === 'admin' && (
          <Link
            href="/admin"
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-accent-foreground bg-accent border border-accent/60 rounded-xl hover:bg-accent-foreground/10 hover:border-accent-foreground/30 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          >
            <Shield className="h-4 w-4" />
            {t('adminPanel')}
          </Link>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-destructive bg-card border border-border rounded-xl hover:bg-destructive/10 hover:border-destructive/30 hover:shadow-sm transition-all duration-200"
        >
          <LogOut className="h-4 w-4" />
          {t('logout')}
        </button>
      </div>
    </>
  );

  return (
    <div className="h-screen bg-muted flex overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex flex-col w-64 fixed inset-y-0 z-50 bg-card border-r">
        <SidebarContent />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-64 bg-card shadow-2xl flex flex-col">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:pl-64 h-full">
        {/* Mobile Header */}
        <div className="lg:hidden bg-card/80 backdrop-blur-md border-b border-border p-4 flex items-center sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 text-text-secondary hover:bg-muted rounded-lg"
          >
            <Menu className="h-6 w-6" />
          </button>
          <span className="font-bold text-text-primary text-lg ml-3">{t('brandName')}</span>
        </div>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto w-full">
          <div key={pathname} className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto animate-slide-in-up">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
