'use client';

import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/EditOutlined';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs, { type Dayjs } from 'dayjs';
import { api, errorMessage } from '@/lib/api';
import type { Classroom } from '@/lib/types';
import { useT } from '@/lib/i18n';
import MenuIdChip from '@/components/ui/MenuIdChip';

export interface Textbook { id: string; classroomId: string; name: string; publisher: string | null; memo: string | null; archived: boolean }
export interface Progress {
  id: string; classroomId: string; classroomName: string; date: string; textbookId: string | null; textbookName: string | null;
  content: string; homework: string | null; authorName: string; updatedAt: string;
}

interface ProgressForm { id?: string; date: Dayjs; textbookId: string; content: string; homework: string }
const emptyProgress = (): ProgressForm => ({ date: dayjs(), textbookId: '', content: '', homework: '' });

/** CLS-005 반별 교재·진도 관리 (교사는 담당 반) */
export default function CurriculumDialog({ classroom, onClose }: { classroom: Classroom | null; onClose: () => void }) {
  const tr = useT();
  const qc = useQueryClient();
  const cid = classroom?.id;
  const [tab, setTab] = useState<'progress' | 'textbooks'>('progress');
  const [showArchived, setShowArchived] = useState(false);
  const [pf, setPf] = useState<ProgressForm>(emptyProgress());
  const [tb, setTb] = useState<{ id?: string; name: string; publisher: string; memo: string; archived: boolean }>({ name: '', publisher: '', memo: '', archived: false });

  const textbooks = useQuery({
    queryKey: ['textbooks', cid, showArchived],
    queryFn: () => api.get<Textbook[]>(`classes/${cid}/textbooks`, { includeArchived: showArchived }),
    enabled: !!cid,
  });
  const progress = useQuery({
    queryKey: ['progress', cid],
    queryFn: () => api.get<Progress[]>(`classes/${cid}/progress`, { from: dayjs().subtract(90, 'day').format('YYYY-MM-DD') }),
    enabled: !!cid,
  });
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['textbooks', cid] });
    void qc.invalidateQueries({ queryKey: ['progress', cid] });
  };

  const saveProgress = useMutation({
    mutationFn: () => {
      const body = { date: pf.date.format('YYYY-MM-DD'), textbookId: pf.textbookId || null, content: pf.content, homework: pf.homework || null };
      return pf.id ? api.put(`progress/${pf.id}`, body) : api.post(`classes/${cid}/progress`, body);
    },
    onSuccess: () => { setPf(emptyProgress()); refresh(); },
  });
  const deleteProgress = useMutation({ mutationFn: (id: string) => api.delete(`progress/${id}`), onSuccess: refresh });
  const saveTextbook = useMutation({
    mutationFn: () => {
      const body = { name: tb.name, publisher: tb.publisher || null, memo: tb.memo || null, archived: tb.archived };
      return tb.id ? api.put(`textbooks/${tb.id}`, body) : api.post(`classes/${cid}/textbooks`, body);
    },
    onSuccess: () => { setTb({ name: '', publisher: '', memo: '', archived: false }); refresh(); },
  });

  const err = textbooks.error ?? progress.error ?? saveProgress.error ?? deleteProgress.error ?? saveTextbook.error;
  const activeBooks = (textbooks.data ?? []).filter((t) => !t.archived);

  return (
    <Dialog open={!!classroom} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        {tr('{0} 교재·진도', { 0: classroom?.name })}{' '}<MenuIdChip id="CLS-005" sx={{ ml: 1 }} />
      </DialogTitle>
      <DialogContent>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
          <Tab value="progress" label={tr('진도·숙제')} />
          <Tab value="textbooks" label={tr('교재')} />
        </Tabs>
        {err && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage(err)}</Alert>}

        {tab === 'progress' && (
          <>
            <Stack spacing={1.5} sx={{ mb: 2 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <DatePicker label={tr('날짜')} value={pf.date} onChange={(v) => v && setPf({ ...pf, date: v })} format="YYYY.MM.DD" slotProps={{ textField: { size: 'small', sx: { width: 170 } } }} />
                <TextField select size="small" label={tr('교재')} value={pf.textbookId} onChange={(e) => setPf({ ...pf, textbookId: e.target.value })} sx={{ minWidth: 200 }}>
                  <MenuItem value="">{tr('(선택 안 함)')}</MenuItem>
                  {activeBooks.map((t) => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
                </TextField>
              </Stack>
              <TextField size="small" label={tr('진도')} placeholder={tr('예: 3단원 분수의 덧셈 p.42~47')} value={pf.content} onChange={(e) => setPf({ ...pf, content: e.target.value })} inputProps={{ maxLength: 500 }} />
              <TextField size="small" label={tr('숙제 (선택)')} value={pf.homework} onChange={(e) => setPf({ ...pf, homework: e.target.value })} inputProps={{ maxLength: 500 }} multiline minRows={1} />
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                {pf.id && <Button onClick={() => setPf(emptyProgress())}>{tr('새로 쓰기')}</Button>}
                <Button variant="contained" disabled={!pf.content.trim() || saveProgress.isPending} onClick={() => saveProgress.mutate()}>
                  {pf.id ? tr('수정') : tr('기록')}
                </Button>
              </Stack>
            </Stack>
            <Divider />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>{tr('최근 90일 · 알림장 작성 화면의 &lsquo;진도 불러오기&rsquo;로 인용할 수 있습니다.')}</Typography>
            <List dense>
              {(progress.data ?? []).map((p) => (
                <ListItem
                  key={p.id}
                  divider
                  secondaryAction={
                    <>
                      <IconButton size="small" onClick={() => setPf({ id: p.id, date: dayjs(p.date), textbookId: p.textbookId ?? '', content: p.content, homework: p.homework ?? '' })}><EditIcon fontSize="small" /></IconButton>
                      <IconButton size="small" onClick={() => deleteProgress.mutate(p.id)}><DeleteIcon fontSize="small" /></IconButton>
                    </>
                  }
                >
                  <ListItemText
                    primary={`${dayjs(p.date).format('M/D (dd)')} ${p.content}${p.textbookName ? ` · ${p.textbookName}` : ''}`}
                    secondary={`${p.homework ? tr('숙제: {0} · ', { 0: p.homework }) : ''}${p.authorName}`}
                  />
                </ListItem>
              ))}
              {progress.data?.length === 0 && <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>{tr('기록된 진도가 없습니다.')}</Typography>}
            </List>
          </>
        )}

        {tab === 'textbooks' && (
          <>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }} alignItems={{ sm: 'center' }}>
              <TextField size="small" label={tr('교재 이름')} value={tb.name} onChange={(e) => setTb({ ...tb, name: e.target.value })} inputProps={{ maxLength: 100 }} sx={{ flex: 2 }} />
              <TextField size="small" label={tr('출판사')} value={tb.publisher} onChange={(e) => setTb({ ...tb, publisher: e.target.value })} inputProps={{ maxLength: 50 }} sx={{ flex: 1 }} />
              <TextField size="small" label={tr('메모')} value={tb.memo} onChange={(e) => setTb({ ...tb, memo: e.target.value })} inputProps={{ maxLength: 300 }} sx={{ flex: 2 }} />
              {tb.id && <FormControlLabel control={<Switch checked={tb.archived} onChange={(e) => setTb({ ...tb, archived: e.target.checked })} />} label={tr('보관')} />}
              <Button variant="contained" disabled={!tb.name.trim() || saveTextbook.isPending} onClick={() => saveTextbook.mutate()}>
                {tb.id ? tr('수정') : tr('추가')}
              </Button>
            </Stack>
            <FormControlLabel control={<Switch size="small" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />} label={tr('보관한 교재도 보기')} />
            <List dense>
              {(textbooks.data ?? []).map((t) => (
                <ListItem
                  key={t.id}
                  divider
                  secondaryAction={<IconButton size="small" onClick={() => setTb({ id: t.id, name: t.name, publisher: t.publisher ?? '', memo: t.memo ?? '', archived: t.archived })}><EditIcon fontSize="small" /></IconButton>}
                >
                  <ListItemText
                    primary={<Box component="span">{t.name}{t.archived && <Chip size="small" label={tr('보관')} sx={{ ml: 1 }} />}</Box>}
                    secondary={[t.publisher, t.memo].filter(Boolean).join(' · ') || undefined}
                  />
                </ListItem>
              ))}
              {textbooks.data?.length === 0 && <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>{tr('등록된 교재가 없습니다.')}</Typography>}
            </List>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{tr('닫기')}</Button>
      </DialogActions>
    </Dialog>
  );
}
