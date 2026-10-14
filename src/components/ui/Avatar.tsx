import Box from '@mui/material/Box';
import { tone as TONES, type Tone } from '@/theme/tokens';

const CYCLE: Tone[] = ['blue', 'coral', 'green', 'gray', 'amber'];

/** 이름 첫 글자 아바타 (디자인 원생 목록·상세). 색은 이름으로 고정 배정 — 장식이라 스크린리더에서 숨김 */
export default function Avatar({ name, size = 30 }: { name: string; size?: number }) {
  const code = Array.from(name).reduce((n, c) => n + c.charCodeAt(0), 0);
  const t = TONES[CYCLE[code % CYCLE.length]];
  return (
    <Box
      component="span"
      aria-hidden
      sx={{ width: size, height: size, flexShrink: 0, borderRadius: '50%', bgcolor: t.bg, color: t.fg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: Math.round(size * 0.42), fontWeight: 700 }}
    >
      {Array.from(name)[0] ?? ''}
    </Box>
  );
}
