'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
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
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DownloadIcon from '@mui/icons-material/Download';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import dayjs, { type Dayjs } from 'dayjs';
import NextLink from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, download, errorMessage } from '@/lib/api';
import { dateTime } from '@/lib/format';
import { ownerEventDestinations, useRealtime } from '@/lib/realtime';
import { useSession } from '@/lib/session';
import type { EventSummary, SchoolEvent } from '@/lib/types';
import PageHeader from '@/components/PageHeader';
import { targetSummary } from '@/components/TargetPicker';
import { REMINDER_OPTIONS, eventTimeError } from '../EventForm';
import { TallyBar } from '../EventsView';

const ANSWER = { ATTEND: { label: '참석', color: 'success' as const }, ABSENT: { label: '불참', color: 'error' as const } };
const REMIND_COOLDOWN_MIN = 30;

/** EVT-003 응답 집계·명단(미응답 먼저)·엑셀, EVT-004 수동 독촉(30분 간격), 행사 수정·취소 */
export default function EventDetailView({ id }: { id: string }) {
  const qc = useQueryClient();
  const { session, manager } = useSession();
  const instId = session?.institution?.institutionId;
  const [filter, setFilter] = useState<'pending' | 'ATTEND' | 'ABSENT' | 'all'>('pending');
  const [editOpen, setEditOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [remindResult, setRemindResult] = useState('');
  const [dlError, setDlError] = useState('');

  const summary = useQuery({
    queryKey: ['events', instId, 'summary', id],
    queryFn: () => api.get<EventSummary>(`events/${id}/summary`),
    enabled: !!instId,
    refetchInterval: manager ? false : 120_000, // 교사는 개인 큐가 주 경로, 폴링은 안전망
  });
  useRealtime(ownerEventDestinations(manager, instId), (msg) => {
    if (msg.type === 'event.responded' && msg.eventId === id) void qc.invalidateQueries({ queryKey: ['events'] });
  });

  const remind = useMutation({
    mutationFn: () => api.post<{ pushRecipients: number }>(`events/${id}/remind`),
    onSuccess: (r) => {
      setRemindResult(`미응답 보호자 ${r.pushRecipients}명에게 독촉 알림을 보냈습니다.`);
      void qc.invalidateQueries({ queryKey: ['events'] });
    },
  });

  const s = summary.data;
  const e = s?.event;
  const now = dayjs();
  const deadlinePassed = !!e?.rsvpDeadline && dayjs(e.rsvpDeadline).isBefore(now);
  const nextRemind = e?.remindedAt ? dayjs(e.remindedAt).add(REMIND_COOLDOWN_MIN, 'minute') : null;
  const cooling = !!nextRemind && nextRemind.isAfter(now);
  const canceled = e?.status === 'CANCELED';
  const past = !!e && dayjs(e.startsAt).isBefore(now);
  const rows = (s?.rows ?? []).filter((r) => (filter === 'all' ? true : filter === 'pending' ? !r.answer : r.answer === filter));

  return (
    <>
      <PageHeader
        title={e?.title ?? '행사'}
        menuId="EVT-003"
        actions={
          <>
            <Button startIcon={<ArrowBackIcon />} component={NextLink} href="/events">
              목록
            </Button>
            {e && !canceled && !past && (
              <>
                <Button variant="outlined" onClick={() => setEditOpen(true)}>
                  수정
                </Button>
                <Button variant="outlined" color="error" onClick={() => setCancelOpen(true)}>
                  행사 취소
                </Button>
              </>
            )}
          </>
        }
      />

      {summary.isFetching && !s && <LinearProgress />}
      {summary.isError && <Alert severity="error">{errorMessage(summary.error)}</Alert>}
      {canceled && <Alert severity="warning" sx={{ mb: 2 }}>취소된 행사입니다.</Alert>}

      {s && e && (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 2.5 }}>
              <Info label="일시">
                {dateTime(e.startsAt)}
                {e.endsAt ? ` ~ ${dateTime(e.endsAt)}` : ''}
              </Info>
              <Info label="장소">{e.location ?? '-'}</Info>
              <Info label="대상">{targetSummary(e.targets)}</Info>
              <Info label="응답 마감">{e.rsvpEnabled ? `${dateTime(e.rsvpDeadline)}${deadlinePassed ? ' (마감)' : ''}` : '참석 여부 안 받음'}</Info>
              {e.rsvpEnabled && <Info label="자동 독촉">{REMINDER_OPTIONS.find((o) => o.value === e.reminderHoursBefore)?.label ?? `마감 ${e.reminderHoursBefore}시간 전`}</Info>}
              <Info label="작성">{e.authorName}</Info>
              {e.body && (
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: 2 }}>
                  {e.body}
                </Typography>
              )}
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 8 }}>
            <Paper sx={{ p: 2.5 }}>
              {!e.rsvpEnabled ? (
                <Typography variant="body2" color="text.secondary">
                  참석 여부를 받지 않는 행사입니다.
                </Typography>
              ) : (
                <>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} sx={{ mb: 2 }}>
                    <Stack sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" sx={{ mb: 0.5 }}>
                        응답 현황
                      </Typography>
                      <TallyBar tally={s.tally} large />
                    </Stack>
                    <Button
                      variant="outlined"
                      startIcon={<DownloadIcon />}
                      onClick={() => (setDlError(''), download('GET', `events/${id}/responses.xlsx`, undefined, `${e.title}_응답명단.xlsx`).catch((x) => setDlError(errorMessage(x))))}
                    >
                      명단 엑셀
                    </Button>
                    <Tooltip title={cooling ? `${nextRemind!.format('HH:mm')} 이후 다시 보낼 수 있습니다 (30분 간격)` : deadlinePassed ? '응답 마감이 지났습니다' : ''}>
                      <span>
                        <Button
                          variant="contained"
                          color="secondary"
                          startIcon={<NotificationsActiveIcon />}
                          disabled={canceled || deadlinePassed || cooling || s.tally.pending === 0 || remind.isPending}
                          onClick={() => (setRemindResult(''), remind.mutate())}
                        >
                          미응답 {s.tally.pending}명 독촉
                        </Button>
                      </span>
                    </Tooltip>
                  </Stack>
                  {e.remindedAt && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                      마지막 독촉 {dateTime(e.remindedAt)}
                    </Typography>
                  )}
                  {remindResult && <Alert severity="success" sx={{ mb: 2 }}>{remindResult}</Alert>}
                  {remind.isError && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage(remind.error)}</Alert>}
                  {dlError && <Alert severity="error" sx={{ mb: 2 }}>{dlError}</Alert>}

                  <Tabs value={filter} onChange={(_, v) => setFilter(v)} sx={{ mb: 1 }}>
                    <Tab value="pending" label={`미응답 ${s.tally.pending}`} />
                    <Tab value="ATTEND" label={`참석 ${s.tally.attend}`} />
                    <Tab value="ABSENT" label={`불참 ${s.tally.absent}`} />
                    <Tab value="all" label="전체" />
                  </Tabs>
                  <TableContainer sx={{ maxHeight: 520 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell>원생</TableCell>
                          <TableCell>반</TableCell>
                          <TableCell>응답</TableCell>
                          <TableCell>사유</TableCell>
                          <TableCell>응답 시각</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {rows.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                              {filter === 'pending' ? '모두 응답했습니다' : '해당 원생이 없습니다'}
                            </TableCell>
                          </TableRow>
                        )}
                        {rows.map((r) => (
                          <TableRow key={r.studentId}>
                            <TableCell sx={{ fontWeight: 600 }}>{r.studentName}</TableCell>
                            <TableCell>{r.classroomNames.join(', ')}</TableCell>
                            <TableCell>{r.answer ? <Chip size="small" label={ANSWER[r.answer].label} color={ANSWER[r.answer].color} /> : <Chip size="small" label="미응답" variant="outlined" />}</TableCell>
                            <TableCell>{r.reason ?? '-'}</TableCell>
                            <TableCell>
                              {r.respondedAt ? `${dateTime(r.respondedAt)}${r.respondedByName ? ` · ${r.respondedByName}` : ''}` : '-'}
                            </TableCell>
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

      {e && <EditEventDialog open={editOpen} event={e} onClose={() => setEditOpen(false)} />}
      <CancelDialog open={cancelOpen} id={id} onClose={() => setCancelOpen(false)} />
    </>
  );
}

function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Stack direction="row" spacing={2} sx={{ py: 0.5 }}>
      <Typography variant="body2" color="text.secondary" sx={{ width: 72, flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography variant="body2">{children}</Typography>
    </Stack>
  );
}

/** 대상·RSVP 여부는 바꿀 수 없다 (이미 알림이 나간 대상이 달라지지 않도록) */
function EditEventDialog({ open, event, onClose }: { open: boolean; event: SchoolEvent; onClose: () => void }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [location, setLocation] = useState('');
  const [startsAt, setStartsAt] = useState<Dayjs | null>(null);
  const [endsAt, setEndsAt] = useState<Dayjs | null>(null);
  const [deadline, setDeadline] = useState<Dayjs | null>(null);
  const [reminder, setReminder] = useState(24);

  useEffect(() => {
    if (!open) return;
    setTitle(event.title);
    setBody(event.body ?? '');
    setLocation(event.location ?? '');
    setStartsAt(dayjs(event.startsAt));
    setEndsAt(event.endsAt ? dayjs(event.endsAt) : null);
    setDeadline(event.rsvpDeadline ? dayjs(event.rsvpDeadline) : null);
    setReminder(event.reminderHoursBefore ?? 24);
  }, [open, event]);

  const save = useMutation({
    mutationFn: () =>
      api.patch(`events/${event.id}`, {
        title: title.trim(),
        body: body.trim() || null,
        location: location.trim() || null,
        startsAt: startsAt!.toISOString(),
        endsAt: endsAt?.toISOString() ?? null,
        rsvpDeadline: event.rsvpEnabled ? deadline?.toISOString() : null,
        reminderHoursBefore: reminder,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['events'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
      onClose();
    },
  });

  const timeError = eventTimeError(startsAt, endsAt, event.rsvpEnabled, deadline, false);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>행사 수정</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="행사명" required value={title} onChange={(e) => setTitle(e.target.value)} inputProps={{ maxLength: 100 }} />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <DateTimePicker label="시작" value={startsAt} onChange={setStartsAt} format="YYYY-MM-DD HH:mm" ampm={false} slotProps={{ textField: { fullWidth: true } }} />
            <DateTimePicker label="종료" value={endsAt} onChange={setEndsAt} format="YYYY-MM-DD HH:mm" ampm={false} slotProps={{ textField: { fullWidth: true }, field: { clearable: true } }} />
          </Stack>
          <TextField label="장소" value={location} onChange={(e) => setLocation(e.target.value)} inputProps={{ maxLength: 200 }} />
          <TextField label="안내 내용" multiline minRows={4} value={body} onChange={(e) => setBody(e.target.value)} inputProps={{ maxLength: 5000 }} />
          {event.rsvpEnabled && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <DateTimePicker label="응답 마감" value={deadline} onChange={setDeadline} format="YYYY-MM-DD HH:mm" ampm={false} slotProps={{ textField: { fullWidth: true } }} />
              <TextField select label="자동 독촉" value={reminder} onChange={(e) => setReminder(Number(e.target.value))} fullWidth>
                {REMINDER_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          )}
          {timeError && (
            <Typography variant="body2" color="error">
              {timeError}
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary">
            대상과 참석 여부 받기 설정은 바꿀 수 없습니다. 바꿔야 하면 행사를 취소하고 새로 만드세요.
          </Typography>
          {save.isError && <Alert severity="error">{errorMessage(save.error)}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>취소</Button>
        <Button variant="contained" disabled={!title.trim() || !!timeError || save.isPending} onClick={() => save.mutate()}>
          저장
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function CancelDialog({ open, id, onClose }: { open: boolean; id: string; onClose: () => void }) {
  const qc = useQueryClient();
  const cancel = useMutation({
    mutationFn: () => api.post(`events/${id}/cancel`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['events'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
      onClose();
    },
  });
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>행사 취소</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mt: 1 }}>
          행사를 취소합니다. 학부모 앱에서 취소로 표시되고 더 이상 응답을 받지 않습니다.
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
          행사 취소
        </Button>
      </DialogActions>
    </Dialog>
  );
}
