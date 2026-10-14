import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import MenuIdChip from './MenuIdChip';

/**
 * 섹션 카드 — 제목(17/700) + 메뉴ID + 우측 액션. 카드 12px·테두리 1px·패딩 20×24.
 * 표처럼 가장자리까지 붙는 내용은 `flush` 로 본문 패딩을 없앤다.
 */
export default function SectionCard({ title, menuId, subtitle, actions, children, flush, loading, component = 'section', sx }: {
  title?: ReactNode;
  menuId?: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  flush?: boolean;
  loading?: boolean;
  component?: 'section' | 'div' | 'aside';
  sx?: object;
}) {
  const hasHead = title || menuId || actions;
  return (
    <Paper component={component} sx={{ px: flush ? 0 : 3, py: 2.5, minWidth: 0, ...sx }}>
      {hasHead && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5, px: flush ? 3 : 0, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flex: 1, minWidth: 0 }}>
            {title && (
              <Typography variant="h4" component="h3">
                {title}
              </Typography>
            )}
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          {actions && <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>{actions}</Box>}
          <MenuIdChip id={menuId} />
        </Box>
      )}
      {loading ? (
        <Box sx={{ px: flush ? 3 : 0 }}>
          <Skeleton />
          <Skeleton />
          <Skeleton width="60%" />
        </Box>
      ) : (
        children
      )}
    </Paper>
  );
}
