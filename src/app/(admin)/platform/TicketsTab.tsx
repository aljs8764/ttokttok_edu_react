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
import Typography from '@mui/material/Typography';
import dayjs from 'dayjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import { TICKET_STATUS, type Ticket, type TicketStatus } from '@/lib/platform';
import TicketThread from './TicketThread';

function Detail({ id, onClose }: { id: string; onClose: () => void }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['platform', 'ticket', id], queryFn: () => api.get<Ticket>(`platform/tickets/${id}`) });
  const refresh = () => { void qc.invalidateQueries({ queryKey: ['platform'] }); };
  const reply = useMutation({ mutationFn: (body: string) => api.post(`platform/tickets/${id}/messages`, { body }), onSuccess: refresh });
  const update = useMutation({ mutationFn: (v: { status?: TicketStatus; assignToMe?: boolean }) => api.patch(`platform/tickets/${id}`, v), onSuccess: refresh });
  const t = q.data;
  const err = q.error ?? reply.error ?? update.error;
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t?.subject ?? '문의'}</DialogTitle>
      <DialogContent>
        {err && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage(err)}</Alert>}
        {t && (
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">{t.institutionName} · {t.createdByName} · {t.categoryLabel}</Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField select size="small" label="상태" value={t.status} onChange={(e) => update.mutate({ status: e.target.value as TicketStatus })} sx={{ minWidth: 130 }}>
                {(Object.keys(TICKET_STATUS) as TicketStatus[]).map((s) => <MenuItem key={s} value={s}>{TICKET_STATUS[s].label}</MenuItem>)}
              </TextField>
              <Typography variant="body2" sx={{ flex: 1 }}>담당: {t.assigneeName ?? '미지정'}</Typography>
              <Button size="small" onClick={() => update.mutate({ assignToMe: true })}>내가 담당</Button>
            </Stack>
            <TicketThread ticket={t} pending={reply.isPending} onReply={(b) => reply.mutate(b)} />
          </Stack>
        )}
      </DialogContent>
      <DialogActions><Button onClick={onClose}>닫기</Button></DialogActions>
    </Dialog>
  );
}

/** SAAS-004 CS 티켓 (운영사 응대) */
export default function TicketsTab() {
  const [status, setStatus] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const q = useQuery({ queryKey: ['platform', 'tickets', status], queryFn: () => api.get<Ticket[]>('platform/tickets', { status }) });
  return (
    <>
      <TextField select size="small" label="상태" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 130, mb: 2 }}>
        <MenuItem value="">전체</MenuItem>
        {(Object.keys(TICKET_STATUS) as TicketStatus[]).map((s) => <MenuItem key={s} value={s}>{TICKET_STATUS[s].label}</MenuItem>)}
      </TextField>
      {q.isError && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage(q.error)}</Alert>}
      <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead><TableRow><TableCell>상태</TableCell><TableCell>제목</TableCell><TableCell>기관</TableCell><TableCell>분류</TableCell><TableCell>담당</TableCell><TableCell>최근 활동</TableCell></TableRow></TableHead>
          <TableBody>
            {q.data?.map((t) => (
              <TableRow key={t.id} hover sx={{ cursor: 'pointer' }} onClick={() => setOpen(t.id)}>
                <TableCell><Chip size="small" color={TICKET_STATUS[t.status].color} label={TICKET_STATUS[t.status].label} /></TableCell>
                <TableCell>{t.subject}</TableCell>
                <TableCell>{t.institutionName}</TableCell>
                <TableCell>{t.categoryLabel}</TableCell>
                <TableCell>{t.assigneeName ?? '-'}</TableCell>
                <TableCell>{dayjs(t.lastMessageAt).format('M/D HH:mm')}</TableCell>
              </TableRow>
            ))}
            {q.data?.length === 0 && <TableRow><TableCell colSpan={6} align="center">문의가 없습니다</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Paper>
      {open && <Detail id={open} onClose={() => setOpen(null)} />}
    </>
  );
}
