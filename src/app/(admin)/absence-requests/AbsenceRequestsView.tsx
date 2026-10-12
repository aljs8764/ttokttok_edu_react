'use client';

import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import dayjs from 'dayjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import { ABSENCE_KIND, ABSENCE_STATUS, type AbsenceRequest, type AbsenceStatus } from '@/lib/comm';
import { dateTime, hm } from '@/lib/format';
import { ownerEventDestinations, useRealtime } from '@/lib/realtime';
import { useSession } from '@/lib/session';
import PageHeader from '@/components/PageHeader';
import { useT } from '@/lib/i18n';

/** ATT-007 학부모가 앱에서 미리 낸 결석·지각·조퇴 신청. 확인하면 학부모에게 푸시가 간다 (출결 기록 자체는 바꾸지 않음) */
export default function AbsenceRequestsView() {
  const t = useT();
  const qc = useQueryClient();
  const { session, manager } = useSession();
  const instId = session?.institution?.institutionId;
  const [from, setFrom] = useState(dayjs().format('YYYY-MM-DD'));
  const [to, setTo] = useState(dayjs().add(14, 'day').format('YYYY-MM-DD'));
  const [status, setStatus] = useState<AbsenceStatus | ''>('');

  const list = useQuery({
    queryKey: ['absence-requests', instId, from, to, status],
    queryFn: () => api.get<AbsenceRequest[]>('absence-requests', { from, to, status: status || undefined }),
    enabled: !!instId,
  });
  useRealtime(ownerEventDestinations(manager, instId), (msg) => {
    if (msg.type === 'absence.requested') void qc.invalidateQueries({ queryKey: ['absence-requests'] });
  });

  const ack = useMutation({
    mutationFn: (id: string) => api.post(`absence-requests/${id}/acknowledge`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['absence-requests'] }),
  });

  return (
    <>
      <PageHeader title={t('결석·지각 신청')} menuId="ATT-007" description={t('학부모가 미리 알려 온 결석·지각·조퇴입니다. 교사는 담당 반 원생 건만 보입니다.')} />
      <Stack direction="row" spacing={1.5} sx={{ mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
        <TextField size="small" type="date" label={t('시작일')} value={from} onChange={(e) => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
        <TextField size="small" type="date" label={t('종료일')} value={to} onChange={(e) => setTo(e.target.value)} InputLabelProps={{ shrink: true }} />
        <TextField select size="small" label={t('상태')} value={status} onChange={(e) => setStatus(e.target.value as AbsenceStatus | '')} sx={{ minWidth: 130 }}>
          <MenuItem value="">{t('전체')}</MenuItem>
          {(Object.keys(ABSENCE_STATUS) as AbsenceStatus[]).map((s) => (
            <MenuItem key={s} value={s}>
              {t(ABSENCE_STATUS[s].label)}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
      {list.isError && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage(list.error)}</Alert>}
      {ack.isError && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage(ack.error)}</Alert>}
      <Paper>
        {list.isFetching && <LinearProgress />}
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('날짜')}</TableCell>
                <TableCell>{t('원생')}</TableCell>
                <TableCell>{t('구분')}</TableCell>
                <TableCell>{t('사유')}</TableCell>
                <TableCell>{t('보호자')}</TableCell>
                <TableCell>{t('상태')}</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {list.data?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    {t('신청이 없습니다')}
                  </TableCell>
                </TableRow>
              )}
              {list.data?.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{dayjs(r.date).format('M/D (dd)')}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{r.studentName}</TableCell>
                  <TableCell>
                    <Chip size="small" label={`${t(ABSENCE_KIND[r.kind])}${r.expectedTime ? ` ${hm(r.expectedTime)}` : ''}`} variant="outlined" />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 320 }}>
                    <Typography variant="body2" noWrap title={r.reason}>
                      {r.reason}
                    </Typography>
                  </TableCell>
                  <TableCell>{r.guardianName}</TableCell>
                  <TableCell>
                    <Chip size="small" label={t(ABSENCE_STATUS[r.status].label)} color={ABSENCE_STATUS[r.status].color} />
                    {r.acknowledgedAt && (
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                        {dateTime(r.acknowledgedAt)}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    {r.status === 'SUBMITTED' && (
                      <Button size="small" variant="outlined" disabled={ack.isPending} onClick={() => ack.mutate(r.id)}>
                        {t('확인')}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </>
  );
}
