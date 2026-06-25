import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import ProgressBar from '@/components/ProgressBar';
import { Analytics } from '@/components/Analytics';
import { Providers } from '@/components/Providers';
import { Suspense } from 'react';
import { getLocale, getMessages, getTranslations, getTimeZone } from 'next-intl/server';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('common.metadata');
  return {
    title: t('title'),
    description: t('description'),
    icons: {
      icon: '/sakura.ico',
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  const timeZone = await getTimeZone();

  return (
    <html lang={locale} suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=localStorage.getItem('sakura-theme-mode')||'auto';var h=new Date().getHours();if(m==='dark'||(m==='auto'&&(h>=19||h<7)))document.documentElement.classList.add('dark')}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-screen">
        <Providers locale={locale} messages={messages} timeZone={timeZone}>
          <Suspense fallback={null}>
            <ProgressBar />
          </Suspense>
          {children}
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
