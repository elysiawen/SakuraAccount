'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import SidebarShell from '@/components/SidebarShell';
import { PageLogger } from '@/components/Analytics';
import { NavLink } from '@/components/primitives';
import { UserProvider, useUser } from '@/components/avatar-context';
import { useSessionCheck } from '@/hooks/useSessionCheck';
import { LOGIN_PATH } from '@/lib/constants';
import {
  LayoutDashboard,
  Users,
  Link2,
  FileText,
  Settings,
  Monitor,
  ArrowLeft,
} from 'lucide-react';

// Re-export for admin users page convenience
export { useUser as useAdminUser } from '@/components/avatar-context';

function AdminNav() {
  const t = useTranslations('admin.nav');
  return (
    <>
      <div className="space-y-1">
        <NavLink href="/admin" icon={LayoutDashboard} label={t('overview')} exact />
      </div>
      <div className="space-y-1 pt-3 border-t border-border">
        <p className="px-4 mb-1 text-[11px] font-medium text-text-quaternary uppercase tracking-wider">{t('sectionManagement')}</p>
        <NavLink href="/admin/users" icon={Users} label={t('users')} />
        <NavLink href="/admin/applications" icon={Link2} label={t('applications')} />
        <NavLink href="/admin/sessions" icon={Monitor} label={t('sessions')} />
      </div>
      <div className="space-y-1 pt-3 border-t border-border">
        <NavLink href="/admin/audit-logs" icon={FileText} label={t('auditLogs')} />
        <NavLink href="/admin/settings" icon={Settings} label={t('settings')} />
      </div>
    </>
  );
}

export default function AdminShell({
  children,
  username,
  nickname,
  avatar: initialAvatar,
  nickname: initialNickname,
  sessionInvalid,
}: {
  children: React.ReactNode;
  username?: string;
  nickname?: string;
  avatar?: string;
  sessionInvalid?: boolean;
}) {
  if (sessionInvalid) return null;

  return (
    <UserProvider initialAvatar={initialAvatar} initialNickname={initialNickname}>
      <AdminShellInner username={username} sessionInvalid={sessionInvalid}>
        {children}
      </AdminShellInner>
    </UserProvider>
  );
}

function AdminShellInner({ children, username, sessionInvalid }: { children: React.ReactNode; username?: string; sessionInvalid?: boolean }) {
  const t = useTranslations('admin.nav');
  const { avatar, nickname } = useUser();

  useEffect(() => {
    if (sessionInvalid) window.location.href = LOGIN_PATH;
  }, [sessionInvalid]);

  useSessionCheck();

  if (sessionInvalid) return null;

  const nav = useMemo(() => <AdminNav />, []);
  const backToUserLabel = t('backToUser');
  const footer = useMemo(() => (
    <Link href="/dashboard" className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-accent-foreground bg-accent border border-accent/60 rounded-xl hover:bg-accent-foreground/10 hover:border-accent-foreground/30 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200">
      <ArrowLeft className="h-4 w-4" />
      {backToUserLabel}
    </Link>
  ), [backToUserLabel]);
  const roleLabel = t('adminRole');
  const user = useMemo(() => ({ name: nickname || username || '', role: roleLabel, avatar: avatar ?? undefined, href: '#' }), [nickname, username, avatar, roleLabel]);
  const adminPanelLabel = t('adminPanel');
  const brandSubtitleLabel = t('brandSubtitle');
  const logo = useMemo(() => (<><h1 className="text-xl font-bold text-text-primary">{adminPanelLabel}</h1><p className="text-xs text-text-tertiary mt-0.5">{brandSubtitleLabel}</p></>), [adminPanelLabel, brandSubtitleLabel]);

  return (
    <SidebarShell breakpoint="md" headerTitle={adminPanelLabel} logo={logo} user={user} nav={nav} footer={footer}>
      <PageLogger />
      {children}
    </SidebarShell>
  );
}
