'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { api, errorMessage } from '@/lib/api';
import { dateTime, time } from '@/lib/format';
import type { DashboardWidget, TeacherDashboard } from '@/lib/dashboard';
import WidgetCard from '@/components/dashboard/WidgetCard';
import { useT } from '@/lib/i18n';

export const TEACHER_WIDGETS = ['today-classes', 'attendance-todo', 'cautions', 'comm-todo', 'progress', 'work-memos'];
export const TEACHER_WIDGET_LABEL: Record<string, string> = {
  'today-classes': '오늘 내 수업',
  'attendance-todo': '출결 할 일',
  cautions: '오늘 원생 주의 정보',
  'comm-todo': '소통 할 일',
  progress: '진도 기록',
  'work-memos': '내 근무 · 공지',
};

const PHASE: Record<string, { label: string; color: 'success' | 'default' | 'info' }> = {
  NOW: { label: '수업 중', color: 'success' },
  UPCOMING: { label: '예정', color: 'info' },
  DONE: { label: '끝남', color: 'default' },
};
const ABS_KIND: Record<string, string> = { ABSENT: '결석', LATE: '지각', EARLY_LEAVE: '조퇴' };
const MODE: Record<string, string> = { IN_PERSON: '대면', PHONE: '전화', VIDEO: '화상' };

/**
 * DASH-018~023 교사 대시보드. teacherId 를 주면 원장·실장이 그 교사 화면을 미리 본다(읽기 전용).
 */
export default function TeacherDashboardView({ instId, teacherId, widgets }: { instId?: string; teacherId?: string; widgets: DashboardWidget[] }) {
  const t = useT();
  const readOnly = !!teacherId;
  const q = useQuery({
    queryKey: ['dashboard', 'teacher', instId, teacherId ?? 'me'],
    queryFn: () => api.get<TeacherDashboard>('dashboard/teacher', { teacherId }),
    enabled: !!instId,
    refetchInterval: 60_000,
  });
  const d = q.data;
  if (q.isError) return <Alert severity="error">{errorMessage(q.error)}</Alert>;

  const blocks: Record<string, ReactNode> = {
    'today-classes': <TodayClasses d={d} loading={q.isLoading} />,
    'attendance-todo': <AttendanceTodo d={d} loading={q.isLoading} />,
    cautions: <Cautions d={d} loading={q.isLoading} />,
    'comm-todo': <CommTodo d={d} loading={q.isLoading} />,
    progress: <ProgressTodo d={d} loading={q.isLoading} />,
    'work-memos': <WorkAndMemos d={d} loading={q.isLoading} readOnly={readOnly} instId={instId} />,
  };
  return (
    <>
      {readOnly && d && <Alert severity="info" sx={{ mb: 2 }}>{t('{0} 선생님의 교사 대시보드를 보고 있습니다 (읽기 전용).', { 0: d.teacherName })}</Alert>}
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, alignItems: 'start' }}>
        {widgets.filter((w) => w.visible && blocks[w.key]).map((w) => <Box key={w.key}>{blocks[w.key]}</Box>)}
      </Box>
    </>
  );
}

type P = { d?: TeacherDashboard; loading: boolean };

/** DASH-018 오늘 내 수업 */
function TodayClasses({ d, loading }: P) {
  const t = useT();
  return (
    <WidgetCard title={t('오늘 내 수업')} menuId="DASH-018" loading={loading} empty={!loading && !d?.classes.length && t('오늘 수업 없음')}>
      <List dense disablePadding>
        {d?.classes.map((c) => (
          <ListItemButton key={c.classroomId} component={Link} href="/attendance" divider selected={c.phase === 'NOW'}>
            <Typography variant="body2" sx={{ width: 96, flexShrink: 0 }}>{c.startTime}–{c.endTime}</Typography>
            <ListItemText
              primary={c.name}
              secondary={t('등원 {0} / 예정 {1} · 하원 {2} · 결석 {3}', { 0: c.present, 1: c.scheduled, 2: c.checkedOut, 3: c.absent })}
            />
            <Chip size="small" color={PHASE[c.phase].color} label={t(PHASE[c.phase].label)} />
          </ListItemButton>
        ))}
      </List>
    </WidgetCard>
  );
}

/** DASH-019 출결 할 일 */
function AttendanceTodo({ d, loading }: P) {
  const t = useT();
  const total = (d?.notArrived.length ?? 0) + (d?.notCheckedOut.length ?? 0) + (d?.absenceRequests.length ?? 0);
  return (
    <WidgetCard
      title={t('출결 할 일')}
      menuId="DASH-019"
      actions={total > 0 ? <Chip size="small" color="error" label={t('{0}건', { 0: total })} /> : undefined}
      loading={loading}
      empty={!loading && total === 0 && t('처리할 출결이 없습니다')}
    >
      {d && (
        <List dense disablePadding>
          {d.notArrived.map((s) => (
            <ListItem key={`na-${s.studentId}-${s.classroomId}`} divider>
              <ListItemText
                primary={`${s.studentName} · ${s.classroomName}`}
                secondary={[t('미등원 · 수업 시작 {0}분 경과', { 0: s.minutes }), s.guardianPhone].filter(Boolean).join(' · ')}
              />
              <Chip size="small" color="error" label={t('미등원')} />
            </ListItem>
          ))}
          {d.notCheckedOut.map((s) => (
            <ListItem key={`nc-${s.studentId}-${s.classroomId}`} divider>
              <ListItemText primary={`${s.studentName} · ${s.classroomName}`} secondary={t('수업 끝나고 {0}분 · 하원 처리 안 됨', { 0: s.minutes })} />
              <Chip size="small" color="warning" label={t('하원 미처리')} />
            </ListItem>
          ))}
          {d.absenceRequests.map((r) => (
            <ListItemButton key={r.id} component={Link} href="/absence-requests" divider>
              <ListItemText
                primary={`${r.studentName} · ${t(ABS_KIND[r.kind])}${r.expectedTime ? ` ${r.expectedTime}` : ''}`}
                secondary={[dayjs(r.date).format(t('M월 D일')), r.reason].filter(Boolean).join(' · ')}
              />
              <Chip size="small" label={t('확인 대기')} />
            </ListItemButton>
          ))}
        </List>
      )}
      <Box sx={{ p: 1.5, textAlign: 'right' }}>
        <Typography component={Link} href="/attendance" variant="body2" color="primary" sx={{ textDecoration: 'none' }}>{t('데일리 리포트에서 처리 →')}</Typography>
      </Box>
    </WidgetCard>
  );
}

/** DASH-020 오늘 원생 주의 정보 */
function Cautions({ d, loading }: P) {
  const t = useT();
  const label = (c: TeacherDashboard['cautions'][number]) => {
    switch (c.kind) {
      case 'HEALTH':
        return [c.text && t('알레르기: {0}', { 0: c.text }), c.sub && t('지병·복용 약: {0}', { 0: c.sub })].filter(Boolean).join(' · ');
      case 'BIRTHDAY':
        return t('오늘 생일 (만 {0}세)', { 0: c.text ?? '' });
      case 'ABSENCE_NOTE': {
        const [kind, at] = (c.sub ?? '').split(' ');
        return [t('학부모 신청: {0}', { 0: t(ABS_KIND[kind] ?? kind) }), at, c.text].filter(Boolean).join(' · ');
      }
      case 'COUNSEL':
        return t('최근 상담 {0}: {1}', { 0: c.sub ? dayjs(c.sub).format('M/D') : '', 1: c.text ?? '' });
    }
  };
  const color = { HEALTH: 'error', BIRTHDAY: 'secondary', ABSENCE_NOTE: 'warning', COUNSEL: 'info' } as const;
  const kindLabel = { HEALTH: '건강', BIRTHDAY: '생일', ABSENCE_NOTE: '사전 신청', COUNSEL: '상담' } as const;
  return (
    <WidgetCard title={t('오늘 원생 주의 정보')} menuId="DASH-020" loading={loading} empty={!loading && !d?.cautions.length && t('오늘 특별히 챙길 원생이 없습니다')}>
      <List dense disablePadding>
        {d?.cautions.map((c, i) => (
          <ListItem key={`${c.studentId}-${c.kind}-${i}`} divider alignItems="flex-start">
            <Chip size="small" color={color[c.kind]} variant="outlined" label={t(kindLabel[c.kind])} sx={{ mr: 1.5, mt: 0.5, minWidth: 64 }} />
            <ListItemText primary={`${c.studentName} · ${c.classroomName}`} secondary={label(c)} />
          </ListItem>
        ))}
      </List>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', p: 1.5 }}>{t('건강 정보는 담당 반 원생만 보입니다.')}</Typography>
    </WidgetCard>
  );
}

/** DASH-021 소통 할 일 */
function CommTodo({ d, loading }: P) {
  const t = useT();
  const empty = d && !d.conversations.length && !d.notices.length && !d.events.length && !d.consults.length;
  return (
    <WidgetCard title={t('소통 할 일')} menuId="DASH-021" loading={loading} empty={!loading && empty && t('답장·재발송할 것이 없습니다')}>
      {d && (
        <List dense disablePadding>
          {d.consults.map((c) => (
            <ListItemButton key={c.slotId} component={Link} href="/consults" divider>
              <ListItemText primary={t('{0} 상담 · {1}', { 0: time(c.startsAt), 1: c.studentName ?? '-' })} secondary={[t(MODE[c.mode]), c.topic].filter(Boolean).join(' · ')} />
              <Chip size="small" color="primary" label={t('오늘 상담')} />
            </ListItemButton>
          ))}
          {d.conversations.map((c) => (
            <ListItemButton key={c.conversationId} component={Link} href={`/messages?c=${c.conversationId}`} divider>
              <ListItemText primary={t('{0} 보호자', { 0: c.studentName })} secondary={[c.preview, dateTime(c.lastMessageAt)].filter(Boolean).join(' · ')} />
              <Chip size="small" color="warning" label={t('답장 대기 {0}', { 0: c.unread })} />
            </ListItemButton>
          ))}
          {d.notices.map((n) => (
            <ListItemButton key={n.noticeId} component={Link} href={`/notices/${n.noticeId}`} divider>
              <ListItemText
                primary={n.title}
                secondary={[
                  t('{0} 발송', { 0: dateTime(n.sentAt) }),
                  n.canResendAt && dayjs(n.canResendAt).isAfter(dayjs()) ? t('{0} 이후 다시 보낼 수 있습니다 (30분 간격)', { 0: time(n.canResendAt) }) : null,
                ].filter(Boolean).join(' · ')}
              />
              <Chip size="small" label={t('미열람 {0}', { 0: n.unread })} />
            </ListItemButton>
          ))}
          {d.events.map((e) => (
            <ListItemButton key={e.eventId} component={Link} href={`/events/${e.eventId}`} divider>
              <ListItemText primary={e.title} secondary={t('응답 마감 {0}', { 0: dateTime(e.deadline) })} />
              <Chip size="small" color="warning" label={t('미응답 {0}', { 0: e.noResponse })} />
            </ListItemButton>
          ))}
        </List>
      )}
    </WidgetCard>
  );
}

/** DASH-022 진도·숙제 기록 리마인드 */
function ProgressTodo({ d, loading }: P) {
  const t = useT();
  return (
    <WidgetCard title={t('진도 기록')} menuId="DASH-022" loading={loading} empty={!loading && !d?.progressMissing.length && t('오늘 끝난 수업의 진도를 모두 기록했습니다')}>
      <List dense disablePadding>
        {d?.progressMissing.map((p) => (
          <ListItemButton key={p.classroomId} component={Link} href="/classes" divider>
            <ListItemText primary={p.classroomName} secondary={t('{0} 수업 끝 · 진도 미기록', { 0: p.endTime })} />
            <Chip size="small" color="info" label={t('기록하기')} />
          </ListItemButton>
        ))}
      </List>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', p: 1.5 }}>{t('기록한 진도는 알림장 작성의 \'진도 불러오기\'로 바로 붙일 수 있습니다.')}</Typography>
    </WidgetCard>
  );
}

/** DASH-023 내 근무·공지 */
function WorkAndMemos({ d, loading, readOnly, instId }: P & { readOnly: boolean; instId?: string }) {
  const t = useT();
  const qc = useQueryClient();
  const refresh = () => void qc.invalidateQueries({ queryKey: ['dashboard', 'teacher', instId] });
  const punch = useMutation({ mutationFn: (op: 'check-in' | 'check-out') => api.post(`staff-attendance/${op}`), onSuccess: refresh });
  const ack = useMutation({ mutationFn: (v: { id: string; done?: boolean }) => api.post(`staff-memos/${v.id}/ack`, v.done === undefined ? undefined : { done: v.done }), onSuccess: refresh });
  const w = d?.work;
  const hours = w ? `${Math.floor(w.weekMinutes / 60)}:${String(w.weekMinutes % 60).padStart(2, '0')}` : '-';
  return (
    <WidgetCard title={t('내 근무 · 공지')} menuId="DASH-023" loading={loading}>
      {d && w && (
        <Box sx={{ p: 2 }}>
          {(punch.isError || ack.isError) && <Alert severity="error" sx={{ mb: 1 }}>{errorMessage(punch.error ?? ack.error)}</Alert>}
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
            <Box sx={{ flex: 1, minWidth: 180 }}>
              <Typography variant="body2">
                {w.checkInAt ? t('출근 {0}', { 0: time(w.checkInAt) }) : t('아직 출근 전입니다')}
                {w.checkOutAt ? ` · ${t('퇴근 {0}', { 0: time(w.checkOutAt) })}` : ''}
              </Typography>
              <Typography variant="caption" color="text.secondary">{t('이번 주 근무 {0}', { 0: hours })}</Typography>
            </Box>
            {!readOnly && !w.checkInAt && <Button variant="contained" size="small" disabled={punch.isPending} onClick={() => punch.mutate('check-in')}>{t('출근')}</Button>}
            {!readOnly && w.checkInAt && !w.checkOutAt && <Button variant="outlined" size="small" disabled={punch.isPending} onClick={() => punch.mutate('check-out')}>{t('퇴근')}</Button>}
          </Stack>
          {w.runningTripId && (
            <Alert severity="success" sx={{ mt: 1.5 }}>{t('셔틀 운행 중: {0}', { 0: w.runningRouteName ?? '' })}</Alert>
          )}
          {!w.runningTripId && w.hasShuttleRoutes && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>{t('셔틀 운행은 교사 앱의 \'셔틀 운행\'에서 시작합니다.')}</Typography>
          )}
          <Typography variant="subtitle2" sx={{ mt: 2 }}>{t('받은 교직원 공지')}</Typography>
          {d.memos.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>{t('받은 공지가 없습니다')}</Typography>
          ) : (
            <List dense disablePadding>
              {d.memos.map((m) => (
                <ListItem
                  key={m.id}
                  divider
                  alignItems="flex-start"
                  secondaryAction={
                    readOnly ? undefined : (
                      <Button size="small" disabled={ack.isPending} onClick={() => ack.mutate({ id: m.id, done: true })}>{t('완료')}</Button>
                    )
                  }
                  onClick={() => !readOnly && !m.readAt && ack.mutate({ id: m.id })}
                  sx={{ pr: 10 }}
                >
                  <ListItemText
                    primary={<>{!m.readAt && <Chip size="small" color="error" label="N" sx={{ mr: 0.5, height: 18 }} />}{m.title}</>}
                    secondary={[m.body, m.authorName, m.dueDate && t('마감 {0}', { 0: dayjs(m.dueDate).format(t('M월 D일')) })].filter(Boolean).join(' · ')}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      )}
    </WidgetCard>
  );
}
