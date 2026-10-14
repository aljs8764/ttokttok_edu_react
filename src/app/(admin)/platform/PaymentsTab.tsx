'use client';

import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import dayjs from 'dayjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import { won } from '@/lib/billing';
import { PAYMENT_STATUS, type PlatformPayment } from '@/lib/platform';
import { useT } from '@/lib/i18n';

/** SAAS-002 구독 결제 관리 (실패 재시도·환불) */
export default function PaymentsTab() {
  const t = useT();
  const qc = useQueryClient();
  const [status, setStatus] = useState('');
  const [month, setMonth] = useState('');
  const q = useQuery({ queryKey: ['platform', 'payments', status, month], queryFn: () => api.get<PlatformPayment[]>('platform/payments', { status, month }) });
  const act = useMutation({
    mutationFn: (v: { id: string; op: 'retry' | 'refund' }) => api.post(`platform/payments/${v.id}/${v.op}`),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['platform'] }); },
  });
  return (
    <>
      {(q.isError || act.isError) && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage(q.error ?? act.error)}</Alert>}
      <Paper sx={{ overflowX: 'auto', pt: 2.5 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} useFlexGap flexWrap="wrap" sx={{ px: 3, pb: 2, position: 'sticky', left: 0 }}>
          <TextField select size="small" label={t('상태')} value={status} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 130 }}>
            <MenuItem value="">{t('전체')}</MenuItem>
            {Object.entries(PAYMENT_STATUS).map(([k, v]) => <MenuItem key={k} value={k}>{t(v.label)}</MenuItem>)}
          </TextField>
          <TextField size="small" type="month" label={t('월')} value={month} onChange={(e) => setMonth(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        </Stack>
        <Table size="small">
          <TableHead>
            <TableRow><TableCell>{t('기관')}</TableCell><TableCell>{t('플랜')}</TableCell><TableCell>{t('이용 기간')}</TableCell><TableCell align="right">{t('금액')}</TableCell><TableCell>{t('상태')}</TableCell><TableCell>{t('기록일')}</TableCell><TableCell align="right">{t('처리')}</TableCell></TableRow>
          </TableHead>
          <TableBody>
            {q.data?.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.institutionName}</TableCell>
                <TableCell>{p.planCode}</TableCell>
                <TableCell>{p.periodStart} ~ {p.periodEnd}</TableCell>
                <TableCell align="right">{won(p.amount)}</TableCell>
                <TableCell>
                  <Chip size="small" color={PAYMENT_STATUS[p.status].color} label={t(PAYMENT_STATUS[p.status].label)} />
                  {p.failureReason && <span style={{ marginLeft: 6, fontSize: 12 }}>{p.failureReason}</span>}
                </TableCell>
                <TableCell>{dayjs(p.createdAt).format('YYYY-MM-DD')}</TableCell>
                <TableCell align="right">
                  {p.status === 'FAILED' && <Button size="small" onClick={() => act.mutate({ id: p.id, op: 'retry' })}>{t('재시도 성공 처리')}</Button>}
                  {p.status === 'PAID' && <Button size="small" color="error" onClick={() => window.confirm(t('환불 처리할까요?')) && act.mutate({ id: p.id, op: 'refund' })}>{t('환불')}</Button>}
                </TableCell>
              </TableRow>
            ))}
            {q.data?.length === 0 && <TableRow><TableCell colSpan={7} align="center">{t('결제 내역이 없습니다')}</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Paper>
    </>
  );
}
