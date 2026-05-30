'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import SidebarShell from '@/components/SidebarShell';
import PageLogger from '@/components/PageLogger';
import { LOGIN_PATH } from '@/lib/constants';
import {
  LayoutDashboard,
  Users,
  Link2,
  FileText,
  Settings,
  ArrowLeft,
  type LucideIcon,
} from 'lucide-react';

function NavLink({ href, icon: Icon, label }: { href: string; icon: LucideIcon; label: string }) {
  const pathname = usePathname();
  const active = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

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

export default function AdminShell({
  children,
  username,
  nickname,
  avatar,
  sessionInvalid,
}: {
  children: React.ReactNode;
  username?: string;
  nickname?: string;
  avatar?: string;
  sessionInvalid?: boolean;
}) {
  const t = useTranslations('admin.nav');

  useEffect(() => {
    if (sessionInvalid) {
      window.location.href = LOGIN_PATH;
    }
  }, [sessionInvalid]);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        if (!data.user) {
          window.location.href = LOGIN_PATH;
        }
      } catch {
        // Network error — don't redirect, just skip this check
      }
    };

    const interval = setInterval(checkSession, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (sessionInvalid) return null;

  const nav = (
    <>
      <div className="space-y-1">
        <NavLink href="/admin" icon={LayoutDashboard} label={t('overview')} />
      </div>
      <div className="space-y-1 pt-3 border-t border-border">
        <p className="px-4 mb-1 text-[11px] font-medium text-text-quaternary uppercase tracking-wider">{t('sectionManagement')}</p>
        <NavLink href="/admin/users" icon={Users} label={t('users')} />
        <NavLink href="/admin/applications" icon={Link2} label={t('applications')} />
        <NavLink href="/admin/audit-logs" icon={FileText} label={t('auditLogs')} />
      </div>
      <div className="pt-3 border-t border-border">
        <NavLink href="/admin/settings" icon={Settings} label={t('settings')} />
      </div>
    </>
  );

  const footer = (
    <Link
      href="/dashboard"
      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-accent-foreground bg-accent border border-accent/60 rounded-xl hover:bg-accent-foreground/10 hover:border-accent-foreground/30 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
    >
      <ArrowLeft className="h-4 w-4" />
      {t('backToUser')}
    </Link>
  );

  return (
    <SidebarShell
      breakpoint="md"
      headerTitle={t('adminPanel')}
      logo={
        <>
          <h1 className="text-xl font-bold text-text-primary">{t('adminPanel')}</h1>
          <p className="text-xs text-text-tertiary mt-0.5">{t('brandSubtitle')}</p>
        </>
      }
      user={{
        name: nickname || username || '',
        role: t('adminRole'),
        avatar,
        href: '#',
      }}
      nav={nav}
      footer={footer}
    >
      <PageLogger />
      {children}
    </SidebarShell>
  );
}
