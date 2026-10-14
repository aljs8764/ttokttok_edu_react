'use client';

import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
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
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import dayjs from 'dayjs';
import NextLink from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import { dateTime } from '@/lib/format';
import { fileSize, openFile } from '@/lib/files';
import { NOTICE_KIND, NOTICE_STATUS } from '@/lib/notice';
import { ownerEventDestinations, useRealtime } from '@/lib/realtime';
import { useSession } from '@/lib/session';
import type { Notice, NoticeReceipts } from '@/lib/types';
import PageHeader from '@/components/PageHeader';
import { targetSummary } from '@/components/TargetPicker';
import { ReadRate } from '../NoticesView';
import { useT } from '@/lib/i18n';

/**
 * 알림장 상세 + NTC-005 수신 확인(원생별 열람, 미열람 먼저) + NTC-006 미열람자 재발송(30분 쿨타임).
 * 예약 건은 수정·취소할 수 있다.
 */
export default function NoticeDetailView({ id }: { id: string }) {
  const tr = useT();
  const qc = useQueryClient();
  const { session, manager } = useSession();
  const instId = session?.institution?.institutionId;
  const [filter, setFilter] = useState<'unread' | 'read' | 'all'>('unread');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [resendResult, setResendResult] = useState('');

  const notice = useQuery({ queryKey: ['notices', instId, 'detail', id], queryFn: () => api.get<Notice>(`notices/${id}`), enabled: !!instId });
  const sent = notice.data?.status === 'SENT';
  const receipts = useQuery({
    queryKey: ['notices', instId, 'receipts', id],
    queryFn: () => api.get<NoticeReceipts>(`notices/${id}/receipts`),
    enabled: !!instId && sent,
    refetchInterval: manager ? false : 120_000, // 교사는 개인 큐가 주 경로, 폴링은 안전망
  });

  useRealtime(ownerEventDestinations(manager, instId), (msg) => {
    if ((msg.type === 'notice.read' || msg.type === 'notice.sent') && msg.noticeId === id) void qc.invalidateQueries({ queryKey: ['notices'] });
  });

  // 재발송 쿨타임 카운트다운
  const [now, setNow] = useState(dayjs());
  useEffect(() => {
    const t = setInterval(() => setNow(dayjs()), 15_000);
    return () => clearInterval(t);
  }, []);
  const canResendAt = receipts.data?.canResendAt ? dayjs(receipts.data.canResendAt) : null;
  const cooling = !!canResendAt && canResendAt.isAfter(now);
  const unread = receipts.data?.students.filter((s) => !s.read) ?? [];

  const resend = useMutation({
    mutationFn: () => api.post<{ students: number; pushRecipients: number; resentAt: string }>(`notices/${id}/resend-unread`),
    onSuccess: (r) => {
      setResendResult(tr('미열람 원생 {0}명의 보호자 {1}명에게 다시 보냈습니다.', { 0: r.students, 1: r.pushRecipients }));
      void qc.invalidateQueries({ queryKey: ['notices'] });
    },
  });

  const n = notice.data;
  const rows = (receipts.data?.students ?? []).filter((s) => (filter === 'all' ? true : filter === 'read' ? s.read : !s.read));

  return (
    <>
      <PageHeader
        title={n?.title ?? tr('알림장')}
        menuId="NTC-005"
        actions={
          <>
            <Button startIcon={<ArrowBackIcon />} component={NextLink} href="/notices">
              {tr('목록')}
            </Button>
            {n?.status === 'SENT' && (
              <Button variant="outlined" component={NextLink} href={`/messages?noticeId=${id}`}>
                {tr('학부모 회신')}
              </Button>
            )}
            {n?.status === 'SCHEDULED' && (
              <>
                <Button variant="outlined" component={NextLink} href={`/notices/${id}/edit`}>
                  {tr('수정')}
                </Button>
                <Button variant="outlined" color="error" onClick={() => setCancelOpen(true)}>
                  {tr('예약 취소')}
                </Button>
              </>
            )}
          </>
        }
      />

      {notice.isFetching && !n && <LinearProgress />}
      {notice.isError && <Alert severity="error">{errorMessage(notice.error)}</Alert>}

      {n && (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 5 }}>
            <Paper sx={{ px: 3, py: 2.5 }}>
              <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                <Chip size="small" label={tr(NOTICE_KIND[n.kind])} variant="outlined" color={n.kind === 'ANNOUNCEMENT' ? 'primary' : 'default'} />
                <Chip size="small" label={tr(NOTICE_STATUS[n.status].label)} color={NOTICE_STATUS[n.status].color} />
                {n.pinned && <Chip size="small" label={tr('상단 고정')} color="secondary" variant="outlined" />}
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {tr('{0} · 대상 {1}', { 0: n.author.name, 1: targetSummary(n.targets) })}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {n.status === 'SCHEDULED' ? tr('{0} 발송 예정', { 0: dateTime(n.scheduledAt) }) : n.sentAt ? tr('{0} 발송', { 0: dateTime(n.sentAt) }) : tr('발송 안 됨')}
                {n.lastResentAt && tr(' · 마지막 재발송 {0}', { 0: dateTime(n.lastResentAt) })}
              </Typography>
              {n.targets.length > 1 && (
                <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                  {n.targets.map((t) => (
                    <Chip key={`${t.scope}-${t.id}`} size="small" label={t.name} variant="outlined" />
                  ))}
                </Stack>
              )}
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>
                {n.body}
              </Typography>
              {n.attachments.length > 0 && (
                <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
                  {n.attachments.map((f) => (
                    <Chip key={f.id} label={`${f.name} · ${fileSize(f.size)}`} onClick={() => void openFile(f.id)} />
                  ))}
                </Stack>
              )}
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 7 }}>
            <Paper sx={{ px: 3, py: 2.5 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} sx={{ mb: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1">{tr('수신 확인')}</Typography>
                  {sent ? <ReadRate stats={receipts.data?.stats ?? n.readStats} /> : <Typography variant="body2" color="text.secondary">{tr('발송 후에 볼 수 있습니다')}</Typography>}
                </Box>
                {sent && (
                  <Tooltip title={cooling ? tr('{0} 이후 다시 보낼 수 있습니다 (30분 간격)', { 0: canResendAt!.format('HH:mm') }) : ''}>
                    <span>
                      <Button
                        variant="contained"
                        color="secondary"
                        startIcon={<NotificationsActiveIcon />}
                        disabled={cooling || unread.length === 0 || resend.isPending}
                        onClick={() => (setResendResult(''), resend.mutate())}
                      >
                        {tr('미열람 {0}명에게 다시 보내기', { 0: unread.length })}
                      </Button>
                    </span>
                  </Tooltip>
                )}
              </Stack>
              {resendResult && <Alert severity="success" sx={{ mb: 2 }}>{resendResult}</Alert>}
              {resend.isError && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage(resend.error)}</Alert>}

              {sent && (
                <>
                  <Tabs value={filter} onChange={(_, v) => setFilter(v)} sx={{ mb: 1 }}>
                    <Tab value="unread" label={tr('미열람 {0}', { 0: unread.length })} />
                    <Tab value="read" label={tr('열람 {0}', { 0: (receipts.data?.students.length ?? 0) - unread.length })} />
                    <Tab value="all" label={tr('전체')} />
                  </Tabs>
                  {receipts.isFetching && <LinearProgress />}
                  <TableContainer sx={{ maxHeight: 520 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell>{tr('원생')}</TableCell>
                          <TableCell>{tr('반')}</TableCell>
                          <TableCell>{tr('보호자 열람')}</TableCell>
                          <TableCell align="right">{tr('재발송')}</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {rows.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                              {filter === 'unread' ? tr('모두 읽었습니다') : tr('해당 원생이 없습니다')}
                            </TableCell>
                          </TableRow>
                        )}
                        {rows.map((s) => (
                          <TableRow key={s.studentId}>
                            <TableCell sx={{ fontWeight: 600 }}>
                              {s.studentName}
                              {!s.appLinked && <Chip size="small" label={tr('앱 미연결')} color="warning" variant="outlined" sx={{ ml: 1 }} />}
                            </TableCell>
                            <TableCell>{s.classroomNames.join(', ')}</TableCell>
                            <TableCell>
                              <Stack spacing={0.25}>
                                {s.guardians.map((g) => (
                                  <Typography key={g.userId} variant="body2" color={g.readAt ? 'text.primary' : 'text.secondary'}>
                                    {g.name} · {g.readAt ? tr('{0} 읽음', { 0: dateTime(g.readAt) }) : g.deliveredAt ? tr('전달됨, 안 읽음') : tr('전달 전')}
                                  </Typography>
                                ))}
                                {s.guardians.length === 0 && (
                                  <Typography variant="body2" color="text.secondary">
                                    {tr('받을 보호자 없음')}
                                  </Typography>
                                )}
                              </Stack>
                            </TableCell>
                            <TableCell align="right">{s.resentCount > 0 ? tr('{0}회', { 0: s.resentCount }) : '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}

      <CancelDialog open={cancelOpen} id={id} onClose={() => setCancelOpen(false)} />
    </>
  );
}

function CancelDialog({ open, id, onClose }: { open: boolean; id: string; onClose: () => void }) {
  const tr = useT();
  const qc = useQueryClient();
  const cancel = useMutation({
    mutationFn: () => api.post(`notices/${id}/cancel`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['notices'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
      onClose();
    },
  });
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{tr('예약 취소')}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mt: 1 }}>
          {tr('예약된 알림장을 취소합니다. 학부모에게 발송되지 않습니다.')}
        </Typography>
        {cancel.isError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {errorMessage(cancel.error)}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{tr('닫기')}</Button>
        <Button variant="contained" color="error" disabled={cancel.isPending} onClick={() => cancel.mutate()}>
          {tr('예약 취소')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
