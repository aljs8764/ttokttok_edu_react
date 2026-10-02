'use client';

import { createTheme } from '@mui/material/styles';
import { koKR } from '@mui/material/locale';

/**
 * 어드민 기획서 디자인 가이드: Primary #1B2559, Accent #FF6B4A, Surface #F6F7FB,
 * 카드 라운드 8px·그림자 최소, 상태 색 고정(등원/성공=그린, 결석/위험=레드, 지각/주의=앰버), 본문 14~16px.
 */
export const theme = createTheme(
  {
    palette: {
      primary: { main: '#1B2559' },
      secondary: { main: '#FF6B4A' },
      success: { main: '#12A189' },
      info: { main: '#3B6FD8' },
      warning: { main: '#F5A524' },
      error: { main: '#E5484D' },
      background: { default: '#F6F7FB', paper: '#FFFFFF' },
      text: { primary: '#1B2559', secondary: '#5B6385' },
      divider: '#E4E7F0',
    },
    shape: { borderRadius: 8 },
    typography: {
      fontFamily: '"Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif',
      fontSize: 14,
      h1: { fontSize: 28, fontWeight: 700 },
      h2: { fontSize: 24, fontWeight: 700 },
      h3: { fontSize: 20, fontWeight: 700 },
      h4: { fontSize: 18, fontWeight: 700 },
      subtitle1: { fontWeight: 600 },
      button: { textTransform: 'none', fontWeight: 600 },
    },
    components: {
      MuiPaper: { defaultProps: { elevation: 0 }, styleOverrides: { root: { border: '1px solid #E4E7F0' } } },
      MuiCard: { defaultProps: { elevation: 0 } },
      MuiAppBar: { defaultProps: { elevation: 0 } },
      MuiButton: { defaultProps: { disableElevation: true } },
      MuiTableCell: { styleOverrides: { head: { fontWeight: 600, color: '#5B6385', backgroundColor: '#F6F7FB' } } },
      MuiChip: { styleOverrides: { root: { fontWeight: 600 } } },
    },
  },
  koKR,
);
