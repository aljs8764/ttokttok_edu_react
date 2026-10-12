'use client';

import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import WarningIcon from '@mui/icons-material/WarningAmberOutlined';
import dayjs from 'dayjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import { dateTime } from '@/lib/format';
import type { CounselNote, Health, StudentTag } from '@/lib/ops';
import { useSession } from '@/lib/session';
import { useT } from '@/lib/i18n';

/** 원생 상세 아래: STU-009 건강·알레르기, STU-011 태그, STU-010 상담일지 */
export default function StudentExtras({ studentId }: { studentId: string }) {
  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 6 }}>
        <HealthCard studentId={studentId} />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <TagsCard studentId={studentId} />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <CounselCard studentId={studentId} />
      </Grid>
    </Grid>
  );
}

function HealthCard({ studentId }: { studentId: string }) {
  const tr = useT();
  const qc = useQueryClient();
  const { session } = useSession();
  const instId = session?.institution?.institutionId;
  const q = useQuery({ queryKey: ['student-health', instId, studentId], queryFn: () => api.get<Health>(`students/${studentId}/health`), enabled: !!instId });
  const [f, setF] = useState({ allergies: '', conditions: '', notes: '' });
  useEffect(() => {
    if (q.data) setF({ allergies: q.data.allergies ?? '', conditions: q.data.conditions ?? '', notes: q.data.notes ?? '' });
  }, [q.data]);
  const save = useMutation({
    mutationFn: () => api.put(`students/${studentId}/health`, f),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['student-health'] }),
  });
  const dirty = q.data && (f.allergies !== (q.data.allergies ?? '') || f.conditions !== (q.data.conditions ?? '') || f.notes !== (q.data.notes ?? ''));

  return (
    <Paper sx={{ p: 2.5, height: '100%' }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
        <WarningIcon color="warning" fontSize="small" />
        <Typography variant="h3">{tr('건강·알레르기 특이사항')}</Typography>
        <Chip size="small" variant="outlined" label="STU-009" />
      </Stack>
      <Typography variant="caption" color="text.secondary">
        {tr('암호화해서 저장합니다. 알레르기를 적으면 교사 앱의 반 화면에 경고 배지가 뜹니다.')}
      </Typography>
      {q.isError && <Alert severity="error" sx={{ mt: 1 }}>{errorMessage(q.error)}</Alert>}
      <Stack spacing={1.5} sx={{ mt: 1.5 }}>
        <TextField size="small" label={tr('알레르기')} value={f.allergies} onChange={(e) => setF({ ...f, allergies: e.target.value })} inputProps={{ maxLength: 500 }} />
        <TextField size="small" label={tr('지병·복용 약')} value={f.conditions} onChange={(e) => setF({ ...f, conditions: e.target.value })} inputProps={{ maxLength: 500 }} />
        <TextField size="small" label={tr('기타 유의사항')} multiline minRows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} inputProps={{ maxLength: 500 }} />
        {save.isError && <Alert severity="error">{errorMessage(save.error)}</Alert>}
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="caption" color="text.secondary">
            {q.data?.updatedAt ? tr('{0} · {1} 수정', { 0: q.data.updatedBy, 1: dateTime(q.data.updatedAt) }) : ''}
          </Typography>
          <Button variant="contained" size="small" disabled={!dirty || save.isPending} onClick={() => save.mutate()}>
            {tr('저장')}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}

function TagsCard({ studentId }: { studentId: string }) {
  const tr = useT();
  const qc = useQueryClient();
  const { session, manager } = useSession();
  const instId = session?.institution?.institutionId;
  const all = useQuery({ queryKey: ['student-tags', instId], queryFn: () => api.get<StudentTag[]>('student-tags'), enabled: !!instId });
  const mine = useQuery({ queryKey: ['student-tags', instId, studentId], queryFn: () => api.get<StudentTag[]>(`students/${studentId}/tags`), enabled: !!instId });
  const [name, setName] = useState('');
  const refresh = () => qc.invalidateQueries({ queryKey: ['student-tags'] });
  const set = useMutation({ mutationFn: (ids: string[]) => api.put(`students/${studentId}/tags`, { tagIds: ids }), onSuccess: refresh });
  const create = useMutation({
    mutationFn: () => api.post('student-tags', { name: name.trim() }),
    onSuccess: () => (setName(''), refresh()),
  });
  const remove = useMutation({ mutationFn: (id: string) => api.delete(`student-tags/${id}`), onSuccess: refresh });
  const on = new Set((mine.data ?? []).map((t) => t.id));

  return (
    <Paper sx={{ p: 2.5, height: '100%' }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
        <Typography variant="h3">{tr('태그·그룹')}</Typography>
        <Chip size="small" variant="outlined" label="STU-011" />
      </Stack>
      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
        {(all.data ?? []).map((t) => (
          <Chip
            key={t.id}
            label={`#${t.name} ${t.studentCount}`}
            color={on.has(t.id) ? 'primary' : 'default'}
            variant={on.has(t.id) ? 'filled' : 'outlined'}
            onClick={() => set.mutate(on.has(t.id) ? [...on].filter((x) => x !== t.id) : [...on, t.id])}
            onDelete={manager ? () => window.confirm(tr('\'#{0}\' 태그를 모든 원생에게서 지울까요?', { 0: t.name })) && remove.mutate(t.id) : undefined}
          />
        ))}
        {all.data?.length === 0 && <Typography variant="body2" color="text.secondary">{tr('만든 태그가 없습니다')}</Typography>}
      </Stack>
      {manager && (
        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <TextField size="small" label={tr('새 태그')} value={name} onChange={(e) => setName(e.target.value)} inputProps={{ maxLength: 30 }} />
          <Button variant="outlined" disabled={!name.trim() || create.isPending} onClick={() => create.mutate()}>
            {tr('추가')}
          </Button>
        </Stack>
      )}
      {(set.isError || create.isError || remove.isError) && <Alert severity="error" sx={{ mt: 1 }}>{errorMessage(set.error ?? create.error ?? remove.error)}</Alert>}
    </Paper>
  );
}

function CounselCard({ studentId }: { studentId: string }) {
  const tr = useT();
  const qc = useQueryClient();
  const { session } = useSession();
  const instId = session?.institution?.institutionId;
  const q = useQuery({ queryKey: ['counsel', instId, studentId], queryFn: () => api.get<CounselNote[]>(`students/${studentId}/counsel-notes`), enabled: !!instId });
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [body, setBody] = useState('');
  const [visible, setVisible] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ['counsel'] });
  const add = useMutation({
    mutationFn: () => api.post(`students/${studentId}/counsel-notes`, { occurredOn: date, body: body.trim(), parentVisible: visible }),
    onSuccess: () => (setBody(''), setVisible(false), refresh()),
  });
  const remove = useMutation({ mutationFn: (id: string) => api.delete(`counsel-notes/${id}`), onSuccess: refresh });

  return (
    <Paper sx={{ p: 2.5 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
        <Typography variant="h3">{tr('상담일지·메모')}</Typography>
        <Chip size="small" variant="outlined" label="STU-010" />
      </Stack>
      <Stack spacing={1.5}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField size="small" type="date" label={tr('상담일')} value={date} onChange={(e) => setDate(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 170 }} />
          <TextField size="small" fullWidth multiline minRows={2} label={tr('내용')} value={body} onChange={(e) => setBody(e.target.value)} inputProps={{ maxLength: 3000 }} />
        </Stack>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <FormControlLabel control={<Checkbox checked={visible} onChange={(e) => setVisible(e.target.checked)} />} label={tr('학부모 앱에 공개')} />
          <Button variant="contained" size="small" disabled={!body.trim() || add.isPending} onClick={() => add.mutate()}>
            {tr('기록')}
          </Button>
        </Stack>
        {(add.isError || remove.isError) && <Alert severity="error">{errorMessage(add.error ?? remove.error)}</Alert>}
        {q.data?.length === 0 && <Typography variant="body2" color="text.secondary">{tr('기록이 없습니다')}</Typography>}
        {q.data?.map((n) => (
          <Paper key={n.id} variant="outlined" sx={{ p: 1.5 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="subtitle2">{dayjs(n.occurredOn).format('YYYY.M.D')}</Typography>
              <Typography variant="caption" color="text.secondary">{n.author.name}</Typography>
              {n.parentVisible && <Chip size="small" color="primary" label={tr('학부모 공개')} />}
              <span style={{ flex: 1 }} />
              <IconButton size="small" aria-label={tr('삭제')} onClick={() => window.confirm(tr('이 기록을 지울까요?')) && remove.mutate(n.id)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Stack>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: 0.5 }}>{n.body}</Typography>
          </Paper>
        ))}
      </Stack>
    </Paper>
  );
}
