'use client';

import Link from 'next/link';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { SUBSCRIPTION_STATUS, won, type BillingWidgetData } from '@/lib/billing';
import { percent } from '@/lib/format';
import { useT } from '@/lib/i18n';

/** DASH-007 구독·수납 현황 — 원장·실장 대시보드에만 */
export default function BillingWidget({ instId }: { instId?: string }) {
  const t = useT();
  const q = useQuery({ queryKey: ['dashboard', 'billing', instId], queryFn: () => api.get<BillingWidgetData>('dashboard/billing'), enabled: !!instId, refetchInterval: 300_000 });
  const d = q.data;
  const inv = d?.invoices;
  const st = d ? SUBSCRIPTION_STATUS[d.status] : null;

  return (
    <Paper>
      <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ flex: 1 }}>
          {t('구독 · 수납 현황')}
        </Typography>
        <Chip size="small" variant="outlined" label="DASH-007" />
      </Box>
      <Divider />
      {q.isLoading || !d || !inv ? (
        <Box sx={{ p: 2 }}>
          <Skeleton />
          <Skeleton />
        </Box>
      ) : (
        <Stack spacing={2} sx={{ p: 2 }}>
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography sx={{ fontWeight: 700 }}>{t('{0} 플랜', { 0: d.planName })}</Typography>
              {st && <Chip size="small" label={t(st.label)} color={st.color} />}
              <Typography variant="caption" color="text.secondary" sx={{ flex: 1, textAlign: 'right' }}>
                {d.status === 'TRIAL' && d.trialDaysLeft !== null ? t('체험 {0}일 남음', { 0: d.trialDaysLeft }) : d.nextBillingDate ? t('다음 결제 {0}', { 0: dayjs(d.nextBillingDate).format('M/D') }) : ''}
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {t('원생 {0}', { 0: d.studentCount })}
              {d.studentLimit !== null ? t(' / {0}명 ({1})', { 0: d.studentLimit, 1: percent(d.usagePercent) }) : t('명 (제한 없음)')}
            </Typography>
            {d.usagePercent !== null && <LinearProgress variant="determinate" value={Math.min(100, d.usagePercent)} color={d.usagePercent >= 90 ? 'warning' : 'primary'} sx={{ mt: 0.5, height: 6, borderRadius: 3 }} />}
          </Box>
          <Divider />
          <Box component={Link} href="/invoices" sx={{ color: 'inherit', textDecoration: 'none' }}>
            <Typography variant="caption" color="text.secondary">
              {dayjs(inv.month + '-01').format(t('M월'))}{' '}{t('원비')}
            </Typography>
            <Stack direction="row" spacing={3} sx={{ mt: 0.5 }}>
              <Box>
                <Typography variant="h3">{won(inv.totalAmount)}</Typography>
                <Typography variant="caption" color="text.secondary">{t('청구액')}</Typography>
              </Box>
              <Box>
                <Typography variant="h3">{inv.collectionRate === null ? '-' : percent(inv.collectionRate)}</Typography>
                <Typography variant="caption" color="text.secondary">{t('수납률')}</Typography>
              </Box>
              <Box>
                <Typography variant="h3" color={inv.overdueCount > 0 ? 'error' : undefined}>{t('{0}건', { 0: inv.unpaidCount })}</Typography>
                <Typography variant="caption" color="text.secondary">{t('미납')}{inv.overdueCount > 0 ? t(' (연체 {0})', { 0: inv.overdueCount }) : ''}</Typography>
              </Box>
            </Stack>
          </Box>
        </Stack>
      )}
    </Paper>
  );
}
