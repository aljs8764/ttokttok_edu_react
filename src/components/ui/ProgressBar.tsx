import Box from '@mui/material/Box';
import { color } from '@/theme/tokens';

const FILL = { success: color.success, info: color.info, warning: color.warning, error: color.error, primary: color.primary, accent: color.accent } as const;

/** 진행 막대 (높이 6, 트랙 #EEF0F7). value 는 0~100 */
export default function ProgressBar({ value, tone = 'success', height = 6, label }: {
  value: number;
  tone?: keyof typeof FILL;
  height?: number;
  /** 스크린리더용 이름 */
  label?: string;
}) {
  const v = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  return (
    <Box
      role="progressbar"
      aria-valuenow={Math.round(v)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      sx={{ height, borderRadius: height / 2, bgcolor: color.neutral, overflow: 'hidden', width: '100%' }}
    >
      <Box sx={{ width: `${v}%`, height: '100%', borderRadius: height / 2, bgcolor: FILL[tone], transition: 'width .3s' }} />
    </Box>
  );
}
