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
import { useSession } from '@/lib/session';
import { TICKET_CATEGORY, TICKET_STATUS, type Ticket, type TicketCategory } from '@/lib/platform';
import PageHeader from '@/components/PageHeader';
import TicketThread from '../platform/TicketThread';
import { useT } from '@/lib/i18n';

function Detail({ id, onClose }: { id: string; onClose: () => void }) {
  const tr = useT();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['support-ticket', id], queryFn: () => api.get<Ticket>(`support/tickets/${id}`) });
  const reply = useMutation({
    mutationFn: (body: string) => api.post(`support/tickets/${id}/messages`, { body }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['support-ticket', id] }); void qc.invalidateQueries({ queryKey: ['support-tickets'] }); },
  });
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{q.data?.subject ?? tr('문의')}</DialogTitle>
      <DialogContent>
        {(q.isError || reply.isError) && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage(q.error ?? reply.error)}</Alert>}
        {q.data && <div style={{ paddingTop: 8 }}><TicketThread ticket={q.data} pending={reply.isPending} onReply={(b) => reply.mutate(b)} /></div>}
      </DialogContent>
      <DialogActions><Button onClick={onClose}>{tr('닫기')}</Button></DialogActions>
    </Dialog>
  );
}

/** SAAS-004 운영팀 문의 (원장·실장) */
export default function SupportView() {
  const tr = useT();
  const qc = useQueryClient();
  const { session, manager } = useSession();
  const instId = session?.institution?.institutionId;
  const [open, setOpen] = useState<string | null>(null);
  const [form, setForm] = useState<{ subject: string; category: TicketCategory; body: string } | null>(null);
  const list = useQuery({ queryKey: ['support-tickets', instId], queryFn: () => api.get<Ticket[]>('support/tickets'), enabled: !!instId && manager });
  const create = useMutation({
    mutationFn: (f: NonNullable<typeof form>) => api.post<Ticket>('support/tickets', f),
    onSuccess: (t) => { setForm(null); setOpen(t.id); void qc.invalidateQueries({ queryKey: ['support-tickets'] }); },
  });
  if (!manager) return <Alert severity="info">{tr('원장·실장만 문의할 수 있습니다.')}</Alert>;
  return (
    <>
      <PageHeader
        title={tr('문의하기')}
        menuId="SAAS-004"
        description={tr('서비스 이용 중 궁금한 점이나 오류를 운영팀에 남기면 답변이 달립니다. 답변이 오면 알림으로 알려 드려요.')}
        actions={<Button variant="contained" onClick={() => setForm({ subject: '', category: 'GENERAL', body: '' })}>{tr('새 문의')}</Button>}
      />
      {list.isError && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage(list.error)}</Alert>}
      <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead><TableRow><TableCell>{tr('상태')}</TableCell><TableCell>{tr('제목')}</TableCell><TableCell>{tr('분류')}</TableCell><TableCell>{tr('작성자')}</TableCell><TableCell>{tr('최근 활동')}</TableCell></TableRow></TableHead>
          <TableBody>
            {list.data?.map((t) => (
              <TableRow key={t.id} hover sx={{ cursor: 'pointer' }} onClick={() => setOpen(t.id)}>
                <TableCell><Chip size="small" color={TICKET_STATUS[t.status].color} label={tr(TICKET_STATUS[t.status].label)} /></TableCell>
                <TableCell>{t.subject}</TableCell>
                <TableCell>{t.categoryLabel}</TableCell>
                <TableCell>{t.createdByName}</TableCell>
                <TableCell>{dayjs(t.lastMessageAt).format('M/D HH:mm')}</TableCell>
              </TableRow>
            ))}
            {list.data?.length === 0 && <TableRow><TableCell colSpan={5} align="center">{tr('남긴 문의가 없습니다')}</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Paper>
      {open && <Detail id={open} onClose={() => setOpen(null)} />}
      <Dialog open={!!form} onClose={() => setForm(null)} fullWidth maxWidth="sm">
        <DialogTitle>{tr('새 문의')}</DialogTitle>
        <DialogContent>
          {form && (
            <Stack spacing={2} sx={{ pt: 1 }}>
              {create.isError && <Alert severity="error">{errorMessage(create.error)}</Alert>}
              <TextField select size="small" label={tr('분류')} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as TicketCategory })}>
                {(Object.keys(TICKET_CATEGORY) as TicketCategory[]).map((c) => <MenuItem key={c} value={c}>{tr(TICKET_CATEGORY[c])}</MenuItem>)}
              </TextField>
              <TextField size="small" label={tr('제목')} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
              <TextField multiline minRows={4} size="small" label={tr('내용')} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setForm(null)}>{tr('취소')}</Button>
          <Button variant="contained" disabled={!form?.subject.trim() || !form.body.trim() || create.isPending} onClick={() => form && create.mutate(form)}>{tr('등록')}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
