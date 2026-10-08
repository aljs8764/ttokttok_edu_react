'use client';

import { useState } from 'react';
import Link from 'next/link';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import { WEEKDAY, type EventTemplate } from '@/lib/ops';
import { useSession } from '@/lib/session';
import type { Target } from '@/lib/types';
import PageHeader from '@/components/PageHeader';
import TargetPicker, { toTargetRequest } from '@/components/TargetPicker';

const num = (v: string) => (v.trim() === '' ? null : Number(v));

/** EVT-002 반복 행사 템플릿 — 템플릿으로 행사를 한 번에 여러 날짜에 생성 */
export default function EventTemplatesView() {
  const qc = useQueryClient();
  const { session, manager } = useSession();
  const instId = session?.institution?.institutionId;
  const [edit, setEdit] = useState<EventTemplate | 'new' | null>(null);
  const [gen, setGen] = useState<EventTemplate | null>(null);

  const list = useQuery({ queryKey: ['event-templates', instId], queryFn: () => api.get<EventTemplate[]>('event-templates'), enabled: !!instId });
  const del = useMutation({ mutationFn: (id: string) => api.delete(`event-templates/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ['event-templates'] }) });

  return (
    <>
      <PageHeader
        title="행사 템플릿"
        menuId="EVT-002"
        description="자주 여는 행사(상담 주간, 정기 설명회 등)를 템플릿으로 저장하고 날짜만 골라 한 번에 생성합니다."
        actions={manager && <Button variant="contained" onClick={() => setEdit('new')}>템플릿 추가</Button>}
      />
      {(list.isError || del.isError) && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage(list.error ?? del.error)}</Alert>}
      {list.isFetching && <LinearProgress />}
      <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow><TableCell>템플릿</TableCell><TableCell>행사 제목</TableCell><TableCell>시간</TableCell><TableCell>RSVP</TableCell><TableCell align="right">관리</TableCell></TableRow>
          </TableHead>
          <TableBody>
            {list.data?.map((t) => (
              <TableRow key={t.id} hover>
                <TableCell>{t.name}</TableCell>
                <TableCell>{t.title}</TableCell>
                <TableCell>{t.startTime.slice(0, 5)} · {t.durationMinutes}분</TableCell>
                <TableCell>{t.rsvpEnabled ? <Chip size="small" label="사용" color="primary" /> : '-'}</TableCell>
                <TableCell align="right">
                  <Button size="small" onClick={() => setGen(t)}>행사 생성</Button>
                  {manager && <Button size="small" onClick={() => setEdit(t)}>수정</Button>}
                  {manager && <IconButton size="small" aria-label="삭제" onClick={() => confirm(`'${t.name}' 템플릿을 삭제할까요? 이미 만든 행사는 유지됩니다.`) && del.mutate(t.id)}><DeleteIcon fontSize="small" /></IconButton>}
                </TableCell>
              </TableRow>
            ))}
            {list.data?.length === 0 && <TableRow><TableCell colSpan={5} align="center" sx={{ py: 5, color: 'text.secondary' }}>템플릿이 없습니다</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Paper>
      {edit && <EditDialog tpl={edit === 'new' ? null : edit} onClose={() => setEdit(null)} onSaved={() => (setEdit(null), qc.invalidateQueries({ queryKey: ['event-templates'] }))} />}
      {gen && <GenerateDialog tpl={gen} onClose={() => setGen(null)} />}
    </>
  );
}

function EditDialog({ tpl, onClose, onSaved }: { tpl: EventTemplate | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    name: tpl?.name ?? '', title: tpl?.title ?? '', body: tpl?.body ?? '', location: tpl?.location ?? '',
    startTime: tpl?.startTime.slice(0, 5) ?? '10:00', duration: String(tpl?.durationMinutes ?? 60),
    rsvp: tpl?.rsvpEnabled ?? false, deadline: tpl?.rsvpDeadlineDaysBefore?.toString() ?? '', reminder: tpl?.reminderHoursBefore?.toString() ?? '',
  });
  const [targets, setTargets] = useState<Target[]>(tpl?.targets.map((t) => ({ scope: t.scope, id: t.id })) ?? [{ scope: 'ALL', id: null }]);
  const save = useMutation({
    mutationFn: () => {
      const body = {
        name: f.name.trim(), title: f.title.trim(), body: f.body.trim() || null, location: f.location.trim() || null,
        startTime: f.startTime, durationMinutes: Number(f.duration) || 60, targets: toTargetRequest(targets),
        rsvpEnabled: f.rsvp, rsvpDeadlineDaysBefore: f.rsvp ? num(f.deadline) : null, reminderHoursBefore: num(f.reminder),
      };
      return tpl ? api.put(`event-templates/${tpl.id}`, body) : api.post('event-templates', body);
    },
    onSuccess: onSaved,
  });
  const set = (k: 'name' | 'title' | 'body' | 'location' | 'startTime' | 'duration' | 'deadline' | 'reminder') => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{tpl ? '템플릿 수정' : '템플릿 추가'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {save.isError && <Alert severity="error">{errorMessage(save.error)}</Alert>}
          <TextField label="템플릿 이름" value={f.name} onChange={set('name')} required slotProps={{ htmlInput: { maxLength: 50 } }} />
          <TextField label="행사 제목" value={f.title} onChange={set('title')} required slotProps={{ htmlInput: { maxLength: 100 } }} />
          <TextField label="내용" value={f.body} onChange={set('body')} multiline minRows={3} slotProps={{ htmlInput: { maxLength: 5000 } }} />
          <TextField label="장소" value={f.location} onChange={set('location')} slotProps={{ htmlInput: { maxLength: 200 } }} />
          <Stack direction="row" spacing={1}>
            <TextField type="time" label="시작 시간" value={f.startTime} onChange={set('startTime')} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField type="number" label="진행 시간(분)" value={f.duration} onChange={set('duration')} slotProps={{ htmlInput: { min: 5, max: 1440 } }} />
            <TextField type="number" label="리마인더(시간 전)" value={f.reminder} onChange={set('reminder')} slotProps={{ htmlInput: { min: 1 } }} />
          </Stack>
          <FormControlLabel control={<Switch checked={f.rsvp} onChange={(e) => setF({ ...f, rsvp: e.target.checked })} />} label="참석 여부(RSVP) 받기" />
          {f.rsvp && <TextField type="number" label="응답 마감(행사 며칠 전)" value={f.deadline} onChange={set('deadline')} slotProps={{ htmlInput: { min: 0 } }} />}
          <Typography variant="subtitle2">대상</Typography>
          <TargetPicker value={targets} onChange={setTargets} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>취소</Button>
        <Button variant="contained" disabled={!f.name.trim() || !f.title.trim() || targets.length === 0 || save.isPending} onClick={() => save.mutate()}>저장</Button>
      </DialogActions>
    </Dialog>
  );
}

function GenerateDialog({ tpl, onClose }: { tpl: EventTemplate; onClose: () => void }) {
  const [mode, setMode] = useState<'dates' | 'range'>('range');
  const [dates, setDates] = useState('');
  const [from, setFrom] = useState('');
  const [until, setUntil] = useState('');
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const gen = useMutation({
    mutationFn: () =>
      api.post<{ eventIds: string[] }>(`event-templates/${tpl.id}/generate`,
        mode === 'dates' ? { dates: dates.split(/[\s,]+/).filter(Boolean) } : { from, until, weekdays }),
  });
  const ok = mode === 'dates' ? dates.trim().length > 0 : !!from && !!until && weekdays.length > 0;

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>‘{tpl.name}’로 행사 생성</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {gen.isError && <Alert severity="error">{errorMessage(gen.error)}</Alert>}
          {gen.data && (
            <Alert severity="success">
              행사 {gen.data.eventIds.length}건을 만들었습니다. <Link href="/event-calendar">달력에서 보기</Link>
            </Alert>
          )}
          <Stack direction="row" spacing={1}>
            <Chip label="기간 + 요일" color={mode === 'range' ? 'primary' : 'default'} onClick={() => setMode('range')} />
            <Chip label="날짜 직접 입력" color={mode === 'dates' ? 'primary' : 'default'} onClick={() => setMode('dates')} />
          </Stack>
          {mode === 'dates' ? (
            <TextField label="날짜 (YYYY-MM-DD, 쉼표·공백 구분, 최대 31개)" value={dates} onChange={(e) => setDates(e.target.value)} multiline minRows={2} placeholder="2026-11-04, 2026-11-11" />
          ) : (
            <>
              <Stack direction="row" spacing={1}>
                <TextField type="date" label="시작일" value={from} onChange={(e) => setFrom(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
                <TextField type="date" label="종료일" value={until} onChange={(e) => setUntil(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
              </Stack>
              <Stack direction="row" flexWrap="wrap">
                {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                  <FormControlLabel
                    key={d}
                    label={WEEKDAY[d]}
                    control={<Checkbox checked={weekdays.includes(d)} onChange={(e) => setWeekdays(e.target.checked ? [...weekdays, d] : weekdays.filter((x) => x !== d))} />}
                  />
                ))}
              </Stack>
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{gen.data ? '닫기' : '취소'}</Button>
        <Button variant="contained" disabled={!ok || gen.isPending || !!gen.data} onClick={() => gen.mutate()}>생성</Button>
      </DialogActions>
    </Dialog>
  );
}
