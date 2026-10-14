'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import TuneIcon from '@mui/icons-material/Tune';
import AddIcon from '@mui/icons-material/Add';
import Link from 'next/link';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
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
import KpiCard from '@/components/ui/KpiCard';
import StatusBadge from '@/components/ui/StatusBadge';
import SegmentTabs from '@/components/ui/SegmentTabs';
import EmptyState from '@/components/ui/EmptyState';
import WidgetCard from '@/components/dashboard/WidgetCard';
import { color, font, tone } from '@/theme/tokens';
import type { StatusKind } from '@/theme/status';

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
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h2" component="h2">
            {t('안녕하세요, {0} {1}님', { 0: session?.user.name ?? '', 1: role ? t(ROLE_LABEL[role]) : '' })}
          </Typography>
          {k && (
            <Typography sx={{ mt: 0.75, fontSize: 15, color: 'text.secondary' }}>
              {t('오늘 등원 예정 {0}명 중 {1}명이 등원했어요.', { 0: k.total - k.excusedAbsent, 1: k.present })}
              {k.notArrived > 0 && ` ${t('확인이 필요한 학생이 {0}명 있어요.', { 0: k.notArrived })}`}
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button variant="outlined" component={Link} href="/attendance">
            {t('출결 현황 보기')}
          </Button>
          <Button variant="contained" component={Link} href="/notices/new" startIcon={<AddIcon />}>
            {t('알림장 쓰기')}
          </Button>
        </Box>
      </Box>
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
          <Box key={w.key} component="section" aria-label={t('오늘 출결 KPI')} sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', mb: 3 }}>
            <KpiCard
              label={t('실시간 등원율')}
              menuId="DASH-001"
              loading={!k}
              value={k ? percent(k.attendanceRate) : ''}
              sub={k ? t('{0} / {1}명', { 0: k.present, 1: k.total - k.excusedAbsent }) : undefined}
              progress={k?.attendanceRate ?? null}
              progressTone="success"
            />
            <KpiCard
              label={t('미등원')}
              menuId="DASH-001"
              loading={!k}
              value={k ? <Box component="span" sx={{ color: k.notArrived > 0 ? tone.red.fg : 'inherit' }}>{t('{0}명', { 0: k.notArrived })}</Box> : ''}
              footer={k && <StatusBadge kind={k.notArrived > 0 ? 'late' : 'neutral'} label={t('지각 기준 시각 경과')} />}
            />
            <KpiCard
              label={t('결석 · 지각')}
              menuId="DASH-005"
              loading={!k}
              value={k ? t('{0} · {1}명', { 0: k.absent, 1: k.late }) : ''}
              footer={k && <StatusBadge kind={k.excusedAbsent > 0 ? 'absent' : 'neutral'} label={t('사유 등록 결석 {0}명', { 0: k.excusedAbsent })} />}
            />
            <KpiCard
              label={t('공지 열람률')}
              menuId="DASH-001"
              loading={!k}
              value={k ? percent(k.noticeReadRate) : ''}
              sub={t('최근 24시간 발송분')}
              progress={k?.noticeReadRate ?? null}
              progressTone="info"
            />
          </Box>
        ),
      )}

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, alignItems: 'start' }}>
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

/** DASH-005 미등원 · 지각 · 결석 명단 */
function StudentWidgets({ data, loading }: { data?: DashboardToday; loading: boolean }) {
  const t = useT();
  const [tab, setTab] = useState<'notArrived' | 'late' | 'absent'>('notArrived');
  const list: DashboardStudentItem[] = data?.widgets[tab] ?? [];
  return (
    <WidgetCard title={t('확인이 필요한 원생')} menuId="DASH-005">
      <Box sx={{ px: 3, pb: 1.5 }}>
        <SegmentTabs
          value={tab}
          onChange={setTab}
          ariaLabel={t('확인이 필요한 원생')}
          items={[
            { value: 'notArrived', label: t('미등원 {0}', { 0: data?.widgets.notArrived.length ?? '' }) },
            { value: 'late', label: t('지각 {0}', { 0: data?.widgets.late.length ?? '' }) },
            { value: 'absent', label: t('결석 {0}', { 0: data?.widgets.absent.length ?? '' }) },
          ]}
        />
      </Box>
      {loading ? (
        <Box sx={{ px: 3, pb: 2 }}>
          <Skeleton />
          <Skeleton />
        </Box>
      ) : list.length === 0 ? (
        <EmptyState dense title={t('해당 원생이 없습니다')} />
      ) : (
        <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, maxHeight: 340, overflow: 'auto' }}>
          {list.map((s) => (
            <Box component="li" key={s.dayId} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 3, py: 1.25, borderTop: `1px solid ${color.rowDivider}` }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: 14 }}>
                  <Box component="strong" sx={{ fontWeight: 600 }}>{s.studentName}</Box>{' '}
                  <Box component="span" sx={{ color: 'text.secondary' }}>· {s.classroomName}</Box>
                </Typography>
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                  {tab === 'notArrived'
                    ? t('수업 {0} 시작 · {1}분 경과', { 0: s.classStartTime.slice(0, 5), 1: s.minutesLate ?? 0 })
                    : tab === 'late'
                      ? t('{0} 등원 · {1}분 늦음', { 0: time(s.checkInAt), 1: s.minutesLate ?? 0 })
                      : s.absenceReason ?? t('사유 미등록')}
                </Typography>
              </Box>
              <StatusChip status={s.status} isLate={tab === 'late'} />
            </Box>
          ))}
        </Box>
      )}
      <Box sx={{ px: 3, pt: 1.5, pb: 1 }}>
        <Typography component={Link} href="/attendance" sx={{ fontSize: 14, fontWeight: 600, color: color.link, textDecoration: 'none' }}>
          {t('데일리 리포트에서 처리 →')}
        </Typography>
      </Box>
    </WidgetCard>
  );
}

const SCHEDULE_LABEL: Record<ScheduleItem['kind'], { label: string; kind: StatusKind }> = {
  EVENT: { label: '행사', kind: 'info' },
  RSVP_DEADLINE: { label: '응답 마감', kind: 'caution' },
  NOTICE_SCHEDULED: { label: '예약 발송', kind: 'neutral' },
};

/** DASH-003 오늘·내일 일정 */
function SchedulePanel({ items, loading }: { items?: ScheduleItem[]; loading: boolean }) {
  const t = useT();
  return (
    <WidgetCard title={t('오늘·내일 일정')} menuId="DASH-003" loading={loading} empty={!items?.length && t('예정된 일정이 없습니다')}>
      <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
        {(items ?? []).map((i) => (
          <Box component="li" key={`${i.kind}-${i.refId}`} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, px: 3, py: 1.25, borderTop: `1px solid ${color.rowDivider}` }}>
            <StatusBadge kind={SCHEDULE_LABEL[i.kind].kind} label={t(SCHEDULE_LABEL[i.kind].label)} minWidth={72} />
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{i.title}</Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{[dateTime(i.at), i.detail].filter(Boolean).join(' · ')}</Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </WidgetCard>
  );
}

const SOURCE_LABEL: Record<TimelineEntry['source'], string> = { TEACHER_APP: '교사앱', ADMIN_WEB: '웹', SYSTEM: '시스템', STUDENT_APP: '학생 QR' };

/** DASH-002 실시간 타임라인 (최신 20건, 소켓 신호로 갱신) */
function TimelinePanel({ entries, loading }: { entries?: TimelineEntry[]; loading: boolean }) {
  const t = useT();
  return (
    <WidgetCard
      title={t('실시간 등·하원 타임라인')}
      menuId="DASH-002"
      actions={
        <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, fontSize: 12, fontWeight: 600, color: tone.green.fg }}>
          <Box component="span" aria-hidden sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main' }} />
          LIVE
        </Box>
      }
      loading={loading}
      empty={!entries?.length && t('아직 오늘 출결 기록이 없습니다')}
    >
      <Box component="ol" sx={{ listStyle: 'none', m: 0, p: 0, maxHeight: 640, overflow: 'auto' }}>
        {(entries ?? []).map((e) => (
          <Box component="li" key={e.eventId} sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 3, py: 1.5, borderTop: `1px solid ${color.rowDivider}`, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
            <Typography component="time" sx={{ fontFamily: font.mono, fontSize: 13, color: 'text.secondary', width: 44, flexShrink: 0 }}>
              {time(e.occurredAt)}
            </Typography>
            <StatusChip status={e.toStatus} isLate={e.isLate} />
            <Typography sx={{ flex: 1, minWidth: 0, fontSize: 14 }}>
              <Box component="strong" sx={{ fontWeight: 600 }}>{e.studentName}</Box>
              {e.classroomName && <Box component="span" sx={{ color: 'text.secondary' }}> · {e.classroomName}</Box>}
              {e.type === 'STATUS_CHANGE' && e.reason && <Box component="span" sx={{ color: 'text.secondary' }}> · {t('수동 변경: {0}', { 0: e.reason })}</Box>}
            </Typography>
            <Typography sx={{ fontSize: 13, color: e.destinationName ? 'text.primary' : 'text.secondary', textAlign: 'right' }}>
              {e.destinationName ? `→ ${e.destinationName}` : `${e.actorName} (${t(SOURCE_LABEL[e.source])})`}
            </Typography>
          </Box>
        ))}
      </Box>
      <Box sx={{ px: 3, pt: 1.5, pb: 1 }}>
        <Typography component={Link} href="/attendance" sx={{ fontSize: 14, fontWeight: 600, color: color.link, textDecoration: 'none' }}>
          {t('전체 출결 로그 보기 →')}
        </Typography>
      </Box>
    </WidgetCard>
  );
}
