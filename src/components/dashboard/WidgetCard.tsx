'use client';

import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

/** 대시보드 위젯 틀: 제목 + 메뉴ID + (선택) 오른쪽 버튼 */
export default function WidgetCard({ title, menuId, actions, children, loading, empty }: {
  title: string;
  menuId?: string;
  actions?: ReactNode;
  children?: ReactNode;
  loading?: boolean;
  /** 내용이 없을 때 보여 줄 문장 (지정하면 children 대신) */
  empty?: string | false;
}) {
  return (
    <Paper>
      <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="h4" sx={{ flex: 1 }}>
          {title}
        </Typography>
        {actions}
        {menuId && <Chip size="small" variant="outlined" label={menuId} />}
      </Box>
      <Divider />
      {loading ? (
        <Box sx={{ p: 2 }}>
          <Skeleton />
          <Skeleton />
        </Box>
      ) : empty ? (
        <Typography variant="body2" color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
          {empty}
        </Typography>
      ) : (
        children
      )}
    </Paper>
  );
}
