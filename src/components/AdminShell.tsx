'use client';

import { useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import { useSession } from '@/lib/session';
import { usePlatformAdmin } from '@/lib/platform';
import { useAccountLocaleSync, useLocale } from '@/lib/i18n';
import PlatformNoticeBanner from '@/components/PlatformNoticeBanner';
import IdleLogout from '@/components/IdleLogout';
import MenuGate from '@/components/MenuGate';
import ServiceStatusBanner from '@/components/ServiceStatusBanner';
import Sidebar, { SIDEBAR_WIDTH } from '@/components/shell/Sidebar';
import { color, ops, sidebar } from '@/theme/tokens';
import ChangePasswordDialog from './ChangePasswordDialog';
import TermsGate from './TermsGate';

/** 셸 없이 그리는 화면 (디자인: 온보딩 ONB-001 은 전체 화면 마법사) — 라우트는 그대로 */
const BARE_PATHS = ['/onboarding'];

/**
 * 관리자 앱 셸 — 디자인 Sidebar(기관, #1B2559) / OpsSidebar(운영 콘솔, #10163A).
 * 넓은 화면은 고정 사이드바, 좁은 화면(md 미만)은 상단 바 + 접히는 Drawer.
 * 기관 전환·계정 메뉴는 사이드바(현재 기관 버튼·하단 사용자 카드)로 옮겼고 로직은 그대로다.
 */
export default function AdminShell({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const pathname = usePathname();
  const { session } = useSession();
  const platformAdmin = usePlatformAdmin();
  const { t } = useLocale();
  useAccountLocaleSync(!!session);

  const gates = (
    <>
      <IdleLogout />
      {/* 임시 비밀번호로 들어온 경우 변경을 강제 (AUTH-005) */}
      {/* 비밀번호 강제 변경이 먼저, 그다음 약관 재동의 */}
      {!session?.user.mustChangePassword && <TermsGate />}
      <ChangePasswordDialog open={pwOpen || !!session?.user.mustChangePassword} forced={!!session?.user.mustChangePassword} onClose={() => setPwOpen(false)} />
    </>
  );

  if (BARE_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        {children}
        {gates}
      </Box>
    );
  }

  const opsMode = platformAdmin && (pathname === '/platform' || pathname.startsWith('/platform/'));
  const navBg = opsMode ? ops.main : sidebar.bg;

  const nav = (
    <Sidebar
      variant={opsMode ? 'ops' : 'inst'}
      platformAdmin={platformAdmin}
      onNavigate={() => setMobileOpen(false)}
      onChangePassword={() => {
        setMobileOpen(false);
        setPwOpen(true);
      }}
    />
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: opsMode ? ops.bg : 'background.default' }}>
      {!desktop && (
        <AppBar position="fixed" color="inherit" sx={{ borderBottom: `1px solid ${color.divider}`, bgcolor: 'background.paper' }}>
          <Toolbar sx={{ gap: 1, minHeight: 56 }}>
            <IconButton edge="start" onClick={() => setMobileOpen(true)} aria-label={t('메뉴')} sx={{ width: 44, height: 44 }}>
              <MenuIcon />
            </IconButton>
            <Typography sx={{ fontWeight: 700, fontSize: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {opsMode ? t('운영 콘솔') : (session?.institution?.institutionName ?? t('똑똑'))}
            </Typography>
          </Toolbar>
        </AppBar>
      )}

      <Box sx={{ width: { md: SIDEBAR_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer
          variant={desktop ? 'permanent' : 'temporary'}
          open={desktop || mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          slotProps={{ paper: { sx: { width: SIDEBAR_WIDTH, boxSizing: 'border-box', border: 0, borderRadius: 0, bgcolor: navBg } } }}
        >
          {nav}
        </Drawer>
      </Box>

      <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', mt: { xs: 7, md: 0 } }}>
        {/* 서비스 상태·운영사 공지 배너는 화면 머리 위 전체 폭 (없으면 자리 차지 안 함) */}
        <Box sx={{ px: { xs: 2, md: 4 }, pt: 2, '&:empty': { display: 'none' }, '& .MuiAlert-root:last-child': { mb: 0 } }}>
          <ServiceStatusBanner />
          <PlatformNoticeBanner />
        </Box>
        <Box component="main" sx={{ flexGrow: 1, minWidth: 0, px: { xs: 2, md: 4 }, pt: { xs: 2, md: 3.5 }, pb: 6 }}>
          <MenuGate>{children}</MenuGate>
        </Box>
      </Box>
      {gates}
    </Box>
  );
}
