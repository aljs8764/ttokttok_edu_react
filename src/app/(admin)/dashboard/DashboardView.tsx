'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import TuneIcon from '@mui/icons-material/Tune';
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
import { dateTime, percent, ROLE_LABEL, time } from '@/lib/format';
import { useDashboardLayout, type DashboardKind, type DashboardWidget } from '@/lib/dashboard';
import { useRealtime } from '@/lib/realtime';
import { useSession } from '@/lib/session';
import type { Classroom, DashboardStudentItem, DashboardToday, ScheduleItem, StaffMember, TimelineEntry } from '@/lib/types';
import { CongestionMiniWidget, LowReadNoticesWidget, MissingAlertWidget } from '@/components/InsightWidgets';
import BillingWidget from '@/components/BillingWidget';
import { BusinessKpiRow, ChurnRiskWidget, ClassBoardWidget, InboxWidget, InstitutionsWidget, OwnerBillingWidget, StaffMemoWidget, StaffTodayWidget } from '@/components/dashboard/OwnerWidgets';
import TeacherDashboardView, { TEACHER_WIDGET_LABEL, TEACHER_WIDGETS } from '@/components/dashboard/TeacherDashboardView';
import LayoutDialog from '@/components/dashboard/LayoutDialog';
import PageHeader from '@/components/PageHeader';
import SampleModeBanner from '@/components/SampleModeBanner';
import StatusChip from '@/components/StatusChip';
import { useT } from '@/lib/i18n';

export const OWNER_WIDGETS = [
  'business-kpi', 'today-kpi', 'inbox', 'classes', 'missing', 'students', 'churn', 'billing', 'staff', 'memos',
  'schedule', 'timeline', 'low-read', 'congestion', 'subscription', 'institutions',
];
export const OWNER_WIDGET_LABEL: Record<string, string> = {
  'business-kpi': '경영 KPI', 'today-kpi': '오늘 출결 KPI', inbox: '처리 대기함', classes: '반별 운영 현황', missing: '미등원 초과 경고',
  students: '확인이 필요한 원생', churn: '이탈 위험 원생', billing: '수납 · 미납', staff: '교직원 현황', memos: '교직원 공지 · 업무 지시',
  schedule: '오늘·내일 일정', timeline: '실시간 타임라인', 'low-read': '열람률 낮은 알림장', congestion: '오늘 혼잡도',
  subscription: '구독 · 수납 현황', institutions: '운영 기관 한눈에 보기',
};
/** 두 칸을 다 쓰는 위젯 */
const WIDE = new Set(['classes', 'institutions']);

/**
 * DASH-008 역할별 대시보드 분리: 원장·실장 → 원장 대시보드, 교사 → 교사 대시보드.
 * 원장·실장은 '교사 화면 보기'로 교직원 한 명의 교사 대시보드를 읽기 전용으로 본다 (?view=teacher&teacherId=).
 */
export default function DashboardView() {
  const t = useT();
  const { session, manager } = useSession();
  const instId = session?.institution?.institutionId;
  const params = useSearchParams();
  const router = useRouter();
  const teacherId = manager ? params.get('teacherId') ?? undefined : undefined;
  const kind: DashboardKind = manager && !teacherId ? 'OWNER' : 'TEACHER';
  const layout = useDashboardLayout(kind, kind === 'OWNER' ? OWNER_WIDGETS : TEACHER_WIDGETS);
  const [layoutOpen, setLayoutOpen] = useState(false);
  const staff = useQuery({ queryKey: ['staff', instId], queryFn: () => api.get<StaffMember[]>('staff'), enabled: !!instId && manager });

  if (!session) return null;
  const settings = (
    <Button size="small" variant="outlined" startIcon={<TuneIcon />} onClick={() => setLayoutOpen(true)}>
      {t('위젯 설정')}
    </Button>
  );
  const teacherPicker = manager && (
    <TextField
      select
      size="small"
      label={t('교사 화면 보기')}
      value={teacherId ?? ''}
      onChange={(e) => router.push(e.target.value ? `/dashboard?teacherId=${e.target.value}` : '/dashboard')}
      sx={{ minWidth: 180 }}
    >
      <MenuItem value="">{t('원장 대시보드')}</MenuItem>
      {(staff.data ?? []).map((s) => (
        <MenuItem key={s.userId} value={s.userId}>
          {s.name} ({t(ROLE_LABEL[s.role])})
        </MenuItem>
      ))}
    </TextField>
  );
  return (
    <>
      {kind === 'OWNER' ? (
        <OwnerDashboard widgets={layout.widgets} actions={<>{teacherPicker}{settings}</>} />
      ) : (
        <>
          <PageHeader
            title={t('교사 대시보드')}
            menuId="DASH-018"
            description={dayjs().format(t('M월 D일 (dd)'))}
            actions={<>{teacherPicker}{settings}</>}
          />
          <TeacherDashboardView instId={instId} teacherId={teacherId} widgets={layout.widgets} />
        </>
      )}
      {layoutOpen && (
        <LayoutDialog
          widgets={layout.widgets}
          labels={kind === 'OWNER' ? OWNER_WIDGET_LABEL : TEACHER_WIDGET_LABEL}
          busy={layout.save.isPending || layout.reset.isPending}
          error={layout.save.error ?? layout.reset.error}
          onSave={(w, done) => layout.save.mutate(w, { onSuccess: done })}
          onReset={(done) => layout.reset.mutate(undefined, { onSuccess: done })}
          onClose={() => setLayoutOpen(false)}
        />
      )}
    </>
  );
}

/** DASH-001~007 기존 위젯 + DASH-009~016 원장 전용 위젯 */
function OwnerDashboard({ widgets, actions }: { widgets: DashboardWidget[]; actions: ReactNode }) {
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
  const blocks: Record<string, ReactNode> = {
    inbox: <InboxWidget instId={instId} />,
    classes: <ClassBoardWidget instId={instId} />,
    missing: <MissingAlertWidget instId={instId} />,
    students: <StudentWidgets data={today.data} loading={today.isLoading} />,
    churn: <ChurnRiskWidget instId={instId} />,
    billing: <OwnerBillingWidget instId={instId} />,
    staff: <StaffTodayWidget instId={instId} />,
    memos: <StaffMemoWidget instId={instId} />,
    schedule: <SchedulePanel items={schedule.data} loading={schedule.isLoading} />,
    timeline: <TimelinePanel entries={timeline.data} loading={timeline.isLoading} />,
    'low-read': <LowReadNoticesWidget instId={instId} />,
    congestion: <CongestionMiniWidget instId={instId} />,
    subscription: manager ? <BillingWidget instId={instId} /> : null,
    institutions: <InstitutionsWidget instId={instId} />,
  };

  return (
    <>
      <PageHeader
        title={t('원장 대시보드')}
        menuId="DASH-009"
        actions={actions}
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

      {widgets.filter((w) => w.visible && (w.key === 'business-kpi' || w.key === 'today-kpi')).map((w) =>
        w.key === 'business-kpi' ? (
          <BusinessKpiRow key={w.key} instId={instId} />
        ) : (
          <Box key={w.key} sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, mb: 2 }}>
        <Kpi label={t('실시간 등원율')} value={k ? percent(k.attendanceRate) : null} sub={k ? t('{0} / {1}명', { 0: k.present, 1: k.total - k.excusedAbsent }) : ''} progress={k?.attendanceRate ?? undefined} />
        <Kpi label={t('미등원')} value={k ? t('{0}명', { 0: k.notArrived }) : null} sub={t('지각 기준 시각 경과')} tone={k && k.notArrived > 0 ? 'error' : undefined} />
        <Kpi label={t('결석 · 지각')} value={k ? t('{0} · {1}명', { 0: k.absent, 1: k.late }) : null} sub={k ? t('사유 등록 결석 {0}명', { 0: k.excusedAbsent }) : ''} />
        <Kpi label={t('공지 열람률')} value={k ? percent(k.noticeReadRate) : null} sub={t('최근 24시간 발송분')} />
      </Box>
        ),
      )}

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, alignItems: 'start' }}>
        {widgets
          .filter((w) => w.visible && blocks[w.key])
          .map((w) => (
            <Box key={w.key} sx={{ gridColumn: WIDE.has(w.key) ? '1 / -1' : undefined }}>
              {blocks[w.key]}
            </Box>
          ))}
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
