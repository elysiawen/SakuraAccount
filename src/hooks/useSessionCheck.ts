'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LOGIN_PATH } from '@/lib/constants';

export function useSessionCheck(intervalMs = 5 * 60 * 1000) {
  const router = useRouter();

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

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

    const start = () => {
      interval = setInterval(checkSession, intervalMs);
    };

    const stop = () => {
      clearInterval(interval);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stop();
      } else {
        checkSession();
        start();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    start();

    return () => {
      stop();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [router, intervalMs]);
}
