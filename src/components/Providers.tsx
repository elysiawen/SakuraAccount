'use client';

import { ToastProvider } from './ToastProvider';
import { ConfirmProvider } from './ConfirmProvider';
import { ThemeProvider } from './ThemeProvider';
import { ReactNode } from 'react';
import { NextIntlClientProvider, type AbstractIntlMessages } from 'next-intl';

export function Providers({
  children,
  locale,
  messages,
  timeZone,
}: {
  children: ReactNode;
  locale: string;
  messages: AbstractIntlMessages;
  timeZone?: string;
}) {
  return (
    <ThemeProvider>
      <NextIntlClientProvider locale={locale} messages={messages} timeZone={timeZone}>
        <ToastProvider>
          <ConfirmProvider>
            {children}
          </ConfirmProvider>
        </ToastProvider>
      </NextIntlClientProvider>
    </ThemeProvider>
  );
}
