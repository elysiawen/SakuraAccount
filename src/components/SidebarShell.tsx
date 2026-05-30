'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Menu } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

interface SidebarShellProps {
  logo: React.ReactNode;
  nav: React.ReactNode;
  footer: React.ReactNode;
  headerTitle: string;
  /** Tailwind breakpoint prefix: 'md' or 'lg' */
  breakpoint?: 'md' | 'lg';
  /** User info displayed above footer buttons */
  user?: {
    name: string;
    role?: string;
    avatar?: string;
    href?: string;
  };
  children: React.ReactNode;
}

export default function SidebarShell({
  logo,
  nav,
  footer,
  headerTitle,
  breakpoint = 'md',
  user,
  children,
}: SidebarShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const sidebarShow = breakpoint === 'md' ? 'md:flex' : 'lg:flex';
  const mobileOnly = breakpoint === 'md' ? 'md:hidden' : 'lg:hidden';
  const sidebarPadding = breakpoint === 'md' ? 'md:pl-64' : 'lg:pl-64';

  const sidebarInner = (
    <>
      <div className="p-6 border-b">{logo}</div>
      <nav className="flex-1 p-4 space-y-4 overflow-y-auto">{nav}</nav>
      <div className="p-4 border-t bg-muted/50 space-y-3">
        <div className="flex justify-center items-center gap-2">
          <ThemeToggle />
          <div className="w-px h-4 bg-border" />
          <LanguageSwitcher />
        </div>

        {user && (
          <Link
            href={user.href || '#'}
            className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-muted transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm overflow-hidden">
              {user.avatar ? (
                <img src={user.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                (user.name || '').charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-text-primary truncate">{user.name}</div>
              {user.role && (
                <div className="text-xs text-text-tertiary truncate">{user.role}</div>
              )}
            </div>
          </Link>
        )}

        {footer}
      </div>
    </>
  );

  return (
    <div className="h-screen bg-muted flex overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className={`hidden ${sidebarShow} flex-col w-64 fixed inset-y-0 z-50 bg-card border-r`}>
        {sidebarInner}
      </aside>

      {/* Mobile Sidebar Overlay */}
      <div className={`fixed inset-0 z-50 ${mobileOnly} transition-all duration-300 ${sidebarOpen ? 'visible' : 'invisible pointer-events-none'}`}>
        <div
          className={`fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setSidebarOpen(false)}
        />
        <aside className={`fixed inset-y-0 left-0 w-64 bg-card shadow-2xl flex flex-col transition-transform duration-300 ease-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          {sidebarInner}
        </aside>
      </div>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col ${sidebarPadding} h-full min-w-0`}>
        {/* Mobile Header */}
        <div className={`${mobileOnly} bg-card/80 backdrop-blur-md border-b border-border p-4 flex items-center sticky top-0 z-30`}>
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 text-text-secondary hover:bg-muted rounded-lg"
          >
            <Menu className="h-6 w-6" />
          </button>
          <span className="font-bold text-text-primary text-lg ml-3">{headerTitle}</span>
        </div>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden w-full min-w-0">
          <div key={pathname} className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto animate-slide-in-up min-w-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
