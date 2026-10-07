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

/**
 * 알림장 상세 + NTC-005 수신 확인(원생별 열람, 미열람 먼저) + NTC-006 미열람자 재발송(30분 쿨타임).
 * 예약 건은 수정·취소할 수 있다.
 */
export default function NoticeDetailView({ id }: { id: string }) {
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
      setResendResult(`미열람 원생 ${r.students}명의 보호자 ${r.pushRecipients}명에게 다시 보냈습니다.`);
      void qc.invalidateQueries({ queryKey: ['notices'] });
    },
  });

  const n = notice.data;
  const rows = (receipts.data?.students ?? []).filter((s) => (filter === 'all' ? true : filter === 'read' ? s.read : !s.read));

  return (
    <>
      <PageHeader
        title={n?.title ?? '알림장'}
        menuId="NTC-005"
        actions={
          <>
            <Button startIcon={<ArrowBackIcon />} component={NextLink} href="/notices">
              목록
            </Button>
            {n?.status === 'SCHEDULED' && (
              <>
                <Button variant="outlined" component={NextLink} href={`/notices/${id}/edit`}>
                  수정
                </Button>
                <Button variant="outlined" color="error" onClick={() => setCancelOpen(true)}>
                  예약 취소
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
            <Paper sx={{ p: 2.5 }}>
              <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                <Chip size="small" label={NOTICE_KIND[n.kind]} variant="outlined" color={n.kind === 'ANNOUNCEMENT' ? 'primary' : 'default'} />
                <Chip size="small" label={NOTICE_STATUS[n.status].label} color={NOTICE_STATUS[n.status].color} />
                {n.pinned && <Chip size="small" label="상단 고정" color="secondary" variant="outlined" />}
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {n.author.name} · 대상 {targetSummary(n.targets)}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {n.status === 'SCHEDULED' ? `${dateTime(n.scheduledAt)} 발송 예정` : n.sentAt ? `${dateTime(n.sentAt)} 발송` : '발송 안 됨'}
                {n.lastResentAt && ` · 마지막 재발송 ${dateTime(n.lastResentAt)}`}
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
            <Paper sx={{ p: 2.5 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} sx={{ mb: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1">수신 확인</Typography>
                  {sent ? <ReadRate stats={receipts.data?.stats ?? n.readStats} /> : <Typography variant="body2" color="text.secondary">발송 후에 볼 수 있습니다</Typography>}
                </Box>
                {sent && (
                  <Tooltip title={cooling ? `${canResendAt!.format('HH:mm')} 이후 다시 보낼 수 있습니다 (30분 간격)` : ''}>
                    <span>
                      <Button
                        variant="contained"
                        color="secondary"
                        startIcon={<NotificationsActiveIcon />}
                        disabled={cooling || unread.length === 0 || resend.isPending}
                        onClick={() => (setResendResult(''), resend.mutate())}
                      >
                        미열람 {unread.length}명에게 다시 보내기
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
                    <Tab value="unread" label={`미열람 ${unread.length}`} />
                    <Tab value="read" label={`열람 ${(receipts.data?.students.length ?? 0) - unread.length}`} />
                    <Tab value="all" label="전체" />
                  </Tabs>
                  {receipts.isFetching && <LinearProgress />}
                  <TableContainer sx={{ maxHeight: 520 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell>원생</TableCell>
                          <TableCell>반</TableCell>
                          <TableCell>보호자 열람</TableCell>
                          <TableCell align="right">재발송</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {rows.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                              {filter === 'unread' ? '모두 읽었습니다' : '해당 원생이 없습니다'}
                            </TableCell>
                          </TableRow>
                        )}
                        {rows.map((s) => (
                          <TableRow key={s.studentId}>
                            <TableCell sx={{ fontWeight: 600 }}>
                              {s.studentName}
                              {!s.appLinked && <Chip size="small" label="앱 미연결" color="warning" variant="outlined" sx={{ ml: 1 }} />}
                            </TableCell>
                            <TableCell>{s.classroomNames.join(', ')}</TableCell>
                            <TableCell>
                              <Stack spacing={0.25}>
                                {s.guardians.map((g) => (
                                  <Typography key={g.userId} variant="body2" color={g.readAt ? 'text.primary' : 'text.secondary'}>
                                    {g.name} · {g.readAt ? `${dateTime(g.readAt)} 읽음` : g.deliveredAt ? '전달됨, 안 읽음' : '전달 전'}
                                  </Typography>
                                ))}
                                {s.guardians.length === 0 && (
                                  <Typography variant="body2" color="text.secondary">
                                    받을 보호자 없음
                                  </Typography>
                                )}
                              </Stack>
                            </TableCell>
                            <TableCell align="right">{s.resentCount > 0 ? `${s.resentCount}회` : '-'}</TableCell>
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
      <DialogTitle>예약 취소</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mt: 1 }}>
          예약된 알림장을 취소합니다. 학부모에게 발송되지 않습니다.
        </Typography>
        {cancel.isError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {errorMessage(cancel.error)}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>닫기</Button>
        <Button variant="contained" color="error" disabled={cancel.isPending} onClick={() => cancel.mutate()}>
          예약 취소
        </Button>
      </DialogActions>
    </Dialog>
  );
}
