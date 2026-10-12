'use client';

import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import dayjs from 'dayjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import { won } from '@/lib/billing';
import type { PlatformMetrics } from '@/lib/platform';
import { useT } from '@/lib/i18n';

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="h3">{value}</Typography>
      {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
    </Paper>
  );
}

/** SAAS-007 MRR·ARR·Churn·CAC */
export default function MetricsTab() {
  const tr = useT();
  const qc = useQueryClient();
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'));
  const [cost, setCost] = useState('');
  const q = useQuery({ queryKey: ['platform', 'metrics', month], queryFn: () => api.get<PlatformMetrics>('platform/metrics', { month }) });
  const save = useMutation({
    mutationFn: () => api.put<PlatformMetrics>(`platform/metrics/${month}/marketing-cost`, { amount: Number(cost.replace(/,/g, '')) }),
    onSuccess: () => { setCost(''); void qc.invalidateQueries({ queryKey: ['platform', 'metrics'] }); },
  });
  const m = q.data;
  const maxMrr = Math.max(1, ...(m?.trend.map((t) => t.mrr) ?? [1]));

  return (
    <Stack spacing={2}>
      <TextField size="small" type="month" label={tr('기준 월')} value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 180 }} />
      {q.isError && <Alert severity="error">{errorMessage(q.error)}</Alert>}
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' } }}>
        <Stat label={tr('MRR (월 반복 매출)')} value={m ? won(m.mrr) : '-'} sub={tr('현재 플랜 가격 기준 근사')} />
        <Stat label="ARR" value={m ? won(m.arr) : '-'} />
        <Stat label={tr('유료 기관')} value={m ? tr('{0}곳', { 0: m.payingInstitutions }) : '-'} sub={m ? tr('체험 중 {0}곳', { 0: m.trialInstitutions }) : ''} />
        <Stat label={tr('이번 달 신규 / 해지')} value={m ? `${m.newPaid} / ${m.churned}` : '-'} />
        <Stat label="Churn Rate" value={m?.churnRate != null ? `${m.churnRate.toFixed(1)}%` : '-'} sub={tr('해지 ÷ 월초 유료 기관')} />
        <Stat label="CAC" value={m?.cac != null ? won(m.cac) : '-'} sub={tr('마케팅 비용 ÷ 신규 유료')} />
        <Stat label={tr('마케팅·영업 비용')} value={m?.marketingCost != null ? won(m.marketingCost) : tr('미입력')} />
      </Box>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>{tr('{0} 마케팅·영업 비용 입력 (CAC 계산용)', { 0: month })}</Typography>
        <Stack direction="row" spacing={1}>
          <TextField size="small" label={tr('금액(원)')} value={cost} onChange={(e) => setCost(e.target.value.replace(/[^\d,]/g, ''))} />
          <Button variant="outlined" disabled={!cost || save.isPending} onClick={() => save.mutate()}>{tr('저장')}</Button>
        </Stack>
        {save.isError && <Alert severity="error" sx={{ mt: 1 }}>{errorMessage(save.error)}</Alert>}
      </Paper>
      <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow><TableCell>{tr('월')}</TableCell><TableCell align="right">{tr('신규 유료')}</TableCell><TableCell align="right">{tr('해지')}</TableCell><TableCell align="right">{tr('유료 기관(월말)')}</TableCell><TableCell sx={{ minWidth: 220 }}>MRR</TableCell></TableRow>
          </TableHead>
          <TableBody>
            {m?.trend.map((t) => (
              <TableRow key={t.month}>
                <TableCell>{t.month}</TableCell>
                <TableCell align="right">{t.newPaid}</TableCell>
                <TableCell align="right">{t.churned}</TableCell>
                <TableCell align="right">{t.activeAtEnd}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ height: 8, borderRadius: 1, bgcolor: 'primary.main', width: `${(t.mrr / maxMrr) * 100}%`, minWidth: 2, maxWidth: 140 }} />
                    <Typography variant="caption">{won(t.mrr)}</Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Stack>
  );
}
