import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';

/** 화면 제목 + IA 메뉴ID 라벨 (기획서: 모든 화면에 메뉴ID 부여 → 개발 티켓과 1:1) */
export default function PageHeader({ title, menuId, description, actions }: { title: string; menuId?: string; description?: string; actions?: ReactNode }) {
  return (
    <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: 1.5, mb: 3 }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h2">{title}</Typography>
          {menuId && <Chip size="small" variant="outlined" label={menuId} sx={{ color: 'text.secondary' }} />}
        </Box>
        {description && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {description}
          </Typography>
        )}
      </Box>
      {actions && <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>{actions}</Box>}
    </Box>
  );
}
