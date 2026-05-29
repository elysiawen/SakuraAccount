import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import ProgressBar from '@/components/ProgressBar';
import { Providers } from '@/components/Providers';
import { Suspense } from 'react';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Sakura Account - 统一身份认证平台',
  description: 'Sakura Account 是一个现代化的统一身份认证平台，支持邮箱密码登录、Passkey/WebAuthn、OAuth2.0等多种认证方式。',
  icons: {
    icon: '/sakura.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head />
      <body className="min-h-full flex flex-col">
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=localStorage.getItem('sakura-theme-mode')||'auto';var h=new Date().getHours();if(m==='dark'||(m==='auto'&&(h>=19||h<7)))document.documentElement.classList.add('dark')}catch(e){}})()`,
          }}
        />
        <Providers>
          <Suspense fallback={null}>
            <ProgressBar />
          </Suspense>
          {children}
        </Providers>
      </body>
    </html>
  );
}
