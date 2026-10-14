import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { IBM_Plex_Mono, IBM_Plex_Sans_KR } from 'next/font/google';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import Providers from './providers';

// 디자인 서체: 본문 IBM Plex Sans KR(400~700), 숫자·메뉴ID IBM Plex Mono 500.
// 한글 글리프가 많아 미리 불러오지 않고(preload false) unicode-range 조각으로 받는다.
const plexSans = IBM_Plex_Sans_KR({
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  preload: false,
  variable: '--font-plex-sans',
});
const plexMono = IBM_Plex_Mono({
  weight: ['500'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-plex-mono',
});

export const metadata: Metadata = {
  title: { default: '똑똑 관리자', template: '%s · 똑똑 관리자' },
  description: '똑똑에듀 학원 운영 관리자 웹',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" className={`${plexSans.variable} ${plexMono.variable}`}>
      <body>
        <AppRouterCacheProvider options={{ key: 'mui' }}>
          <Providers>{children}</Providers>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
