'use client';

import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import { WEEKDAY, type Slot } from '@/lib/ops';
import { useSession } from '@/lib/session';
import type { Classroom } from '@/lib/types';
import PageHeader from '@/components/PageHeader';
import { useT } from '@/lib/i18n';

interface Row { weekday: number; startTime: string; endTime: string; subject: string; room: string }
const hm = (t: string) => t.slice(0, 5);

/** CLS-003 시간표 — 요일별 수업 배치. 같은 반·같은 교사의 겹치는 시간은 서버가 막는다 */
export default function TimetableView() {
  const tr = useT();
  const qc = useQueryClient();
  const { session, manager } = useSession();
  const instId = session?.institution?.institutionId;
  const [classId, setClassId] = useState('');
  const [editing, setEditing] = useState(false);

  const slots = useQuery({ queryKey: ['timetable', instId], queryFn: () => api.get<Slot[]>('timetable'), enabled: !!instId });
  const classes = useQuery({ queryKey: ['classes', instId], queryFn: () => api.get<Classroom[]>('classes'), enabled: !!instId });

  const shown = (slots.data ?? []).filter((s) => !classId || s.classroomId === classId);
  const byDay = (d: number) => shown.filter((s) => s.weekday === d).sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <>
      <PageHeader
        title={tr('시간표')}
        menuId="CLS-003"
        description={tr('반별 요일·시간 수업을 한눈에 봅니다. 학부모 앱에서는 자녀 반의 시간표만 보입니다.')}
        actions={
          manager && (
            <Button variant="contained" disabled={!classId} onClick={() => setEditing(true)}>
              {classId ? tr('이 반 시간표 편집') : tr('반을 선택하세요')}
            </Button>
          )
        }
      />
      <TextField select size="small" label={tr('반')} value={classId} onChange={(e) => setClassId(e.target.value)} sx={{ minWidth: 200, mb: 2 }}>
        <MenuItem value="">{tr('전체')}</MenuItem>
        {classes.data?.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
      </TextField>
      {slots.isError && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage(slots.error)}</Alert>}
      {slots.isFetching && <LinearProgress />}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(7, 1fr)' }, gap: 1 }}>
        {[1, 2, 3, 4, 5, 6, 7].map((d) => (
          <Paper key={d} variant="outlined" sx={{ p: 1, minHeight: 120 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>{tr(WEEKDAY[d])}</Typography>
            <Stack spacing={0.75}>
              {byDay(d).map((s) => (
                <Box key={s.id} sx={{ p: 0.75, borderRadius: 1, bgcolor: 'action.hover' }}>
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>{hm(s.startTime)}–{hm(s.endTime)}</Typography>
                  <Typography variant="body2">{s.subject ?? s.classroomName}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {[!classId && s.classroomName, s.room, s.teacher?.name].filter(Boolean).join(' · ')}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Paper>
        ))}
      </Box>
      {editing && classId && (
        <EditDialog
          classId={classId}
          className={classes.data?.find((c) => c.id === classId)?.name ?? ''}
          initial={(slots.data ?? []).filter((s) => s.classroomId === classId)}
          onClose={() => setEditing(false)}
          onSaved={() => (setEditing(false), qc.invalidateQueries({ queryKey: ['timetable'] }))}
        />
      )}
    </>
  );
}

function EditDialog({ classId, className, initial, onClose, onSaved }: { classId: string; className: string; initial: Slot[]; onClose: () => void; onSaved: () => void }) {
  const tr = useT();
  const [rows, setRows] = useState<Row[]>(
    initial.map((s) => ({ weekday: s.weekday, startTime: hm(s.startTime), endTime: hm(s.endTime), subject: s.subject ?? '', room: s.room ?? '' })),
  );
  const save = useMutation({
    mutationFn: () =>
      api.put(`classes/${classId}/timetable`, {
        slots: rows.map((r) => ({ weekday: r.weekday, startTime: r.startTime, endTime: r.endTime, subject: r.subject.trim() || null, room: r.room.trim() || null })),
      }),
    onSuccess: onSaved,
  });
  const set = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const valid = rows.every((r) => r.startTime && r.endTime && r.startTime < r.endTime);

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{tr('{0} 시간표', { 0: className })}</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ pt: 1 }}>
          {save.isError && <Alert severity="error">{errorMessage(save.error)}</Alert>}
          {rows.map((r, i) => (
            <Stack key={i} direction="row" spacing={1} alignItems="center">
              <TextField select size="small" label={tr('요일')} value={r.weekday} onChange={(e) => set(i, { weekday: Number(e.target.value) })} sx={{ width: 90 }}>
                {[1, 2, 3, 4, 5, 6, 7].map((d) => <MenuItem key={d} value={d}>{tr(WEEKDAY[d])}</MenuItem>)}
              </TextField>
              <TextField size="small" type="time" label={tr('시작')} value={r.startTime} onChange={(e) => set(i, { startTime: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
              <TextField size="small" type="time" label={tr('종료')} value={r.endTime} onChange={(e) => set(i, { endTime: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
              <TextField size="small" label={tr('과목')} value={r.subject} onChange={(e) => set(i, { subject: e.target.value })} slotProps={{ htmlInput: { maxLength: 50 } }} />
              <TextField size="small" label={tr('교실')} value={r.room} onChange={(e) => set(i, { room: e.target.value })} slotProps={{ htmlInput: { maxLength: 30 } }} sx={{ width: 110 }} />
              <IconButton aria-label={tr('삭제')} onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}><DeleteIcon /></IconButton>
            </Stack>
          ))}
          <Box>
            <Button onClick={() => setRows((rs) => [...rs, { weekday: 1, startTime: '14:00', endTime: '15:00', subject: '', room: '' }])} disabled={rows.length >= 35}>
              {tr('+ 수업 추가')}
            </Button>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{tr('취소')}</Button>
        <Button variant="contained" disabled={!valid || save.isPending} onClick={() => save.mutate()}>{tr('저장')}</Button>
      </DialogActions>
    </Dialog>
  );
}
