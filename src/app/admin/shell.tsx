'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import AdminSidebar from './sidebar';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import PageLogger from '@/components/PageLogger';
import { Menu } from 'lucide-react';

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const t = useTranslations('admin.nav');

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

  return (
    <div className="h-screen bg-muted flex overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-col w-64 fixed inset-y-0 z-50">
        <AdminSidebar username={username} nickname={nickname} avatar={avatar} />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-64 bg-card shadow-2xl flex flex-col">
            <AdminSidebar username={username} nickname={nickname} avatar={avatar} />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:pl-64 h-full">
        {/* Mobile Header */}
        <div className="md:hidden bg-card/80 backdrop-blur-md border-b border-border p-4 flex items-center sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 text-text-secondary hover:bg-muted rounded-lg"
          >
            <Menu className="h-6 w-6" />
          </button>
          <span className="font-bold text-text-primary text-lg ml-3">{t('adminPanel')}</span>
        </div>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto w-full">
          <div key={pathname} className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto animate-slide-in-up">
            <PageLogger />
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
