'use client';

import { useTheme } from 'next-themes';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Sun, Moon, Clock, Monitor } from 'lucide-react';
import { useTranslations } from 'next-intl';

const MODE_KEY = 'sakura-theme-mode';
const MODE_CHANGED_EVENT = 'sakura-theme-mode-change';

function isDarkHour(): boolean {
  const hour = new Date().getHours();
  return hour >= 19 || hour < 7;
}

const MODE_KEYS = ['light', 'dark', 'auto', 'system'] as const;
type ThemeMode = (typeof MODE_KEYS)[number];

const MODE_ICONS: Record<ThemeMode, typeof Sun> = { light: Sun, dark: Moon, auto: Clock, system: Monitor };

function isThemeMode(value: string | null): value is ThemeMode {
  return value !== null && MODE_KEYS.includes(value as ThemeMode);
}

function getThemeModeSnapshot(): ThemeMode {
  if (typeof window === 'undefined') return 'auto';
  const stored = localStorage.getItem(MODE_KEY);
  return isThemeMode(stored) ? stored : 'auto';
}

function subscribeThemeMode(onStoreChange: () => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleChange = () => onStoreChange();
  window.addEventListener('storage', handleChange);
  window.addEventListener(MODE_CHANGED_EVENT, handleChange);

  return () => {
    window.removeEventListener('storage', handleChange);
    window.removeEventListener(MODE_CHANGED_EVENT, handleChange);
  };
}

function updateStoredThemeMode(mode: ThemeMode) {
  localStorage.setItem(MODE_KEY, mode);
  window.dispatchEvent(new Event(MODE_CHANGED_EVENT));
}

export function ThemeToggle({ dropDown }: { dropDown?: boolean }) {
  const { setTheme } = useTheme();
  const t = useTranslations('common.theme');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const mode = useSyncExternalStore<ThemeMode>(subscribeThemeMode, getThemeModeSnapshot, () => 'auto');

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const currentKey = mode;
  const Icon = MODE_ICONS[currentKey];

  const selectMode = (next: ThemeMode) => {
    updateStoredThemeMode(next);
    setOpen(false);

    if (next === 'auto') {
      setTheme(isDarkHour() ? 'dark' : 'light');
    } else if (next === 'system') {
      setTheme('system');
    } else {
      setTheme(next);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 pl-2.5 pr-1.5 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-muted rounded-lg transition-colors"
        title={t(currentKey)}
      >
        <Icon className="w-4 h-4" />
        <svg className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className={`absolute ${dropDown ? 'top-full mt-1' : 'bottom-full mb-1'} left-0 w-36 bg-card rounded-xl shadow-lg border border-border-strong py-1 z-[100] animate-fade-in`}>
          {MODE_KEYS.map(key => {
            const ModeIcon = MODE_ICONS[key];
            return (
              <button
                key={key}
                onClick={() => selectMode(key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                  mode === key
                    ? 'text-accent-foreground bg-accent font-medium'
                    : 'text-text-secondary hover:bg-muted'
                }`}
              >
                <ModeIcon className="w-4 h-4" />
                <span>{t(key)}</span>
                {mode === key && (
                  <svg className="w-4 h-4 ml-auto text-accent-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
