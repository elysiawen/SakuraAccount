'use client';

import { ToastProvider } from './ToastProvider';
import { ConfirmProvider } from './ConfirmProvider';
import { ThemeProvider } from './ThemeProvider';
import { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <ConfirmProvider>
          {children}
        </ConfirmProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
