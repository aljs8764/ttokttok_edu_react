'use client';

import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import NextLink from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import { DAYS, DAY_LABEL, ROLE_LABEL, dayList, hm } from '@/lib/format';
import { useSession } from '@/lib/session';
import type { Classroom, StaffMember } from '@/lib/types';
import PageHeader from '@/components/PageHeader';

/**
 * CLS-001 반 목록·생성·수정, CLS-002 반 삭제(원생 0명일 때만), STF-003 담당 교사 배정.
 * 교사는 담당 반만 보이고 읽기 전용.
 */
export default function ClassesView() {
  const qc = useQueryClient();
  const { session, manager } = useSession();
  const instId = session?.institution?.institutionId;
  const [editing, setEditing] = useState<Classroom | 'new' | null>(null);
  const [assigning, setAssigning] = useState<Classroom | null>(null);
  const [deleting, setDeleting] = useState<Classroom | null>(null);

  const classes = useQuery({ queryKey: ['classes', instId], queryFn: () => api.get<Classroom[]>('classes'), enabled: !!instId });
  const staff = useQuery({ queryKey: ['staff', instId], queryFn: () => api.get<StaffMember[]>('staff'), enabled: !!instId && manager });

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['classes'] });
    void qc.invalidateQueries({ queryKey: ['staff'] });
  };

  return (
    <>
      <PageHeader
        title="반 관리"
        menuId="CLS-001"
        description={manager ? '정원·요일·시간은 출결 대상과 지각 판정에 쓰입니다.' : '담당 반만 표시됩니다.'}
        actions={
          manager && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setEditing('new')}>
              반 만들기
            </Button>
          )
        }
      />

      {classes.isFetching && !classes.data && <LinearProgress />}
      {classes.isError && <Alert severity="error">{errorMessage(classes.error)}</Alert>}
      {classes.data?.length === 0 && (
        <Alert severity="info">{manager ? '아직 반이 없습니다. 반을 먼저 만들어야 원생을 등록할 수 있습니다.' : '담당 반이 없습니다. 원장님께 배정을 요청하세요.'}</Alert>
      )}

      <Grid container spacing={2}>
        {classes.data?.map((c) => {
          const count = c.headcount ?? 0;
          const ratio = Math.min(100, (count / Math.max(1, c.capacity)) * 100);
          return (
            <Grid key={c.id} size={{ xs: 12, sm: 6, lg: 4 }}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flex: 1 }}>
                  <Typography variant="h3" sx={{ mb: 0.5 }}>
                    {c.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {dayList(c.days)} · {hm(c.startTime)}~{hm(c.endTime)}
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2">인원</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: count >= c.capacity ? 'error.main' : undefined }}>
                        {count} / {c.capacity}명
                      </Typography>
                    </Stack>
                    <LinearProgress variant="determinate" value={ratio} color={count >= c.capacity ? 'error' : 'primary'} sx={{ mt: 0.5, height: 6, borderRadius: 3 }} />
                  </Box>
                  <Stack direction="row" spacing={0.5} sx={{ mt: 2, flexWrap: 'wrap', gap: 0.5 }}>
                    {(c.teacherNames ?? []).length === 0 ? (
                      <Chip size="small" label="담당 교사 없음" variant="outlined" color="warning" />
                    ) : (
                      c.teacherNames!.map((n) => <Chip key={n} size="small" label={n} />)
                    )}
                  </Stack>
                </CardContent>
                <CardActions sx={{ px: 2, pb: 2 }}>
                  <Button size="small" component={NextLink} href={`/students?classId=${c.id}`}>
                    원생 보기
                  </Button>
                  {manager && (
                    <>
                      <Button size="small" onClick={() => setAssigning(c)}>
                        교사 배정
                      </Button>
                      <Button size="small" onClick={() => setEditing(c)}>
                        수정
                      </Button>
                      <Button size="small" color="error" onClick={() => setDeleting(c)} sx={{ ml: 'auto !important' }}>
                        삭제
                      </Button>
                    </>
                  )}
                </CardActions>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {manager && (
        <>
          <ClassDialog target={editing} teachers={staff.data ?? []} onClose={() => setEditing(null)} onDone={refresh} />
          <AssignTeachersDialog target={assigning} staff={staff.data ?? []} onClose={() => setAssigning(null)} onDone={refresh} />
          <DeleteDialog target={deleting} onClose={() => setDeleting(null)} onDone={refresh} />
        </>
      )}
    </>
  );
}

/** CLS-001 생성·수정. 담당 교사는 생성 때만 함께 지정하고, 이후엔 교사 배정으로 바꾼다. */
function ClassDialog({ target, teachers, onClose, onDone }: { target: Classroom | 'new' | null; teachers: StaffMember[]; onClose: () => void; onDone: () => void }) {
  const isNew = target === 'new';
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState('20');
  const [days, setDays] = useState<string[]>([]);
  const [start, setStart] = useState('14:00');
  const [end, setEnd] = useState('16:00');
  const [teacherIds, setTeacherIds] = useState<string[]>([]);

  useEffect(() => {
    if (!target) return;
    if (target === 'new') {
      setName('');
      setCapacity('20');
      setDays(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']);
      setStart('14:00');
      setEnd('16:00');
      setTeacherIds([]);
    } else {
      setName(target.name);
      setCapacity(String(target.capacity));
      setDays(target.days);
      setStart(hm(target.startTime));
      setEnd(hm(target.endTime));
    }
  }, [target]);

  const save = useMutation({
    mutationFn: () => {
      const body = { name: name.trim(), capacity: Number(capacity), days, startTime: start, endTime: end };
      return isNew ? api.post('classes', { ...body, teacherIds }) : api.patch(`classes/${(target as Classroom).id}`, body);
    },
    onSuccess: () => {
      onDone();
      onClose();
    },
  });

  const cap = Number(capacity);
  const headcount = target && target !== 'new' ? (target.headcount ?? 0) : 0;
  const capError = !Number.isInteger(cap) || cap < 1 ? '1 이상 숫자' : cap < headcount ? `현재 인원(${headcount}명)보다 작을 수 없습니다` : '';
  const timeError = start >= end ? '끝나는 시간이 시작보다 늦어야 합니다' : '';
  const valid = name.trim() && !capError && days.length > 0 && !timeError;

  return (
    <Dialog open={!!target} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{isNew ? '반 만들기' : '반 수정'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="반 이름" required value={name} onChange={(e) => setName(e.target.value)} inputProps={{ maxLength: 50 }} helperText="엑셀 일괄 등록의 반명과 같아야 합니다" />
          <TextField label="정원" required type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} error={!!capError} helperText={capError || ' '} inputProps={{ min: 1 }} />
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              수업 요일
            </Typography>
            <ToggleButtonGroup size="small" value={days} onChange={(_, v: string[]) => setDays(v)} fullWidth>
              {DAYS.map((d) => (
                <ToggleButton key={d} value={d}>
                  {DAY_LABEL[d]}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>
          <Stack direction="row" spacing={1.5}>
            <TextField label="시작" type="time" value={start} onChange={(e) => setStart(e.target.value)} fullWidth InputLabelProps={{ shrink: true }} />
            <TextField label="끝" type="time" value={end} onChange={(e) => setEnd(e.target.value)} fullWidth InputLabelProps={{ shrink: true }} error={!!timeError} helperText={timeError} />
          </Stack>
          {isNew && teachers.length > 0 && (
            <TeacherPicker staff={teachers} value={teacherIds} onChange={setTeacherIds} />
          )}
          {save.isError && <Alert severity="error">{errorMessage(save.error)}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>취소</Button>
        <Button variant="contained" disabled={!valid || save.isPending} onClick={() => save.mutate()}>
          {isNew ? '만들기' : '저장'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function TeacherPicker({ staff, value, onChange }: { staff: StaffMember[]; value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  const candidates = staff.filter((s) => s.role !== 'PARENT');
  return (
    <Box>
      <Typography variant="body2" color="text.secondary">
        담당 교사
      </Typography>
      <List dense sx={{ maxHeight: 240, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 1, mt: 0.5 }}>
        {candidates.map((s) => (
          <ListItemButton key={s.userId} onClick={() => toggle(s.userId)}>
            <ListItemIcon sx={{ minWidth: 36 }}>
              <Checkbox edge="start" size="small" checked={value.includes(s.userId)} tabIndex={-1} disableRipple />
            </ListItemIcon>
            <ListItemText primary={`${s.name} · ${ROLE_LABEL[s.role]}`} secondary={s.classrooms.map((c) => c.name).join(', ') || '담당 반 없음'} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );
}

/** STF-003 담당 교사 배정 (전체 교체) */
function AssignTeachersDialog({ target, staff, onClose, onDone }: { target: Classroom | null; staff: StaffMember[]; onClose: () => void; onDone: () => void }) {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    if (target) setIds(target.teacherIds);
  }, [target]);

  const save = useMutation({
    mutationFn: () => api.put(`classes/${target!.id}/teachers`, { teacherIds: ids }),
    onSuccess: () => {
      onDone();
      onClose();
    },
  });

  return (
    <Dialog open={!!target} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>담당 교사 배정 · STF-003</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2">
            <b>{target?.name}</b> — 선택한 교사만 이 반의 출결·알림장을 다룰 수 있습니다.
          </Typography>
          {staff.length === 0 ? <Alert severity="info">교직원이 없습니다. 교직원 메뉴에서 먼저 초대하세요.</Alert> : <TeacherPicker staff={staff} value={ids} onChange={setIds} />}
          {save.isError && <Alert severity="error">{errorMessage(save.error)}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>취소</Button>
        <Button variant="contained" disabled={save.isPending} onClick={() => save.mutate()}>
          저장
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** CLS-002 반 삭제 — 소속 원생이 있으면 백엔드가 409(CLASS_NOT_EMPTY) */
function DeleteDialog({ target, onClose, onDone }: { target: Classroom | null; onClose: () => void; onDone: () => void }) {
  const del = useMutation({
    mutationFn: () => api.delete(`classes/${target!.id}`),
    onSuccess: () => {
      onDone();
      onClose();
    },
  });
  useEffect(() => del.reset(), [target]); // eslint-disable-line react-hooks/exhaustive-deps
  const hasStudents = (target?.headcount ?? 0) > 0;

  return (
    <Dialog open={!!target} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>반 삭제 · CLS-002</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {hasStudents ? (
            <Alert severity="warning">
              {target?.name}에 원생 {target?.headcount}명이 있어 삭제할 수 없습니다. 원생을 다른 반으로 옮긴 뒤 삭제하세요.
            </Alert>
          ) : (
            <Typography variant="body2">{target?.name}을(를) 삭제합니다. 지난 출결 기록은 남습니다.</Typography>
          )}
          {del.isError && <Alert severity="error">{errorMessage(del.error)}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>취소</Button>
        <Button variant="contained" color="error" disabled={hasStudents || del.isPending} onClick={() => del.mutate()}>
          삭제
        </Button>
      </DialogActions>
    </Dialog>
  );
}
