'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { FaChrome, FaFirefoxBrowser, FaSafari, FaEdge, FaOpera, FaGlobe } from 'react-icons/fa';
import type { IconType } from 'react-icons';

// ── Spinner ──────────────────────────────────────────────────────

export function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

// ── BrowserIcon ──────────────────────────────────────────────────

const BROWSER_ICONS: Record<string, IconType> = {
  Chrome: FaChrome,
  Firefox: FaFirefoxBrowser,
  Safari: FaSafari,
  Edge: FaEdge,
  Opera: FaOpera,
};

export function BrowserIcon({ browser, className = 'w-7 h-7' }: { browser: string; className?: string }) {
  const Icon = BROWSER_ICONS[browser] || FaGlobe;
  return <Icon className={className} />;
}

// ── NavLink ──────────────────────────────────────────────────────

interface NavLinkProps {
  href: string;
  icon: LucideIcon;
  label: string;
  exact?: boolean;
}

export function NavLink({ href, icon: Icon, label, exact }: NavLinkProps) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname.startsWith(href);

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
