import Box from '@mui/material/Box';
import { color, font } from '@/theme/tokens';

/** 메뉴ID 표시를 끄려면 .env 에 NEXT_PUBLIC_SHOW_MENU_IDS=false (기본: 표시) */
export const SHOW_MENU_IDS = process.env.NEXT_PUBLIC_SHOW_MENU_IDS !== 'false';

/** IA 메뉴ID 칩 (모노 11px, #EEF0F7) — 기획서 메뉴ID ↔ 개발 티켓 1:1 확인용 */
export default function MenuIdChip({ id, sx }: { id?: string | null; sx?: object }) {
  if (!id || !SHOW_MENU_IDS) return null;
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        fontFamily: font.mono,
        fontWeight: 500,
        fontSize: 11,
        lineHeight: '16px',
        color: color.textSecondary,
        bgcolor: color.neutral,
        borderRadius: '4px',
        px: '6px',
        py: '2px',
        whiteSpace: 'nowrap',
        verticalAlign: 'middle',
        flexShrink: 0,
        ...sx,
      }}
    >
      {id}
    </Box>
  );
}
