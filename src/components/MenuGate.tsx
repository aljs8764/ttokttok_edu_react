'use client';

import { useEffect, type ReactNode } from 'react';
import NextLink from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import { useDisabledMenus } from '@/lib/menus';
import { useSession } from '@/lib/session';
import { findNav, firstEnabledHref } from '@/components/shell/nav';
import { useT } from '@/lib/i18n';

/**
 * SAAS-008 메뉴 그룹에서 끈 메뉴의 화면을 막는다 (사이드바에서는 이미 숨김 — 주소로 직접 들어온 경우).
 * 대시보드는 로그인·기관 선택 후 기본 진입 화면이라, 꺼져 있으면 켜진 첫 메뉴로 보낸다.
 */
export default function MenuGate({ children }: { children: ReactNode }) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const { manager } = useSession();
  const { disabled } = useDisabledMenus();
  const item = findNav(pathname)?.item;
  const blocked = !!item && !item.required && disabled.has(item.href);
  const fallback = firstEnabledHref(disabled, manager);

  useEffect(() => {
    if (blocked && item.href === '/dashboard') router.replace(fallback);
  }, [blocked, item, fallback, router]);

  if (!blocked) return <>{children}</>;
  if (item.href === '/dashboard') return null;
  return (
    <Alert severity="info" action={<Button color="inherit" size="small" component={NextLink} href={fallback}>{t('다른 메뉴로')}</Button>}>
      {t('이 기관에서는 사용하지 않는 메뉴입니다. 필요하면 운영팀에 문의해 주세요.')}
    </Alert>
  );
}
