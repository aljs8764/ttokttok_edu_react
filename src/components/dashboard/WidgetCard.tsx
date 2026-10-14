'use client';

import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import MenuIdChip from '@/components/ui/MenuIdChip';

/**
 * 대시보드 위젯 틀 — 디자인 섹션 카드: 제목(17/700) + 메뉴ID + (선택) 오른쪽 버튼.
 * 내용은 카드 가장자리까지 붙는다(목록·표). 여백이 필요한 내용은 각 위젯이 p 를 준다.
 */
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
    <Paper component="section" aria-label={title} sx={{ pb: 1, overflow: 'hidden' }}>
      <Box sx={{ px: 3, pt: 2.5, pb: 1.5, display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
        <Typography variant="h4" component="h3" sx={{ flex: 1, minWidth: 0 }}>
          {title}
        </Typography>
        {actions}
        <MenuIdChip id={menuId} />
      </Box>
      {loading ? (
        <Box sx={{ px: 3, pb: 2 }}>
          <Skeleton />
          <Skeleton />
        </Box>
      ) : empty ? (
        <Typography variant="body2" color="text.secondary" sx={{ px: 3, py: 3, textAlign: 'center' }}>
          {empty}
        </Typography>
      ) : (
        <Box sx={{ '& .MuiListItem-root, & .MuiListItemButton-root': { px: 3 }, '& .MuiTableCell-root:first-of-type': { pl: 3 }, '& .MuiTableCell-root:last-of-type': { pr: 3 } }}>{children}</Box>
      )}
    </Paper>
  );
}
