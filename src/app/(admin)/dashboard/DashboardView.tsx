'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import LinearProgress from '@mui/material/LinearProgress';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { api, errorMessage } from '@/lib/api';
import { dateTime, percent, time } from '@/lib/format';
import { useRealtime } from '@/lib/realtime';
import { useSession } from '@/lib/session';
import type { Classroom, DashboardStudentItem, DashboardToday, ScheduleItem, TimelineEntry } from '@/lib/types';
import { CongestionMiniWidget, LowReadNoticesWidget, MissingAlertWidget } from '@/components/InsightWidgets';
import BillingWidget from '@/components/BillingWidget';
import PageHeader from '@/components/PageHeader';
import SampleModeBanner from '@/components/SampleModeBanner';
import StatusChip from '@/components/StatusChip';
import { useT } from '@/lib/i18n';

/** DASH-001 투데이 KPI · DASH-002 실시간 타임라인 · DASH-003 주요 일정 · DASH-004 미열람 알림장 · DASH-005 결석/지각 위젯 · DASH-006 혼잡도 */
export default function DashboardView() {
  const t = useT();
  const qc = useQueryClient();
  const { session, manager, role } = useSession();
  const instId = session?.institution?.institutionId;

  const today = useQuery({ queryKey: ['dashboard', 'today', instId], queryFn: () => api.get<DashboardToday>('dashboard/today'), enabled: !!instId, refetchInterval: 60_000 });
  const timeline = useQuery({ queryKey: ['dashboard', 'timeline', instId], queryFn: () => api.get<TimelineEntry[]>('dashboard/timeline', { limit: 20 }), enabled: !!instId });
  const schedule = useQuery({ queryKey: ['dashboard', 'schedule', instId], queryFn: () => api.get<ScheduleItem[]>('dashboard/schedule', { days: 2 }), enabled: !!instId });
  const classes = useQuery({ queryKey: ['classes', instId], queryFn: () => api.get<Classroom[]>('classes'), enabled: !!instId && !manager });

  // ONB-001: 원장이 반·하원 목적지를 아직 안 만들었으면 시작하기로 안내
  const owner = role === 'OWNER';
  const setupClasses = useQuery({ queryKey: ['classes', instId], queryFn: () => api.get<Classroom[]>('classes'), enabled: !!instId && owner });
  const setupDestinations = useQuery({ queryKey: ['destinations', instId], queryFn: () => api.get<unknown[]>('destinations'), enabled: !!instId && owner });
  const needsSetup = owner && !!setupClasses.data && !!setupDestinations.data && (setupClasses.data.length === 0 || setupDestinations.data.length === 0);

  // 관리자는 기관 토픽, 교사는 담당 반 토픽 (백엔드 구독 권한과 동일)
  const topics = useMemo(() => {
    if (!instId) return [];
    if (manager) return [`/topic/inst.${instId}`];
    return (classes.data ?? []).map((c) => `/topic/class.${c.id}`);
  }, [instId, manager, classes.data]);

  useRealtime(topics, (msg) => {
    if (msg.type === 'attendance.updated' || msg.type === undefined) {
      void qc.invalidateQueries({ queryKey: ['dashboard', 'today'] });
      void qc.invalidateQueries({ queryKey: ['dashboard', 'timeline'] });
    }
    if (msg.type === 'notice.read' || msg.type === 'notice.sent') void qc.invalidateQueries({ queryKey: ['dashboard', 'today'] });
  });

  const k = today.data?.kpi;

  return (
    <>
      <PageHeader
        title={t('대시보드')}
        menuId="DASH-001"
        description={today.data ? t('{0} · {1} 기준{2}', { 0: dayjs(today.data.date).format(t('M월 D일 (dd)')), 1: time(today.data.asOf), 2: manager ? '' : t(' · 담당 반') }) : undefined}
      />
      <SampleModeBanner empty={owner && setupClasses.data?.length === 0} />
      {needsSetup && (
        <Alert
          severity="info"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" component={Link} href="/onboarding">
              {t('시작하기')}
            </Button>
          }
        >
          {t('아직 반이나 하원 목적지가 없습니다. 기본 설정을 마치면 교사 앱에서 출결을 처리할 수 있습니다.')}
        </Alert>
      )}
      {today.isError && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage(today.error)}</Alert>}

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, mb: 2 }}>
        <Kpi label={t('실시간 등원율')} value={k ? percent(k.attendanceRate) : null} sub={k ? t('{0} / {1}명', { 0: k.present, 1: k.total - k.excusedAbsent }) : ''} progress={k?.attendanceRate ?? undefined} />
        <Kpi label={t('미등원')} value={k ? t('{0}명', { 0: k.notArrived }) : null} sub={t('지각 기준 시각 경과')} tone={k && k.notArrived > 0 ? 'error' : undefined} />
        <Kpi label={t('결석 · 지각')} value={k ? t('{0} · {1}명', { 0: k.absent, 1: k.late }) : null} sub={k ? t('사유 등록 결석 {0}명', { 0: k.excusedAbsent }) : ''} />
        <Kpi label={t('공지 열람률')} value={k ? percent(k.noticeReadRate) : null} sub={t('최근 24시간 발송분')} />
      </Box>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1.2fr 1fr' } }}>
        <Stack spacing={2}>
          <MissingAlertWidget instId={instId} />
          <StudentWidgets data={today.data} loading={today.isLoading} />
          <SchedulePanel items={schedule.data} loading={schedule.isLoading} />
          <LowReadNoticesWidget instId={instId} />
          <CongestionMiniWidget instId={instId} />
          {manager && <BillingWidget instId={instId} />}
        </Stack>
        <TimelinePanel entries={timeline.data} loading={timeline.isLoading} />
      </Box>
    </>
  );
}

function Kpi({ label, value, sub, progress, tone }: { label: string; value: string | null; sub?: string; progress?: number; tone?: 'error' }) {
  return (
    <Paper sx={{ p: 2.5 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      {value === null ? (
        <Skeleton width={80} height={44} />
      ) : (
        <Typography variant="h1" sx={{ my: 0.5, color: tone === 'error' ? 'error.main' : 'text.primary' }}>
          {value}
        </Typography>
      )}
      {progress !== undefined && <LinearProgress variant="determinate" value={Math.min(100, progress)} sx={{ height: 6, borderRadius: 3, my: 1 }} color="success" />}
      <Typography variant="caption" color="text.secondary">
        {sub}
      </Typography>
    </Paper>
  );
}

/** DASH-005 미등원 · 지각 · 결석 명단 */
function StudentWidgets({ data, loading }: { data?: DashboardToday; loading: boolean }) {
  const t = useT();
  const [tab, setTab] = useState<'notArrived' | 'late' | 'absent'>('notArrived');
  const list: DashboardStudentItem[] = data?.widgets[tab] ?? [];
  return (
    <Paper>
      <Box sx={{ px: 2, pt: 1, display: 'flex', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ flex: 1 }}>
          {t('확인이 필요한 원생')}
        </Typography>
        <Chip size="small" variant="outlined" label="DASH-005" />
      </Box>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 1 }}>
        <Tab value="notArrived" label={t('미등원 {0}', { 0: data?.widgets.notArrived.length ?? '' })} />
        <Tab value="late" label={t('지각 {0}', { 0: data?.widgets.late.length ?? '' })} />
        <Tab value="absent" label={t('결석 {0}', { 0: data?.widgets.absent.length ?? '' })} />
      </Tabs>
      <Divider />
      {loading ? (
        <Box sx={{ p: 2 }}>
          <Skeleton />
          <Skeleton />
        </Box>
      ) : list.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
          {t('해당 원생이 없습니다')}
        </Typography>
      ) : (
        <List dense disablePadding sx={{ maxHeight: 320, overflow: 'auto' }}>
          {list.map((s) => (
            <ListItem key={s.dayId} divider secondaryAction={<StatusChip status={s.status} isLate={tab === 'late'} />}>
              <ListItemText
                primary={`${s.studentName} · ${s.classroomName}`}
                secondary={
                  tab === 'notArrived'
                    ? t('수업 {0} 시작 · {1}분 경과', { 0: s.classStartTime.slice(0, 5), 1: s.minutesLate ?? 0 })
                    : tab === 'late'
                      ? t('{0} 등원 · {1}분 늦음', { 0: time(s.checkInAt), 1: s.minutesLate ?? 0 })
                      : s.absenceReason ?? t('사유 미등록')
                }
              />
            </ListItem>
          ))}
        </List>
      )}
      <Box sx={{ p: 1.5, textAlign: 'right' }}>
        <Typography component={Link} href="/attendance" variant="body2" color="primary" sx={{ textDecoration: 'none' }}>
          {t('데일리 리포트에서 처리 →')}
        </Typography>
      </Box>
    </Paper>
  );
}

const SCHEDULE_LABEL: Record<ScheduleItem['kind'], { label: string; color: 'primary' | 'warning' | 'info' }> = {
  EVENT: { label: '행사', color: 'primary' },
  RSVP_DEADLINE: { label: '응답 마감', color: 'warning' },
  NOTICE_SCHEDULED: { label: '예약 발송', color: 'info' },
};

/** DASH-003 오늘·내일 일정 */
function SchedulePanel({ items, loading }: { items?: ScheduleItem[]; loading: boolean }) {
  const t = useT();
  return (
    <Paper>
      <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ flex: 1 }}>
          {t('오늘·내일 일정')}
        </Typography>
        <Chip size="small" variant="outlined" label="DASH-003" />
      </Box>
      <Divider />
      {loading ? (
        <Box sx={{ p: 2 }}>
          <Skeleton />
        </Box>
      ) : !items?.length ? (
        <Typography variant="body2" color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
          {t('예정된 일정이 없습니다')}
        </Typography>
      ) : (
        <List dense disablePadding>
          {items.map((i) => (
            <ListItem key={`${i.kind}-${i.refId}`} divider>
              <Chip size="small" label={t(SCHEDULE_LABEL[i.kind].label)} color={SCHEDULE_LABEL[i.kind].color} variant="outlined" sx={{ mr: 1.5, minWidth: 72 }} />
              <ListItemText primary={i.title} secondary={[dateTime(i.at), i.detail].filter(Boolean).join(' · ')} />
            </ListItem>
          ))}
        </List>
      )}
    </Paper>
  );
}

const SOURCE_LABEL: Record<TimelineEntry['source'], string> = { TEACHER_APP: '교사앱', ADMIN_WEB: '웹', SYSTEM: '시스템', STUDENT_APP: '학생 QR' };

/** DASH-002 실시간 타임라인 (최신 20건, 소켓 신호로 갱신) */
function TimelinePanel({ entries, loading }: { entries?: TimelineEntry[]; loading: boolean }) {
  const t = useT();
  return (
    <Paper>
      <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="h4" sx={{ flex: 1 }}>
          {t('실시간 타임라인')}
        </Typography>
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main' }} title={t('실시간 연결')} />
        <Chip size="small" variant="outlined" label="DASH-002" />
      </Box>
      <Divider />
      {loading ? (
        <Box sx={{ p: 2 }}>
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </Box>
      ) : !entries?.length ? (
        <Typography variant="body2" color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
          {t('아직 오늘 출결 기록이 없습니다')}
        </Typography>
      ) : (
        <List dense disablePadding sx={{ maxHeight: 640, overflow: 'auto' }}>
          {entries.map((e) => (
            <ListItem key={e.eventId} divider alignItems="flex-start">
              <Typography variant="body2" color="text.secondary" sx={{ width: 48, flexShrink: 0, pt: 0.5 }}>
                {time(e.occurredAt)}
              </Typography>
              <ListItemText
                primary={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <span>
                      {e.studentName}
                      {e.classroomName ? ` · ${e.classroomName}` : ''}
                    </span>
                    <StatusChip status={e.toStatus} isLate={e.isLate} />
                  </Stack>
                }
                secondary={[
                  e.destinationName && `→ ${e.destinationName}`,
                  e.type === 'STATUS_CHANGE' && e.reason && t('수동 변경: {0}', { 0: e.reason }),
                  `${e.actorName} (${t(SOURCE_LABEL[e.source])})`,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              />
            </ListItem>
          ))}
        </List>
      )}
    </Paper>
  );
}
