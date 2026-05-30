'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
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
  children: React.ReactNode;
}

export default function SidebarShell({
  logo,
  nav,
  footer,
  headerTitle,
  breakpoint = 'md',
  children,
}: SidebarShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const bp = breakpoint;

  const sidebarInner = (
    <>
      <div className="p-6 border-b">{logo}</div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">{nav}</nav>
      <div className="p-4 border-t bg-muted/50 space-y-3">
        <div className="flex justify-center items-center gap-2">
          <ThemeToggle />
          <div className="w-px h-4 bg-border" />
          <LanguageSwitcher />
        </div>
        {footer}
      </div>
    </>
  );

  return (
    <div className="h-screen bg-muted flex overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className={`hidden ${bp}:flex flex-col w-64 fixed inset-y-0 z-50 bg-card border-r`}>
        {sidebarInner}
      </aside>

      {/* Mobile Sidebar Overlay */}
      <div className={`fixed inset-0 z-50 ${bp}:hidden transition-all duration-300 ${sidebarOpen ? 'visible' : 'invisible pointer-events-none'}`}>
        <div
          className={`fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setSidebarOpen(false)}
        />
        <aside className={`fixed inset-y-0 left-0 w-64 bg-card shadow-2xl flex flex-col transition-transform duration-300 ease-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          {sidebarInner}
        </aside>
      </div>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col ${bp}:pl-64 h-full`}>
        {/* Mobile Header */}
        <div className={`${bp}:hidden bg-card/80 backdrop-blur-md border-b border-border p-4 flex items-center sticky top-0 z-30`}>
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 text-text-secondary hover:bg-muted rounded-lg"
          >
            <Menu className="h-6 w-6" />
          </button>
          <span className="font-bold text-text-primary text-lg ml-3">{headerTitle}</span>
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
