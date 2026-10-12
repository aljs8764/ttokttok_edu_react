'use client';

import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import { dateTime } from '@/lib/format';
import { WAITLIST_STATUS, type Vacancy, type WaitlistEntry, type WaitlistStatus } from '@/lib/ops';
import { useSession } from '@/lib/session';
import type { Classroom } from '@/lib/types';
import PageHeader from '@/components/PageHeader';
import { useT } from '@/lib/i18n';

/** CLS-004 대기자 관리 — 정원이 찬 반의 대기 신청. 빈자리가 나면 원장이 직접 연락하고 "연락함"을 기록한다 */
export default function WaitlistView() {
  const t = useT();
  const qc = useQueryClient();
  const { session, manager } = useSession();
  const instId = session?.institution?.institutionId;
  const [classId, setClassId] = useState('');
  const [status, setStatus] = useState<WaitlistStatus | ''>('WAITING');
  const [addOpen, setAddOpen] = useState(false);

  const classes = useQuery({ queryKey: ['classes', instId], queryFn: () => api.get<Classroom[]>('classes'), enabled: !!instId });
  const vac = useQuery({ queryKey: ['vacancies', instId], queryFn: () => api.get<Vacancy[]>('waitlist/vacancies'), enabled: !!instId && manager });
  const list = useQuery({
    queryKey: ['waitlist', instId, classId, status],
    queryFn: () => api.get<WaitlistEntry[]>('waitlist', { classroomId: classId || undefined, status: status || undefined }),
    enabled: !!instId && manager,
  });
  const refresh = () => (qc.invalidateQueries({ queryKey: ['waitlist'] }), qc.invalidateQueries({ queryKey: ['vacancies'] }));
  const setSt = useMutation({ mutationFn: (v: { id: string; status: WaitlistStatus }) => api.patch(`waitlist/${v.id}/status`, { status: v.status }), onSuccess: refresh });
  const contacted = useMutation({ mutationFn: (id: string) => api.post(`waitlist/${id}/contacted`), onSuccess: refresh });

  if (!manager) return <Alert severity="info">{t('원장·실장만 볼 수 있습니다.')}</Alert>;

  return (
    <>
      <PageHeader
        title={t('대기자 관리')}
        menuId="CLS-004"
        description={t('정원이 찬 반의 대기 신청을 순번대로 관리합니다. 대기자는 앱 계정이 없어 자동 알림은 보내지 않으며, 빈자리가 나면 직접 연락한 뒤 ‘연락함’을 기록하세요.')}
        actions={<Button variant="contained" onClick={() => setAddOpen(true)}>{t('대기자 추가')}</Button>}
      />
      {vac.data && vac.data.some((v) => v.waiting > 0) && (
        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', rowGap: 1 }}>
          {vac.data.filter((v) => v.waiting > 0).map((v) => (
            <Chip
              key={v.classroomId}
              color={v.vacancy > 0 ? 'success' : 'default'}
              label={t('{0}: 정원 {1}/{2} · 빈자리 {3} · 대기 {4}', { 0: v.classroomName, 1: v.enrolled, 2: v.capacity, 3: v.vacancy, 4: v.waiting })}
              onClick={() => setClassId(v.classroomId)}
            />
          ))}
        </Stack>
      )}
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <TextField select size="small" label={t('반')} value={classId} onChange={(e) => setClassId(e.target.value)} sx={{ minWidth: 180 }}>
          <MenuItem value="">{t('전체')}</MenuItem>
          {classes.data?.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
        </TextField>
        <TextField select size="small" label={t('상태')} value={status} onChange={(e) => setStatus(e.target.value as WaitlistStatus | '')} sx={{ minWidth: 140 }}>
          <MenuItem value="">{t('전체')}</MenuItem>
          {(Object.keys(WAITLIST_STATUS) as WaitlistStatus[]).map((s) => <MenuItem key={s} value={s}>{t(WAITLIST_STATUS[s].label)}</MenuItem>)}
        </TextField>
      </Stack>
      {(list.isError || setSt.isError || contacted.isError) && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage(list.error ?? setSt.error ?? contacted.error)}</Alert>}
      {list.isFetching && <LinearProgress />}
      <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('순번')}</TableCell><TableCell>{t('반')}</TableCell><TableCell>{t('원생')}</TableCell><TableCell>{t('보호자 / 연락처')}</TableCell>
              <TableCell>{t('메모')}</TableCell><TableCell>{t('상태')}</TableCell><TableCell>{t('연락')}</TableCell><TableCell align="right">{t('처리')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {list.data?.map((w) => (
              <TableRow key={w.id} hover>
                <TableCell>{w.position ?? '-'}</TableCell>
                <TableCell>{w.classroomName}</TableCell>
                <TableCell>{w.studentName}</TableCell>
                <TableCell>{[w.guardianName, w.phone].filter(Boolean).join(' / ')}</TableCell>
                <TableCell sx={{ maxWidth: 220 }}><Typography variant="body2" noWrap>{w.memo ?? ''}</Typography></TableCell>
                <TableCell><Chip size="small" label={t(WAITLIST_STATUS[w.status].label)} color={WAITLIST_STATUS[w.status].color} /></TableCell>
                <TableCell>{w.contactedAt ? dateTime(w.contactedAt) : '-'}</TableCell>
                <TableCell align="right">
                  {w.status === 'WAITING' && (
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <Button size="small" onClick={() => contacted.mutate(w.id)}>{t('연락함')}</Button>
                      <Button size="small" color="success" onClick={() => setSt.mutate({ id: w.id, status: 'ENROLLED' })}>{t('등록 완료')}</Button>
                      <Button size="small" color="inherit" onClick={() => setSt.mutate({ id: w.id, status: 'CANCELLED' })}>{t('취소')}</Button>
                    </Stack>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {list.data?.length === 0 && (
              <TableRow><TableCell colSpan={8} align="center" sx={{ py: 5, color: 'text.secondary' }}>{t('대기자가 없습니다')}</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
      {addOpen && <AddDialog classes={classes.data ?? []} onClose={() => setAddOpen(false)} onAdded={() => (setAddOpen(false), refresh())} />}
    </>
  );
}

function AddDialog({ classes, onClose, onAdded }: { classes: Classroom[]; onClose: () => void; onAdded: () => void }) {
  const t = useT();
  const [f, setF] = useState({ classroomId: '', studentName: '', guardianName: '', phone: '', memo: '' });
  const add = useMutation({
    mutationFn: () => api.post('waitlist', { ...f, guardianName: f.guardianName.trim() || null, memo: f.memo.trim() || null }),
    onSuccess: onAdded,
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{t('대기자 추가')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {add.isError && <Alert severity="error">{errorMessage(add.error)}</Alert>}
          <TextField select label={t('희망 반')} value={f.classroomId} onChange={set('classroomId')} required>
            {classes.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
          </TextField>
          <TextField label={t('원생 이름')} value={f.studentName} onChange={set('studentName')} required slotProps={{ htmlInput: { maxLength: 50 } }} />
          <TextField label={t('보호자 이름')} value={f.guardianName} onChange={set('guardianName')} slotProps={{ htmlInput: { maxLength: 50 } }} />
          <TextField label={t('연락처')} value={f.phone} onChange={set('phone')} required placeholder="010-0000-0000" />
          <TextField label={t('메모')} value={f.memo} onChange={set('memo')} multiline minRows={2} slotProps={{ htmlInput: { maxLength: 300 } }} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('취소')}</Button>
        <Button variant="contained" disabled={!f.classroomId || !f.studentName.trim() || !f.phone.trim() || add.isPending} onClick={() => add.mutate()}>{t('추가')}</Button>
      </DialogActions>
    </Dialog>
  );
}
