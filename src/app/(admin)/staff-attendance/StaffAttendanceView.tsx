'use client';

import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
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
import { time } from '@/lib/format';
import { hours, type StaffMonthly, type StaffRecord } from '@/lib/ops';
import { useSession } from '@/lib/session';
import PageHeader from '@/components/PageHeader';

/** STF-004 교직원 출퇴근 — 본인 출·퇴근 기록, 원장·실장은 월별 근무 집계 */
export default function StaffAttendanceView() {
  const qc = useQueryClient();
  const { session, manager } = useSession();
  const instId = session?.institution?.institutionId;
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'));

  const today = useQuery({ queryKey: ['staff-att-today', instId], queryFn: () => api.get<{ record: StaffRecord | null }>('staff-attendance/today'), enabled: !!instId });
  const monthly = useQuery({
    queryKey: ['staff-att-monthly', instId, month],
    queryFn: () => api.get<StaffMonthly[]>('staff-attendance/monthly', { month }),
    enabled: !!instId && manager,
  });
  const refresh = () => (qc.invalidateQueries({ queryKey: ['staff-att-today'] }), qc.invalidateQueries({ queryKey: ['staff-att-monthly'] }));
  const checkIn = useMutation({ mutationFn: () => api.post('staff-attendance/check-in'), onSuccess: refresh });
  const checkOut = useMutation({ mutationFn: () => api.post('staff-attendance/check-out'), onSuccess: refresh });

  const rec = today.data?.record;
  const err = checkIn.error ?? checkOut.error ?? today.error;

  return (
    <>
      <PageHeader title="교직원 출퇴근" menuId="STF-004" description="출근·퇴근 버튼으로 오늘의 근무 시간을 기록합니다." />
      {err && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage(err)}</Alert>}
      <Paper variant="outlined" sx={{ p: 2.5, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" rowGap={1}>
          <Typography variant="h6">{dayjs().format('M월 D일')}</Typography>
          <Typography color="text.secondary">
            {!rec ? '아직 출근 기록이 없습니다' : rec.checkOut ? `출근 ${time(rec.checkIn)} · 퇴근 ${time(rec.checkOut)}${rec.workedMinutes != null ? ` (${hours(rec.workedMinutes)})` : ''}` : `${time(rec.checkIn)} 출근 · 근무 중`}
          </Typography>
          <Button variant="contained" disabled={!!rec || checkIn.isPending} onClick={() => checkIn.mutate()}>출근</Button>
          <Button variant="outlined" disabled={!rec || !!rec.checkOut || checkOut.isPending} onClick={() => checkOut.mutate()}>퇴근</Button>
        </Stack>
      </Paper>

      {manager && (
        <>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1.5 }}>
            <Typography variant="h6">월별 근무 집계</Typography>
            <TextField size="small" type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
          </Stack>
          {monthly.isFetching && <LinearProgress />}
          <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow><TableCell>교직원</TableCell><TableCell align="right">근무일</TableCell><TableCell align="right">총 근무</TableCell><TableCell>기록</TableCell></TableRow>
              </TableHead>
              <TableBody>
                {monthly.data?.map((m) => (
                  <TableRow key={m.userId}>
                    <TableCell>{m.userName}</TableCell>
                    <TableCell align="right">{m.days}일</TableCell>
                    <TableCell align="right">{hours(m.totalMinutes)}</TableCell>
                    <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>
                      {m.records.map((r) => `${dayjs(r.workDate).format('D')}일 ${time(r.checkIn)}–${time(r.checkOut)}`).join(' · ')}
                    </TableCell>
                  </TableRow>
                ))}
                {monthly.data?.length === 0 && (
                  <TableRow><TableCell colSpan={4} align="center" sx={{ py: 5, color: 'text.secondary' }}>이 달의 기록이 없습니다</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>
        </>
      )}
    </>
  );
}
