import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import { tone as TONES, type Tone } from '@/theme/tokens';
import { STATUS_TONE, type StatusKind } from '@/theme/status';

/**
 * 상태 배지 — 색과 함께 항상 글자를 보여 준다(색만으로 구분하지 않음).
 * `kind`(상태 의미) 또는 `tone`(톤 직접)으로 색을 정한다. 매핑은 theme/status.ts 한 곳.
 */
export default function StatusBadge({ label, kind, tone, icon, minWidth }: {
  label: ReactNode;
  kind?: StatusKind;
  tone?: Tone;
  icon?: ReactNode;
  /** 타임라인처럼 배지 폭을 맞출 때 */
  minWidth?: number;
}) {
  const t = TONES[tone ?? (kind ? STATUS_TONE[kind] : 'gray')];
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.5,
        px: 1,
        py: '2px',
        minWidth,
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        lineHeight: '18px',
        whiteSpace: 'nowrap',
        bgcolor: t.bg,
        color: t.fg,
        '& svg': { fontSize: 14 },
      }}
    >
      {icon}
      {label}
    </Box>
  );
}
