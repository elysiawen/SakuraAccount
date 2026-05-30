'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { JSON_HEADERS } from '@/lib/constants';

export default function PageLogger() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (pathname === lastPath.current) return;
    lastPath.current = pathname;

    fetch('/api/user/log-visit', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ path: pathname }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
