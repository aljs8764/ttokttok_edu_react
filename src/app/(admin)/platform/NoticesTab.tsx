'use client';

import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import dayjs from 'dayjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import type { PlatformNotice } from '@/lib/platform';
import { useT } from '@/lib/i18n';

const EMPTY = { kind: 'NOTICE', title: '', body: '', startsAt: '', endsAt: '' };
const iso = (v: string) => (v ? dayjs(v).toISOString() : null);

/** SAAS-005 공지·점검 안내 (기관 화면 상단 배너로 노출) */
export default function NoticesTab() {
  const t = useT();
  const qc = useQueryClient();
  const [form, setForm] = useState<typeof EMPTY | null>(null);
  const q = useQuery({ queryKey: ['platform', 'notices'], queryFn: () => api.get<PlatformNotice[]>('platform/notices') });
  const refresh = () => { void qc.invalidateQueries({ queryKey: ['platform'] }); void qc.invalidateQueries({ queryKey: ['platform-notices'] }); };
  const create = useMutation({
    mutationFn: (f: typeof EMPTY) => api.post('platform/notices', { kind: f.kind, title: f.title, body: f.body, startsAt: iso(f.startsAt), endsAt: iso(f.endsAt) }),
    onSuccess: () => { setForm(null); refresh(); },
  });
  const cancel = useMutation({ mutationFn: (id: string) => api.post(`platform/notices/${id}/cancel`), onSuccess: refresh });
  const now = dayjs();
  return (
    <>
      <Stack direction="row" sx={{ mb: 2 }}>
        <Button variant="contained" sx={{ ml: 'auto' }} onClick={() => setForm(EMPTY)}>{t('공지·점검 등록')}</Button>
      </Stack>
      {(q.isError || cancel.isError) && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage(q.error ?? cancel.error)}</Alert>}
      <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead><TableRow><TableCell>{t('구분')}</TableCell><TableCell>{t('제목')}</TableCell><TableCell>{t('노출 기간')}</TableCell><TableCell>{t('상태')}</TableCell><TableCell align="right">{t('처리')}</TableCell></TableRow></TableHead>
          <TableBody>
            {q.data?.map((n) => {
              const live = !n.cancelled && dayjs(n.startsAt).isBefore(now) && (!n.endsAt || dayjs(n.endsAt).isAfter(now));
              return (
                <TableRow key={n.id}>
                  <TableCell>{n.kind === 'MAINTENANCE' ? t('점검') : t('공지')}</TableCell>
                  <TableCell>{n.title}</TableCell>
                  <TableCell>{dayjs(n.startsAt).format('M/D HH:mm')} ~ {n.endsAt ? dayjs(n.endsAt).format('M/D HH:mm') : ''}</TableCell>
                  <TableCell>{n.cancelled ? <Chip size="small" label={t('취소')} /> : live ? <Chip size="small" color="success" label={t('노출 중')} /> : <Chip size="small" variant="outlined" label={t('예정/종료')} />}</TableCell>
                  <TableCell align="right">{!n.cancelled && <Button size="small" color="error" onClick={() => cancel.mutate(n.id)}>{t('취소')}</Button>}</TableCell>
                </TableRow>
              );
            })}
            {q.data?.length === 0 && <TableRow><TableCell colSpan={5} align="center">{t('등록된 공지가 없습니다')}</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Paper>
      <Dialog open={!!form} onClose={() => setForm(null)} fullWidth maxWidth="sm">
        <DialogTitle>{t('공지·점검 등록')}</DialogTitle>
        <DialogContent>
          {form && (
            <Stack spacing={2} sx={{ pt: 1 }}>
              {create.isError && <Alert severity="error">{errorMessage(create.error)}</Alert>}
              <TextField select size="small" label={t('구분')} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                <MenuItem value="NOTICE">{t('공지')}</MenuItem><MenuItem value="MAINTENANCE">{t('점검')}</MenuItem>
              </TextField>
              <TextField size="small" label={t('제목')} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <TextField multiline minRows={3} size="small" label={t('내용')} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
              <Stack direction="row" spacing={1}>
                <TextField size="small" type="datetime-local" label={t('노출 시작 (비우면 즉시)')} value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
                <TextField size="small" type="datetime-local" label={t('노출 종료')} value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
              </Stack>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setForm(null)}>{t('취소')}</Button>
          <Button variant="contained" disabled={!form?.title.trim() || !form.body.trim() || create.isPending} onClick={() => form && create.mutate(form)}>{t('등록')}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
