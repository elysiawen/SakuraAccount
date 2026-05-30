'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useConfirm } from '@/components/ConfirmProvider';
import SidebarShell from '@/components/SidebarShell';
import PageLogger from '@/components/PageLogger';
import {
  LayoutDashboard,
  Link2,
  Smartphone,
  Settings,
  Shield,
  LogOut,
  Code2,
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
  const { confirm } = useConfirm();
  const t = useTranslations('dashboard.nav');

  useEffect(() => {
    if (sessionInvalid) {
      window.location.href = '/auth/login';
    }
  }, [sessionInvalid]);

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

    const interval = setInterval(checkSession, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (sessionInvalid) return null;

  const isDeveloperOrAdmin = role === 'admin' || role === 'developer';

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

  const roleLabel = role === 'admin' ? t('admin') : role === 'developer' ? t('developer') : t('user');

  const nav = (
    <>
      {/* Account */}
      <div className="space-y-1">
        <p className="px-4 mb-1 text-[11px] font-medium text-text-quaternary uppercase tracking-wider">{t('sectionAccount')}</p>
        <NavLink href="/dashboard" icon={LayoutDashboard} label={t('overview')} />
      </div>

      {/* Security */}
      <div className="space-y-1 pt-3 border-t border-border">
        <p className="px-4 mb-1 text-[11px] font-medium text-text-quaternary uppercase tracking-wider">{t('sectionSecurity')}</p>
        <NavLink href="/dashboard/authorized-apps" icon={Link2} label={t('authorizedApps')} />
        <NavLink href="/dashboard/sessions" icon={Smartphone} label={t('sessions')} />
      </div>

      {/* Developer */}
      {isDeveloperOrAdmin && (
        <div className="space-y-1 pt-3 border-t border-border">
          <p className="px-4 mb-1 text-[11px] font-medium text-text-quaternary uppercase tracking-wider">{t('sectionDeveloper')}</p>
          <NavLink href="/dashboard/applications" icon={Code2} label={t('applications')} />
        </div>
      )}

      {/* Settings */}
      <div className="pt-3 border-t border-border">
        <NavLink href="/dashboard/settings" icon={Settings} label={t('settings')} />
      </div>
    </>
  );

  const footer = (
    <>
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
    </>
  );

  return (
    <SidebarShell
      breakpoint="lg"
      headerTitle={t('brandName')}
      logo={
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-2xl">🌸</span>
          <div>
            <span className="text-xl font-bold tracking-tight text-text-primary">Sakura Account</span>
            <p className="text-xs text-text-tertiary mt-0.5">{t('brandSubtitle')}</p>
          </div>
        </Link>
      }
      user={{
        name: nickname || username || '',
        role: roleLabel,
        avatar,
        href: '/dashboard/settings',
      }}
      nav={nav}
      footer={footer}
    >
      <PageLogger />
      {children}
    </SidebarShell>
  );
}

function NavLink({ href, icon: Icon, label }: { href: string; icon: any; label: string }) {
  const pathname = usePathname();
  const active = href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
        active
          ? 'bg-accent text-accent-foreground font-semibold shadow-sm'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </Link>
  );
}
