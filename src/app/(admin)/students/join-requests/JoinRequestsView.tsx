'use client';

import { useEffect, useState } from 'react';
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
import Tab from '@mui/material/Tab';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SendIcon from '@mui/icons-material/Send';
import NextLink from 'next/link';
import dayjs from 'dayjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import { dateTime } from '@/lib/format';
import { useSession } from '@/lib/session';
import type { Classroom, JoinRequest, JoinRequestStatus } from '@/lib/types';
import PageHeader from '@/components/PageHeader';
import InviteParentDialog from '@/components/students/InviteParentDialog';
import { useT } from '@/lib/i18n';

const TABS: { value: JoinRequestStatus; label: string }[] = [
  { value: 'PENDING', label: '대기' },
  { value: 'APPROVED', label: '승인' },
  { value: 'REJECTED', label: '반려' },
];

const age = (birth: string) => dayjs().diff(dayjs(birth), 'year');

/**
 * STU-004 가입 승인. 초대 링크(STU-005)로 학부모가 낸 자녀 정보를 확인하고
 * 반을 배정해 승인하면 원생·보호자·반 배정이 한 번에 만들어진다.
 */
export default function JoinRequestsView() {
  const tr = useT();
  const qc = useQueryClient();
  const { session } = useSession();
  const instId = session?.institution?.institutionId;
  const [tab, setTab] = useState<JoinRequestStatus>('PENDING');
  const [approving, setApproving] = useState<JoinRequest | null>(null);
  const [rejecting, setRejecting] = useState<JoinRequest | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  const list = useQuery({
    queryKey: ['join-requests', instId, tab],
    queryFn: () => api.get<JoinRequest[]>('join-requests', { status: tab }),
    enabled: !!instId,
  });
  const classes = useQuery({ queryKey: ['classes', instId], queryFn: () => api.get<Classroom[]>('classes'), enabled: !!instId });

  const done = () => {
    void qc.invalidateQueries({ queryKey: ['join-requests'] });
    void qc.invalidateQueries({ queryKey: ['students'] });
    void qc.invalidateQueries({ queryKey: ['classes'] });
  };

  return (
    <>
      <PageHeader
        title={tr('가입 승인')}
        menuId="STU-004"
        description={tr('초대 링크로 학부모가 입력한 자녀 정보입니다. 반을 배정해 승인하면 원생으로 등록되고 학부모 앱과 연결됩니다.')}
        actions={
          <>
            <Button startIcon={<ArrowBackIcon />} component={NextLink} href="/students">
              {tr('원생 목록')}
            </Button>
            <Button variant="contained" startIcon={<SendIcon />} onClick={() => setInviteOpen(true)}>
              {tr('학부모 초대')}
            </Button>
          </>
        }
      />

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        {TABS.map((t) => (
          <Tab key={t.value} value={t.value} label={tr(t.label)} />
        ))}
      </Tabs>

      {list.isError && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage(list.error)}</Alert>}

      <Paper>
        {list.isFetching && <LinearProgress />}
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{tr('자녀')}</TableCell>
                <TableCell>{tr('생년월일')}</TableCell>
                <TableCell>{tr('보호자')}</TableCell>
                <TableCell>{tr('연락처')}</TableCell>
                <TableCell>{tr('신청')}</TableCell>
                <TableCell align="right">{tab === 'PENDING' ? tr('처리') : tr('상태')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {list.data?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    {tab === 'PENDING' ? tr('대기 중인 가입 신청이 없습니다') : tr('내역이 없습니다')}
                  </TableCell>
                </TableRow>
              )}
              {list.data?.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{r.childName}</TableCell>
                  <TableCell>
                    {r.birthDate} <Typography component="span" variant="caption" color="text.secondary">{tr('(만 {0}세)', { 0: age(r.birthDate) })}</Typography>
                  </TableCell>
                  <TableCell>
                    {r.guardianName}
                    {r.relation ? ` (${r.relation})` : ''}
                  </TableCell>
                  <TableCell>{r.guardianPhone}</TableCell>
                  <TableCell>{dateTime(r.submittedAt)}</TableCell>
                  <TableCell align="right">
                    {r.status === 'PENDING' ? (
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button size="small" color="inherit" onClick={() => setRejecting(r)}>
                          {tr('반려')}
                        </Button>
                        <Button size="small" variant="contained" onClick={() => setApproving(r)}>
                          {tr('승인')}
                        </Button>
                      </Stack>
                    ) : (
                      <Chip size="small" label={r.status === 'APPROVED' ? tr('승인') : tr('반려')} color={r.status === 'APPROVED' ? 'success' : 'default'} />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <ApproveDialog target={approving} classes={classes.data ?? []} onClose={() => setApproving(null)} onDone={done} />
      <RejectDialog target={rejecting} onClose={() => setRejecting(null)} onDone={done} />
      <InviteParentDialog open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </>
  );
}

function ApproveDialog({ target, classes, onClose, onDone }: { target: JoinRequest | null; classes: Classroom[]; onClose: () => void; onDone: () => void }) {
  const tr = useT();
  const [classroomId, setClassroomId] = useState('');
  useEffect(() => setClassroomId(''), [target]);

  const approve = useMutation({
    mutationFn: () => api.post(`join-requests/${target!.id}/approve`, { classroomId }),
    onSuccess: () => {
      onDone();
      onClose();
    },
  });

  const selected = classes.find((c) => c.id === classroomId);
  const full = selected && selected.headcount !== null && selected.headcount >= selected.capacity;

  return (
    <Dialog open={!!target} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{tr('가입 승인')}</DialogTitle>
      <DialogContent>
        {target && (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2">
              <b>{target.childName}</b>{' '}{tr('({0}) · 보호자 {1} {2}', { 0: target.birthDate, 1: target.guardianName, 2: target.guardianPhone })}
            </Typography>
            <TextField
              select
              label={tr('배정할 반')}
              required
              value={classroomId}
              onChange={(e) => setClassroomId(e.target.value)}
              error={!!full}
              helperText={full ? tr('정원이 찬 반입니다') : selected ? tr('현재 {0} / 정원 {1}명', { 0: selected.headcount ?? '-', 1: selected.capacity }) : ' '}
            >
              {classes.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
            {approve.isError && <Alert severity="error">{errorMessage(approve.error)}</Alert>}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{tr('취소')}</Button>
        <Button variant="contained" disabled={!classroomId || !!full || approve.isPending} onClick={() => approve.mutate()}>
          {tr('승인')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function RejectDialog({ target, onClose, onDone }: { target: JoinRequest | null; onClose: () => void; onDone: () => void }) {
  const tr = useT();
  const [reason, setReason] = useState('');
  useEffect(() => setReason(''), [target]);

  const reject = useMutation({
    mutationFn: () => api.post(`join-requests/${target!.id}/reject`, { reason: reason.trim() || null }),
    onSuccess: () => {
      onDone();
      onClose();
    },
  });

  return (
    <Dialog open={!!target} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{tr('가입 반려')}</DialogTitle>
      <DialogContent>
        {target && (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2">
              <b>{target.childName}</b>{' '}{tr('· 보호자 {0} 의 신청을 반려합니다.', { 0: target.guardianName })}
            </Typography>
            <TextField label={tr('사유 (선택)')} multiline minRows={2} value={reason} onChange={(e) => setReason(e.target.value)} inputProps={{ maxLength: 200 }} />
            {reject.isError && <Alert severity="error">{errorMessage(reject.error)}</Alert>}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{tr('취소')}</Button>
        <Button variant="contained" color="error" disabled={reject.isPending} onClick={() => reject.mutate()}>
          {tr('반려')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
