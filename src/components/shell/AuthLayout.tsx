'use client';

import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CheckIcon from '@mui/icons-material/Check';
import { useT } from '@/lib/i18n';
import MenuIdChip from '@/components/ui/MenuIdChip';
import { color, sidebar } from '@/theme/tokens';

const FEATURES = ['원터치 등·하원 출결과 실시간 타임라인', '열람 확인과 미열람 재발송까지 되는 알림장', '민감정보 암호화 · 역할별 접근 권한'];

/**
 * 로그인 전 화면 틀 (디자인 P1-01 Login) — 왼쪽 남색 서비스 소개, 오른쪽 폼(최대 400px).
 * 로그인(AUTH-001)·교직원 초대 수락에서 쓴다. 좁은 화면에서는 소개가 위로 접힌다.
 */
export default function AuthLayout({ title, menuId, subtitle, topRight, children }: {
  title: string;
  menuId?: string;
  subtitle?: ReactNode;
  topRight?: ReactNode;
  children: ReactNode;
}) {
  const t = useT();
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexWrap: 'wrap', bgcolor: 'background.default' }}>
      <Box
        component="section"
        aria-label={t('서비스 소개')}
        sx={{
          flex: '1 1 520px',
          bgcolor: sidebar.bg,
          color: '#FFFFFF',
          px: { xs: 3, md: 8 },
          py: { xs: 4, md: 7 },
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: { xs: 3, md: 6 },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box aria-hidden sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: color.accent, color: color.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 19 }}>
            똑
          </Box>
          <Box component="span" sx={{ fontWeight: 700, fontSize: 22 }}>
            {t('똑똑')}{' '}
            <Box component="span" sx={{ fontWeight: 500, color: sidebar.subText, fontSize: 15, letterSpacing: '0.12em' }}>
              ADMIN
            </Box>
          </Box>
        </Box>
        <Box sx={{ display: { xs: 'none', sm: 'flex' }, flexDirection: 'column', gap: 3.5, maxWidth: 520 }}>
          <Typography component="p" sx={{ m: 0, fontSize: { sm: 34, md: 44 }, lineHeight: 1.25, fontWeight: 700, letterSpacing: '-0.02em' }}>
            {t('선생님이 찍으면,')}
            <br />
            {t('학부모는 바로 압니다.')}
          </Typography>
          <Typography sx={{ fontSize: 17, lineHeight: 1.7, color: '#C9CFEA' }}>
            {t('원생·출결·알림장·행사를 한 화면에서. 등·하원 상태는 1초 안에 학부모 앱으로 전달돼요.')}
          </Typography>
          <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'flex', flexDirection: 'column', gap: 1.75 }}>
            {FEATURES.map((f) => (
              <Box component="li" key={f} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontSize: 15 }}>
                <Box aria-hidden sx={{ width: 28, height: 28, borderRadius: '8px', bgcolor: '#2B3678', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FF8A6E' }}>
                  <CheckIcon sx={{ fontSize: 16 }} />
                </Box>
                {t(f)}
              </Box>
            ))}
          </Box>
        </Box>
        <Typography sx={{ display: { xs: 'none', sm: 'block' }, fontSize: 13, color: sidebar.groupLabel }}>
          © {new Date().getFullYear()} {t('똑똑')} (Ttok-Ttok)
        </Typography>
      </Box>

      <Box
        component="section"
        aria-label={t(title)}
        sx={{ flex: '1 1 480px', display: 'flex', alignItems: 'center', justifyContent: 'center', px: 3, py: { xs: 4, md: 7 }, boxSizing: 'border-box' }}
      >
        <Box sx={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {topRight && <Box sx={{ alignSelf: 'flex-end' }}>{topRight}</Box>}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography component="h1" sx={{ fontSize: 28, fontWeight: 700 }}>
                {t(title)}
              </Typography>
              <MenuIdChip id={menuId} />
            </Box>
            {subtitle && <Typography sx={{ fontSize: 15, color: 'text.secondary' }}>{subtitle}</Typography>}
          </Box>
          {children}
        </Box>
      </Box>
    </Box>
  );
}

/** 위에 붙는 라벨(14/600) + 입력 — 디자인 로그인·온보딩 폼 형식 */
export function FieldLabel({ label, htmlFor, children }: { label: ReactNode; htmlFor: string; children: ReactNode }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Box component="label" htmlFor={htmlFor} sx={{ fontSize: 14, fontWeight: 600 }}>
        {label}
      </Box>
      {children}
    </Box>
  );
}
