import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import InboxIcon from '@mui/icons-material/InboxOutlined';
import { color } from '@/theme/tokens';

/** 빈 상태 — 아이콘 + 제목 + 설명 + (선택) 행동 버튼 */
export default function EmptyState({ title, description, action, icon, dense }: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  dense?: boolean;
}) {
  return (
    <Box sx={{ py: dense ? 3 : 6, px: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, textAlign: 'center' }}>
      <Box
        aria-hidden
        sx={{ width: 44, height: 44, borderRadius: '12px', bgcolor: color.neutral, color: color.textSecondary, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 0.5 }}
      >
        {icon ?? <InboxIcon />}
      </Box>
      <Typography sx={{ fontSize: 15, fontWeight: 600 }}>{title}</Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
          {description}
        </Typography>
      )}
      {action && <Box sx={{ mt: 1 }}>{action}</Box>}
    </Box>
  );
}
