'use client';

import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import { useSession } from '@/lib/session';
import type { LatLng, TripHistory, TripLive } from '@/lib/shuttle';
import ShuttleMap from '@/components/ShuttleMap';
import { useT } from '@/lib/i18n';

/** 날짜별 운행 기록과 이동 경로 (좌표는 30일 보관) */
export default function HistoryTab() {
  const tr = useT();
  const { session } = useSession();
  const instId = session?.institution?.institutionId;
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [sel, setSel] = useState<string | null>(null);
  const list = useQuery({ queryKey: ['shuttle', 'history', instId, date], queryFn: () => api.get<TripHistory[]>('shuttle/trips', { date }), enabled: !!instId });
  const trip = useQuery({ queryKey: ['shuttle', 'trip', sel], queryFn: () => api.get<TripLive>(`shuttle/trips/${sel}`), enabled: !!sel });
  const path = useQuery({ queryKey: ['shuttle', 'path', sel], queryFn: () => api.get<LatLng[]>(`shuttle/trips/${sel}/path`), enabled: !!sel });
  return (
    <Stack spacing={2}>
      <TextField size="small" type="date" label={tr('날짜')} value={date} onChange={(e) => e.target.value && setDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 180 }} />
      {list.isError && <Alert severity="error">{errorMessage(list.error)}</Alert>}
      <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead><TableRow><TableCell>{tr('노선')}</TableCell><TableCell>{tr('기사')}</TableCell><TableCell>{tr('출발')}</TableCell><TableCell>{tr('종료')}</TableCell><TableCell align="right">{tr('좌표 수')}</TableCell><TableCell>{tr('상태')}</TableCell></TableRow></TableHead>
          <TableBody>
            {list.data?.map((t) => (
              <TableRow key={t.id} hover selected={t.id === sel} sx={{ cursor: 'pointer' }} onClick={() => setSel(t.id)}>
                <TableCell>{t.routeName}</TableCell>
                <TableCell>{t.driverName}</TableCell>
                <TableCell>{dayjs(t.startedAt).format('HH:mm')}</TableCell>
                <TableCell>{t.endedAt ? dayjs(t.endedAt).format('HH:mm') : '-'}</TableCell>
                <TableCell align="right">{t.pointCount}</TableCell>
                <TableCell>{t.status === 'RUNNING' ? <Chip size="small" color="success" label={tr('운행 중')} /> : <Chip size="small" label={tr('종료')} />}</TableCell>
              </TableRow>
            ))}
            {list.data?.length === 0 && <TableRow><TableCell colSpan={6} align="center">{tr('이 날짜의 운행이 없습니다')}</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Paper>
      {sel && <ShuttleMap height={420} fitKey={`${sel}-${path.data?.length ?? 0}`} path={path.data ?? []} stops={trip.data?.stops.map((s) => ({ ...s, passed: false, etaMinutes: null })) ?? []} />}
    </Stack>
  );
}
