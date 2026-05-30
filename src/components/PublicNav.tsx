'use client';

import Link from 'next/link';
import { ThemeToggle } from './ThemeToggle';
import { LanguageSwitcher } from './LanguageSwitcher';

interface PublicNavProps {
  /** 是否使用绝对定位（登录注册页） */
  absolute?: boolean;
  /** 右侧额外内容（如用户头像） */
  extra?: React.ReactNode;
}

export function PublicNav({ absolute, extra }: PublicNavProps) {
  return (
    <nav className={`${absolute ? 'absolute top-0 left-0 right-0 z-20 ' : ''}flex items-center justify-between px-5 sm:px-6 md:px-10 lg:px-16 py-4 sm:py-4 md:py-5`}>
      <Link href="/" className="flex items-center gap-2">
        <img src="/sakura.ico" alt="Sakura" className="w-6 h-6 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-8 lg:h-8" />
        <span className="text-sm sm:text-sm md:text-base font-semibold text-foreground tracking-tight">Sakura Account</span>
      </Link>
      <div className="flex items-center gap-1.5">
        <ThemeToggle dropDown /><div className="w-px h-4 bg-border" /><LanguageSwitcher dropDown align="right" />
        {extra && (
          <>
            <div className="w-px h-4 bg-border" />
            {extra}
          </>
        )}
      </div>
    </nav>
  );
}
