'use client';

import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Stack from '@mui/material/Stack';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PlatformNotice } from '@/lib/platform';

/** SAAS-005 운영사 공지·점검 안내 배너 (모든 로그인 사용자) */
export default function PlatformNoticeBanner() {
  const { data } = useQuery({
    queryKey: ['platform-notices', 'active'],
    queryFn: () => api.get<PlatformNotice[]>('platform-notices/active'),
    refetchInterval: 5 * 60_000,
    retry: false,
  });
  if (!data || data.length === 0) return null;
  return (
    <Stack spacing={1} sx={{ mb: 2 }}>
      {data.map((n) => (
        <Alert key={n.id} severity={n.kind === 'MAINTENANCE' ? 'warning' : 'info'}>
          <AlertTitle>{n.kind === 'MAINTENANCE' ? '[점검] ' : ''}{n.title}</AlertTitle>
          {n.body}
          {n.endsAt && <> (~ {dayjs(n.endsAt).format('M/D HH:mm')})</>}
        </Alert>
      ))}
    </Stack>
  );
}
