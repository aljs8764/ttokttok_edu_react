'use client';

import type { ReactNode } from 'react';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useT } from '@/lib/i18n';
import { color } from '@/theme/tokens';
import MenuIdChip from '@/components/ui/MenuIdChip';
import { findNav } from '@/components/shell/nav';

/**
 * 화면 머리 — 흰 바(하단 테두리, 패딩 20×32) 안에 브레드크럼 + 제목(24/700) + 메뉴ID, 오른쪽 액션.
 * 본문 첫 요소일 때 본문 패딩을 넘어 가장자리까지 붙는다(셸 main 패딩과 짝).
 * 브레드크럼은 사이드바 메뉴 구성(shell/nav)에서 경로로 찾는다. `breadcrumb` 로 직접 줄 수도 있다.
 */
export default function PageHeader({ title, menuId, description, actions, breadcrumb, tabs }: {
  title: string;
  menuId?: string;
  description?: ReactNode;
  actions?: ReactNode;
  /** 기본값: '메뉴 그룹 › 메뉴' (하위 화면이면 메뉴가 목록 링크) */
  breadcrumb?: ReactNode;
  /** 제목 줄 아래 세그먼트 탭 등 */
  tabs?: ReactNode;
}) {
  const t = useT();
  const pathname = usePathname();
  const nav = findNav(pathname);
  const crumb =
    breadcrumb ??
    (nav ? (
      <>
        {t(nav.group)} ›{' '}
        {pathname !== nav.item.href ? (
          <Box component={NextLink} href={nav.item.href} sx={{ color: 'inherit', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
            {t(nav.item.label)}
          </Box>
        ) : (
          t(nav.item.label)
        )}
      </>
    ) : null);

  return (
    <Box
      component="header"
      className="ttok-page-header"
      sx={{
        mx: { xs: -2, md: -4 },
        px: { xs: 2, md: 4 },
        py: 2.5,
        mb: 3.5,
        bgcolor: 'background.paper',
        borderBottom: `1px solid ${color.divider}`,
        '&:first-of-type': { mt: { xs: -2, md: -3.5 } },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {crumb && (
            <Typography component="nav" aria-label={t('현재 위치')} sx={{ fontSize: 12, color: 'text.secondary' }}>
              {crumb}
            </Typography>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: crumb ? 0.5 : 0, flexWrap: 'wrap' }}>
            <Typography variant="h1">{t(title)}</Typography>
            <MenuIdChip id={menuId} />
          </Box>
          {description && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, maxWidth: 760 }}>
              {description}
            </Typography>
          )}
        </Box>
        {actions && <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>{actions}</Box>}
      </Box>
      {tabs && <Box sx={{ mt: 2 }}>{tabs}</Box>}
    </Box>
  );
}
