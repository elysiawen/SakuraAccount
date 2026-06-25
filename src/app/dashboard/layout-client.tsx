'use client';

import Link from 'next/link';
import { useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useConfirm } from '@/components/ConfirmProvider';
import SidebarShell from '@/components/SidebarShell';
import { PageLogger } from '@/components/Analytics';
import { NavLink } from '@/components/primitives';
import { UserProvider, useUser } from '@/components/avatar-context';
import { useSessionCheck } from '@/hooks/useSessionCheck';
import { LOGIN_PATH, BRAND_NAME } from '@/lib/constants';
import {
  LayoutDashboard,
  Link2,
  Smartphone,
  Settings,
  Shield,
  LogOut,
  Code2,
  FileText,
} from 'lucide-react';

// Re-export for settings page convenience
export { useUser as useDashboardUser } from '@/components/avatar-context';

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
  avatar: initialAvatar,
  sessionInvalid,
}: DashboardLayoutClientProps) {
  if (sessionInvalid) return null;

  return (
    <UserProvider initialAvatar={initialAvatar} initialNickname={nickname}>
      <DashboardShell username={username} role={role} sessionInvalid={sessionInvalid}>
        {children}
      </DashboardShell>
    </UserProvider>
  );
}

function DashboardShell({ children, username, role, sessionInvalid }: Omit<DashboardLayoutClientProps, 'avatar' | 'nickname'>) {
  const { confirm } = useConfirm();
  const t = useTranslations('dashboard.nav');
  const { avatar, nickname } = useUser();

  useEffect(() => {
    if (sessionInvalid) window.location.href = LOGIN_PATH;
  }, [sessionInvalid]);

  useSessionCheck();

  if (sessionInvalid) return null;

  const isDeveloperOrAdmin = role === 'admin' || role === 'developer';

  const handleLogout = async () => {
    confirm(t('logoutConfirm'), {
      confirmText: t('logoutConfirmBtn'),
      confirmColor: 'red',
      onConfirm: async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/auth/login';
      },
    });
  };

  const roleLabel = role === 'admin' ? t('admin') : role === 'developer' ? t('developer') : t('user');

  const nav = useMemo(() => (
    <>
      <div className="space-y-1">
        <p className="px-4 mb-1 text-[11px] font-medium text-text-quaternary uppercase tracking-wider">{t('sectionAccount')}</p>
        <NavLink href="/dashboard" icon={LayoutDashboard} label={t('overview')} exact />
      </div>
      <div className="space-y-1 pt-3 border-t border-border">
        <p className="px-4 mb-1 text-[11px] font-medium text-text-quaternary uppercase tracking-wider">{t('sectionSecurity')}</p>
        <NavLink href="/dashboard/authorized-apps" icon={Link2} label={t('authorizedApps')} />
        <NavLink href="/dashboard/sessions" icon={Smartphone} label={t('sessions')} />
      </div>
      {isDeveloperOrAdmin && (
        <div className="space-y-1 pt-3 border-t border-border">
          <p className="px-4 mb-1 text-[11px] font-medium text-text-quaternary uppercase tracking-wider">{t('sectionDeveloper')}</p>
          <NavLink href="/dashboard/applications" icon={Code2} label={t('applications')} exact />
          <NavLink href="/dashboard/applications/docs" icon={FileText} label={t('documentation')} />
        </div>
      )}
      <div className="pt-3 border-t border-border">
        <NavLink href="/dashboard/settings" icon={Settings} label={t('settings')} />
      </div>
    </>
  ), [t, isDeveloperOrAdmin]);

  const footer = useMemo(() => (
    <>
      {role === 'admin' && (
        <Link href="/admin" className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-accent-foreground bg-accent border border-accent/60 rounded-xl hover:bg-accent-foreground/10 hover:border-accent-foreground/30 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200">
          <Shield className="h-4 w-4" />
          {t('adminPanel')}
        </Link>
      )}
      <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-destructive bg-card border border-border rounded-xl hover:bg-destructive/10 hover:border-destructive/30 hover:shadow-sm transition-all duration-200">
        <LogOut className="h-4 w-4" />
        {t('logout')}
      </button>
    </>
  ), [role, t, handleLogout]);

  const logo = useMemo(() => (
    <Link href="/dashboard" className="flex items-center gap-2">
      <span className="text-2xl">🌸</span>
      <div>
        <span className="text-xl font-bold tracking-tight text-text-primary">{BRAND_NAME}</span>
        <p className="text-xs text-text-tertiary mt-0.5">{t('brandSubtitle')}</p>
      </div>
    </Link>
  ), [t]);

  const user = useMemo(() => ({
    name: nickname || username || '',
    role: roleLabel,
    avatar: avatar ?? undefined,
    href: '/dashboard/settings',
  }), [nickname, username, roleLabel, avatar]);

  return (
    <SidebarShell breakpoint="lg" headerTitle={t('brandName')} logo={logo} user={user} nav={nav} footer={footer}>
      <PageLogger />
      {children}
    </SidebarShell>
  );
}
