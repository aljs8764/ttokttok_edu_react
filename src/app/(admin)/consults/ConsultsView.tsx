'use client';

import { useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import dayjs from 'dayjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import { useSession } from '@/lib/session';
import type { StaffMember } from '@/lib/types';
import PageHeader from '@/components/PageHeader';

type ConsultStatus = 'OPEN' | 'BOOKED' | 'CANCELED' | 'DONE';
interface ConsultSlot {
  id: string;
  teacher: { id: string; name: string };
  startsAt: string;
  endsAt: string;
  mode: 'IN_PERSON' | 'PHONE' | 'VIDEO';
  modeLabel: string;
  location: string | null;
  status: ConsultStatus;
  student: { id: string; name: string } | null;
  bookedBy: { id: string; name: string } | null;
  topic: string | null;
  bookedAt: string | null;
  cancelReason: string | null;
}

const STATUS: Record<ConsultStatus, { label: string; color: 'default' | 'success' | 'info' | 'warning' }> = {
  OPEN: { label: '예약 가능', color: 'default' },
  BOOKED: { label: '예약됨', color: 'success' },
  DONE: { label: '완료', color: 'info' },
  CANCELED: { label: '취소', color: 'warning' },
};

function OpenDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { session, manager } = useSession();
  const instId = session?.institution?.institutionId;
  const staff = useQuery({ queryKey: ['staff', instId], queryFn: () => api.get<StaffMember[]>('staff'), enabled: !!instId && manager });
  const [f, setF] = useState({ date: dayjs().add(1, 'day').format('YYYY-MM-DD'), startTime: '16:00', minutes: '20', count: '4', breakMinutes: '10', mode: 'IN_PERSON', location: '', teacherId: '' });
  const save = useMutation({
    mutationFn: () => api.post<ConsultSlot[]>('consult-slots', {
      date: f.date, startTime: f.startTime, minutes: Number(f.minutes), count: Number(f.count), breakMinutes: Number(f.breakMinutes),
      mode: f.mode, location: f.location || null, teacherId: f.teacherId || null,
    }),
    onSuccess: () => { onDone(); onClose(); },
  });
  const preview = useMemo(() => {
    const out: string[] = [];
    let t = dayjs(`${f.date}T${f.startTime}`);
    for (let i = 0; i < Math.min(12, Number(f.count) || 0); i++) {
      const end = t.add(Number(f.minutes) || 0, 'minute');
      out.push(`${t.format('HH:mm')}~${end.format('HH:mm')}`);
      t = end.add(Number(f.breakMinutes) || 0, 'minute');
    }
    return out;
  }, [f]);
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>상담 시간 열기</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {save.isError && <Alert severity="error">{errorMessage(save.error)}</Alert>}
          {manager && (
            <TextField select size="small" label="상담 선생님" value={f.teacherId} onChange={(e) => setF({ ...f, teacherId: e.target.value })}>
              <MenuItem value="">나</MenuItem>
              {staff.data?.map((s) => <MenuItem key={s.userId} value={s.userId}>{s.name}</MenuItem>)}
            </TextField>
          )}
          <Stack direction="row" spacing={1}>
            <TextField size="small" type="date" label="날짜" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField size="small" type="time" label="첫 시작" value={f.startTime} onChange={(e) => setF({ ...f, startTime: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
          </Stack>
          <Stack direction="row" spacing={1}>
            <TextField size="small" type="number" label="1회 상담(분)" value={f.minutes} onChange={(e) => setF({ ...f, minutes: e.target.value })} />
            <TextField size="small" type="number" label="몇 번" value={f.count} onChange={(e) => setF({ ...f, count: e.target.value })} />
            <TextField size="small" type="number" label="사이 쉬는 시간(분)" value={f.breakMinutes} onChange={(e) => setF({ ...f, breakMinutes: e.target.value })} />
          </Stack>
          <Stack direction="row" spacing={1}>
            <TextField select size="small" label="방식" value={f.mode} onChange={(e) => setF({ ...f, mode: e.target.value })} sx={{ minWidth: 120 }}>
              <MenuItem value="IN_PERSON">대면</MenuItem><MenuItem value="PHONE">전화</MenuItem><MenuItem value="VIDEO">화상</MenuItem>
            </TextField>
            <TextField size="small" fullWidth label="장소·안내 (선택)" value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} />
          </Stack>
          <Typography variant="body2" color="text.secondary">만들어질 시간: {preview.join(', ') || '-'}</Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>취소</Button>
        <Button variant="contained" disabled={save.isPending || preview.length === 0} onClick={() => save.mutate()}>열기</Button>
      </DialogActions>
    </Dialog>
  );
}

/** NTC-008 후반 상담 예약 — 상담 가능한 시간을 열면 학부모가 앱에서 고른다 */
export default function ConsultsView() {
  const qc = useQueryClient();
  const { session, manager } = useSession();
  const instId = session?.institution?.institutionId;
  const [from, setFrom] = useState(dayjs().startOf('day'));
  const [openDialog, setOpenDialog] = useState(false);
  const to = from.add(13, 'day');
  const q = useQuery({
    queryKey: ['consults', instId, from.format('YYYY-MM-DD')],
    queryFn: () => api.get<ConsultSlot[]>('consult-slots', { from: from.format('YYYY-MM-DD'), to: to.format('YYYY-MM-DD') }),
    enabled: !!instId,
  });
  const refresh = () => void qc.invalidateQueries({ queryKey: ['consults'] });
  const act = useMutation({
    mutationFn: (v: { id: string; op: 'cancel' | 'done' | 'delete'; reason?: string }) =>
      v.op === 'delete' ? api.delete(`consult-slots/${v.id}`) : api.post(`consult-slots/${v.id}/${v.op}`, v.op === 'cancel' ? { reason: v.reason ?? null } : undefined),
    onSuccess: refresh,
  });
  const byDay = useMemo(() => {
    const m = new Map<string, ConsultSlot[]>();
    q.data?.forEach((s) => {
      const k = dayjs(s.startsAt).format('YYYY-MM-DD');
      m.set(k, [...(m.get(k) ?? []), s]);
    });
    return [...m.entries()];
  }, [q.data]);
  const booked = q.data?.filter((s) => s.status === 'BOOKED').length ?? 0;

  return (
    <>
      <PageHeader
        title="상담 예약"
        menuId="NTC-008"
        description={`상담 가능한 시간을 열어 두면 학부모가 앱에서 예약합니다. 예약·취소는 알림으로 알려 드립니다.${manager ? '' : ' 내 상담만 보입니다.'}`}
        actions={<Button variant="contained" onClick={() => setOpenDialog(true)}>상담 시간 열기</Button>}
      />
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <IconButton onClick={() => setFrom(from.subtract(14, 'day'))}><ChevronLeftIcon /></IconButton>
        <Typography variant="subtitle1">{from.format('M월 D일')} ~ {to.format('M월 D일')}</Typography>
        <IconButton onClick={() => setFrom(from.add(14, 'day'))}><ChevronRightIcon /></IconButton>
        <Button size="small" onClick={() => setFrom(dayjs().startOf('day'))}>오늘</Button>
        <Box sx={{ flex: 1 }} />
        <Typography variant="body2" color="text.secondary">예약 {booked}건</Typography>
      </Stack>
      {(q.isError || act.isError) && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage(q.error ?? act.error)}</Alert>}
      {q.isFetching && <LinearProgress />}
      {q.data?.length === 0 && <Alert severity="info">이 기간에 열린 상담 시간이 없습니다.</Alert>}
      <Stack spacing={2}>
        {byDay.map(([day, list]) => (
          <Paper key={day} variant="outlined" sx={{ overflowX: 'auto' }}>
            <Typography variant="subtitle2" sx={{ px: 2, pt: 1.5 }}>{dayjs(day).format('M월 D일 (dd)')}</Typography>
            <Table size="small">
              <TableHead>
                <TableRow><TableCell>시간</TableCell><TableCell>선생님</TableCell><TableCell>방식</TableCell><TableCell>상태</TableCell><TableCell>예약</TableCell><TableCell align="right">처리</TableCell></TableRow>
              </TableHead>
              <TableBody>
                {list.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{dayjs(s.startsAt).format('HH:mm')}~{dayjs(s.endsAt).format('HH:mm')}</TableCell>
                    <TableCell>{s.teacher.name}</TableCell>
                    <TableCell>{s.modeLabel}{s.location && <Typography variant="caption" color="text.secondary" display="block">{s.location}</Typography>}</TableCell>
                    <TableCell>
                      <Chip size="small" color={STATUS[s.status].color} label={STATUS[s.status].label} />
                      {s.cancelReason && <Typography variant="caption" color="text.secondary" display="block">{s.cancelReason}</Typography>}
                    </TableCell>
                    <TableCell>
                      {s.student ? (
                        <>
                          <Typography variant="body2">{s.student.name} · {s.bookedBy?.name}</Typography>
                          {s.topic && <Typography variant="caption" color="text.secondary">{s.topic}</Typography>}
                        </>
                      ) : '-'}
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      {s.status === 'BOOKED' && <Button size="small" onClick={() => act.mutate({ id: s.id, op: 'done' })}>완료</Button>}
                      {(s.status === 'OPEN' || s.status === 'BOOKED') && (
                        <Button size="small" color="error" onClick={() => {
                          const reason = s.status === 'BOOKED' ? window.prompt('취소 사유 (학부모에게 알림으로 갑니다)') : '';
                          if (reason === null) return;
                          act.mutate({ id: s.id, op: 'cancel', reason: reason || undefined });
                        }}>취소</Button>
                      )}
                      {(s.status === 'OPEN' || s.status === 'CANCELED') && !s.bookedBy && <Button size="small" onClick={() => act.mutate({ id: s.id, op: 'delete' })}>지우기</Button>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        ))}
      </Stack>
      {openDialog && <OpenDialog onClose={() => setOpenDialog(false)} onDone={refresh} />}
    </>
  );
}
