'use client';

import type { CSSProperties } from 'react';
import { createTheme, type Theme } from '@mui/material/styles';
import { koKR } from '@mui/material/locale';
import { color, font, ops, radius, tone } from './tokens';

export { color, font, ops, radius, sidebar, tone } from './tokens';
export type { Tone } from './tokens';

declare module '@mui/material/styles' {
  interface Palette {
    ops: { main: string; bg: string };
  }
  interface PaletteOptions {
    ops?: { main: string; bg: string };
  }
  interface TypographyVariants {
    mono: CSSProperties;
  }
  interface TypographyVariantsOptions {
    mono?: CSSProperties;
  }
}
declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    mono: true;
  }
}

type ChipTone = 'default' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error';
/** MUI Chip color → 디자인 상태 배지 톤 (filled) */
const CHIP_TONE: Record<ChipTone, { bg: string; fg: string }> = {
  default: tone.gray,
  primary: { bg: color.selected, fg: color.primary },
  secondary: tone.coral,
  success: tone.green,
  info: tone.blue,
  warning: tone.amber,
  error: tone.red,
};

/**
 * 관리자 웹 테마 — 디자인 캔버스 토큰.
 * 카드 12px·테두리 1px·그림자 없음, 버튼 높이 44(small 32), 세그먼트형 탭, 상태 배지 톤.
 */
export const theme: Theme = createTheme(
  {
    palette: {
      primary: { main: color.primary, contrastText: '#FFFFFF' },
      secondary: { main: color.accent, contrastText: color.primary },
      success: { main: color.success, dark: tone.green.fg, contrastText: '#FFFFFF' },
      info: { main: color.info, dark: tone.blue.fg, contrastText: '#FFFFFF' },
      warning: { main: color.warning, dark: tone.amber.fg, contrastText: color.primary },
      error: { main: color.error, dark: tone.red.fg, contrastText: '#FFFFFF' },
      background: { default: color.bg, paper: color.paper },
      text: { primary: color.text, secondary: color.textSecondary },
      divider: color.divider,
      ops: { main: ops.main, bg: ops.bg },
    },
    shape: { borderRadius: radius.control },
    typography: {
      fontFamily: font.sans,
      fontSize: 14,
      h1: { fontSize: 24, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.3 },
      h2: { fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.35 },
      h3: { fontSize: 20, fontWeight: 700, lineHeight: 1.35 },
      h4: { fontSize: 17, fontWeight: 700, lineHeight: 1.4 },
      h5: { fontSize: 15, fontWeight: 700 },
      h6: { fontSize: 14, fontWeight: 700 },
      subtitle1: { fontSize: 15, fontWeight: 600 },
      subtitle2: { fontSize: 14, fontWeight: 600 },
      body1: { fontSize: 14 },
      body2: { fontSize: 13 },
      caption: { fontSize: 12 },
      button: { textTransform: 'none', fontWeight: 600, fontSize: 14 },
      mono: { fontFamily: font.mono, fontWeight: 500 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { backgroundColor: color.bg, color: color.text },
          a: { color: color.link },
        },
      },
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: ({ ownerState }) =>
            (ownerState.elevation ?? 0) === 0 && ownerState.variant !== 'outlined' && !ownerState.square
              ? { border: `1px solid ${color.divider}`, borderRadius: radius.card, backgroundImage: 'none' }
              : { borderRadius: 10, backgroundImage: 'none' },
          outlined: { borderColor: color.divider, borderRadius: radius.card },
        },
      },
      MuiCard: { defaultProps: { elevation: 0 } },
      MuiCardContent: { styleOverrides: { root: { padding: '20px 24px', '&:last-child': { paddingBottom: 20 } } } },
      MuiAppBar: { defaultProps: { elevation: 0 } },
      MuiDialog: { styleOverrides: { paper: { borderRadius: radius.card, border: 0 } } },
      MuiDialogTitle: { styleOverrides: { root: { fontSize: 17, fontWeight: 700, padding: '20px 24px 12px' } } },
      MuiDialogContent: { styleOverrides: { root: { padding: '8px 24px' } } },
      MuiDialogActions: { styleOverrides: { root: { padding: '16px 24px 20px', gap: 8 } } },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { minHeight: 44, borderRadius: radius.control, padding: '0 16px', whiteSpace: 'nowrap' },
          sizeSmall: { minHeight: 32, padding: '0 12px', fontSize: 13 },
          sizeLarge: { minHeight: 52, padding: '0 20px', fontSize: 16, fontWeight: 700 },
          containedPrimary: { '&:hover': { backgroundColor: color.primaryHover } },
          outlined: ({ ownerState }) =>
            ownerState.color === 'primary' || ownerState.color === 'inherit' || !ownerState.color
              ? { backgroundColor: color.paper, borderColor: color.border, color: color.primary, '&:hover': { backgroundColor: color.bg, borderColor: color.border } }
              : { backgroundColor: color.paper },
          text: { padding: '0 12px' },
        },
      },
      MuiIconButton: { styleOverrides: { root: { borderRadius: radius.control } } },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 600, borderRadius: radius.pill },
          sizeSmall: { height: 22, fontSize: 12 },
          labelSmall: { paddingLeft: 8, paddingRight: 8 },
          filled: ({ ownerState }) => {
            const t = CHIP_TONE[(ownerState.color as ChipTone) ?? 'default'] ?? tone.gray;
            return {
              backgroundColor: t.bg,
              color: t.fg,
              '& .MuiChip-icon, & .MuiChip-deleteIcon': { color: t.fg },
              '&.MuiChip-clickable:hover, &.MuiChip-clickable.Mui-focusVisible': { backgroundColor: t.bg, filter: 'brightness(0.96)' },
            };
          },
          // 색 있는 outlined 칩도 배지 톤으로 (main 색 글자는 흰 바탕 대비 4.5:1 미달)
          outlined: ({ ownerState }) => {
            if (!ownerState.color || ownerState.color === 'default') return { borderColor: color.border, color: color.textSecondary, backgroundColor: color.paper };
            const t = CHIP_TONE[ownerState.color as ChipTone] ?? tone.gray;
            return { borderColor: t.bg, color: t.fg, backgroundColor: t.bg, '& .MuiChip-icon, & .MuiChip-deleteIcon': { color: t.fg } };
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          root: {
            display: 'inline-flex',
            maxWidth: '100%',
            minHeight: 44,
            padding: 4,
            borderRadius: 10,
            backgroundColor: color.track,
            border: 0,
            verticalAlign: 'middle',
          },
          flexContainer: { gap: 4 },
          indicator: { display: 'none' },
          scrollButtons: { width: 32, borderRadius: radius.control },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            minHeight: 36,
            minWidth: 0,
            padding: '0 16px',
            borderRadius: radius.control,
            fontSize: 14,
            fontWeight: 500,
            color: color.textSecondary,
            '&.Mui-selected': {
              backgroundColor: color.paper,
              color: color.primary,
              fontWeight: 600,
              boxShadow: '0 1px 2px rgba(27,37,89,0.08)',
            },
          },
        },
      },
      MuiSwitch: {
        styleOverrides: {
          root: { width: 44, height: 26, padding: 0, margin: 8, overflow: 'visible' },
          switchBase: {
            padding: 3,
            '&.Mui-checked': {
              transform: 'translateX(18px)',
              color: '#FFFFFF',
              '& + .MuiSwitch-track': { backgroundColor: color.success, opacity: 1 },
            },
            '&.Mui-disabled + .MuiSwitch-track': { opacity: 0.4 },
          },
          thumb: { width: 20, height: 20, boxShadow: '0 1px 2px rgba(16,22,58,0.25)', color: '#FFFFFF' },
          track: { borderRadius: 13, backgroundColor: '#C9CEDD', opacity: 1 },
          sizeSmall: {
            width: 36,
            height: 22,
            '& .MuiSwitch-switchBase': { padding: 3, '&.Mui-checked': { transform: 'translateX(14px)' } },
            '& .MuiSwitch-thumb': { width: 16, height: 16 },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          // 카드 가장자리 여백(24)과 맞추려고 첫·끝 칸은 안쪽 여백을 넓힌다
          root: { borderBottom: `1px solid ${color.rowDivider}`, fontSize: 14, padding: '12px', '&:first-of-type': { paddingLeft: 24 }, '&:last-of-type': { paddingRight: 24 } },
          head: {
            fontSize: 12,
            fontWeight: 600,
            color: color.textSecondary,
            backgroundColor: color.paper,
            borderBottom: `1px solid ${color.divider}`,
            padding: '10px 12px',
            whiteSpace: 'nowrap',
          },
          sizeSmall: { padding: '8px 12px' },
        },
      },
      MuiTableContainer: { styleOverrides: { root: { overflowX: 'auto' } } },
      MuiTableRow: { styleOverrides: { root: { '&.MuiTableRow-hover:hover': { backgroundColor: '#F8F9FC' } } } },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            backgroundColor: color.paper,
            borderRadius: radius.control,
            '& .MuiOutlinedInput-notchedOutline': { borderColor: color.border },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: color.borderStrong },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: color.primary, borderWidth: 1.5 },
          },
          // 높이: medium ≈ 46, small ≈ 42 (multiline·Autocomplete 는 자체 여백 유지)
          input: ({ ownerState }) =>
            ownerState.multiline ? {} : ownerState.size === 'small' ? { padding: '10.5px 12px' } : { padding: '12.5px 14px' },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          outlined: ({ ownerState }) =>
            ownerState.shrink
              ? {}
              : ownerState.size === 'small'
                ? { transform: 'translate(12px, 11px) scale(1)' }
                : { transform: 'translate(14px, 13px) scale(1)' },
        },
      },
      MuiFormLabel: { styleOverrides: { root: { fontSize: 14 } } },
      MuiAlert: { styleOverrides: { root: { borderRadius: 10, alignItems: 'center' } } },
      MuiTooltip: { styleOverrides: { tooltip: { backgroundColor: color.primary, fontSize: 12 } } },
      MuiLinearProgress: {
        styleOverrides: {
          root: { height: 6, borderRadius: 3, backgroundColor: color.neutral },
          bar: { borderRadius: 3 },
        },
      },
      MuiMenu: { styleOverrides: { paper: { border: `1px solid ${color.divider}`, boxShadow: '0 8px 24px rgba(16,22,58,0.12)' } } },
      MuiListSubheader: { styleOverrides: { root: { fontSize: 11, letterSpacing: '0.08em' } } },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            minHeight: 36,
            textTransform: 'none',
            fontWeight: 600,
            color: color.textSecondary,
            borderColor: color.border,
            '&.Mui-selected': { backgroundColor: color.selected, color: color.primary },
          },
        },
      },
    },
  },
  koKR,
);
