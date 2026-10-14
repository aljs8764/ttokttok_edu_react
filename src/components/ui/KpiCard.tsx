import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import MenuIdChip from './MenuIdChip';
import ProgressBar from './ProgressBar';

/**
 * KPI 카드 — 라벨(14 보조색) + 메뉴ID / 큰 숫자(36/700) + 단위·보조 문구 / 진행 막대 또는 배지.
 * 대시보드 투데이 요약·통계 KPI·운영사 지표에서 공통으로 쓴다.
 */
export default function KpiCard({ label, menuId, value, sub, progress, progressTone, footer, loading, size = 'lg' }: {
  label: ReactNode;
  menuId?: string;
  value: ReactNode;
  sub?: ReactNode;
  /** 0~100 이면 아래에 진행 막대 */
  progress?: number | null;
  progressTone?: 'success' | 'info' | 'warning' | 'error' | 'primary' | 'accent';
  /** 막대 대신 배지 등 */
  footer?: ReactNode;
  loading?: boolean;
  size?: 'lg' | 'md';
}) {
  return (
    <Paper sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 1.25, minWidth: 0 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
        <Typography component="span" sx={{ fontSize: 14, color: 'text.secondary' }}>
          {label}
        </Typography>
        <MenuIdChip id={menuId} />
      </Box>
      {loading ? (
        <Skeleton width="50%" height={size === 'lg' ? 44 : 34} />
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, flexWrap: 'wrap' }}>
          <Typography component="span" sx={{ fontSize: size === 'lg' ? 36 : 28, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
            {value}
          </Typography>
          {sub && (
            <Typography component="span" sx={{ fontSize: 14, color: 'text.secondary' }}>
              {sub}
            </Typography>
          )}
        </Box>
      )}
      {progress != null && !loading && <ProgressBar value={progress} tone={progressTone} />}
      {footer && <Box>{footer}</Box>}
    </Paper>
  );
}
