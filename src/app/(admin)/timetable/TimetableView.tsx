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
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import { WEEKDAY, type Slot } from '@/lib/ops';
import { useSession } from '@/lib/session';
import type { Classroom } from '@/lib/types';
import PageHeader from '@/components/PageHeader';
import { useT } from '@/lib/i18n';
import dayjs from 'dayjs';
import SectionCard from '@/components/ui/SectionCard';
import EmptyState from '@/components/ui/EmptyState';
import { color, font, tone as TONES, type Tone } from '@/theme/tokens';

interface Row { weekday: number; startTime: string; endTime: string; subject: string; room: string }
const hm = (t: string) => t.slice(0, 5);

const BLOCK_TONES: Tone[] = ['blue', 'green', 'coral', 'amber', 'gray'];
const ROW_PX = 32; // 30분 한 칸

/** 디자인 P2-08 주간 시간표 — 30분 칸 그리드에 수업 블록. 좁은 화면은 가로 스크롤 */
function WeekGrid({ slots, showClass, toneOf }: { slots: Slot[]; showClass: boolean; toneOf: (classroomId: string) => Tone }) {
  const tr = useT();
  const min = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  const startH = Math.min(14, ...slots.map((s) => Math.floor(min(s.startTime) / 60)));
  const endH = Math.max(20, ...slots.map((s) => Math.ceil(min(s.endTime) / 60)));
  const rows = (endH - startH) * 2;
  // 일요일 수업이 없으면 월~토만
  const days = slots.some((s) => s.weekday === 7) ? [1, 2, 3, 4, 5, 6, 7] : [1, 2, 3, 4, 5, 6];
  const today = dayjs().day() === 0 ? 7 : dayjs().day();
  const cols = `56px repeat(${days.length}, minmax(90px, 1fr))`;
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Box sx={{ minWidth: 640 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: cols, fontSize: 13, fontWeight: 600, pb: 1 }}>
          <span />
          {days.map((d) => (
            <Box
              key={d}
              component="span"
              aria-current={d === today ? 'date' : undefined}
              sx={{ textAlign: 'center', mx: 1, py: '2px', borderRadius: '6px', ...(d === today ? { bgcolor: color.primary, color: '#FFFFFF' } : {}) }}
            >
              {tr(WEEKDAY[d])}
            </Box>
          ))}
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: cols, gridTemplateRows: `repeat(${rows}, ${ROW_PX}px)`, position: 'relative' }}>
          {Array.from({ length: endH - startH }, (_, i) => (
            <Box key={`t${i}`} component="span" sx={{ gridColumn: 1, gridRow: `${i * 2 + 1} / ${i * 2 + 3}`, fontSize: 11, color: 'text.secondary', borderTop: `1px solid ${color.rowDivider}`, pt: '2px', fontFamily: font.mono }}>
              {String(startH + i).padStart(2, '0')}:00
            </Box>
          ))}
          {Array.from({ length: endH - startH }, (_, i) => (
            <Box key={`c${i}`} component="span" sx={{ gridColumn: `2 / ${days.length + 2}`, gridRow: `${i * 2 + 1} / ${i * 2 + 3}`, borderTop: `1px solid ${color.rowDivider}` }} />
          ))}
          {slots.map((s) => {
            const col = days.indexOf(s.weekday);
            if (col < 0) return null;
            const r1 = Math.floor((min(s.startTime) - startH * 60) / 30) + 1;
            const r2 = Math.max(r1 + 1, Math.ceil((min(s.endTime) - startH * 60) / 30) + 1);
            const t = TONES[toneOf(s.classroomId)];
            return (
              <Box
                key={s.id}
                sx={{ gridColumn: col + 2, gridRow: `${r1} / ${r2}`, m: '2px 4px', borderRadius: '8px', px: 1, py: 0.75, fontSize: 12, lineHeight: 1.35, display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden', zIndex: 1, bgcolor: t.bg, color: t.fg }}
              >
                <Box component="strong">{s.subject ?? s.classroomName}</Box>
                <span>
                  {hm(s.startTime)}–{hm(s.endTime)}
                  {s.teacher?.name ? ` · ${s.teacher.name}` : ''}
                </span>
                {(showClass && s.subject) || s.room ? <span>{[showClass && s.subject && s.classroomName, s.room].filter(Boolean).join(' · ')}</span> : null}
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}

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
  // 반마다 같은 색 (디자인: 반별 블록 색)
  const classOrder = Array.from(new Set((slots.data ?? []).map((s) => s.classroomId)));
  const toneOf = (classroomId: string) => BLOCK_TONES[classOrder.indexOf(classroomId) % BLOCK_TONES.length];

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
      {slots.isError && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage(slots.error)}</Alert>}
      <SectionCard
        title={tr('주간 시간표')}
        menuId="CLS-003"
        actions={
          <TextField select size="small" label={tr('반')} value={classId} onChange={(e) => setClassId(e.target.value)} sx={{ minWidth: 180 }}>
            <MenuItem value="">{tr('전체')}</MenuItem>
            {classes.data?.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
          </TextField>
        }
      >
        {slots.isFetching && !slots.data && <LinearProgress />}
        {slots.data && shown.length === 0 ? (
          <EmptyState dense title={tr('등록된 수업이 없습니다')} />
        ) : (
          slots.data && <WeekGrid slots={shown} showClass={!classId} toneOf={toneOf} />
        )}
      </SectionCard>
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
