'use client';

import Link from 'next/link';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import LinearProgress from '@mui/material/LinearProgress';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { dateTime, time } from '@/lib/format';
import { ratioText, type CongestionToday, type LowReadNotices } from '@/lib/stats';
import { BarChart } from '@/components/charts';
import { useT } from '@/lib/i18n';
import MenuIdChip from '@/components/ui/MenuIdChip';

/** DASH-004 미열람 알림장 위젯 — 최근 7일 발송분 중 열람률이 낮은 건 */
export function LowReadNoticesWidget({ instId }: { instId?: string }) {
  const t = useT();
  const q = useQuery({ queryKey: ['dashboard', 'low-read', instId], queryFn: () => api.get<LowReadNotices>('dashboard/widgets/low-read-notices', { limit: 5 }), enabled: !!instId, refetchInterval: 120_000 });
  return (
    <Paper>
      <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ flex: 1 }}>
          {t('열람률 낮은 알림장')}
        </Typography>
        <MenuIdChip id="DASH-004" />
      </Box>
      <Divider />
      {q.isLoading ? (
        <Box sx={{ p: 2 }}>
          <Skeleton />
          <Skeleton />
        </Box>
      ) : !q.data?.notices.length ? (
        <Typography variant="body2" color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
          {t('최근 7일 알림장은 모두 {0}% 이상 열람됐습니다', { 0: Math.round((q.data?.threshold ?? 0.5) * 100) })}
        </Typography>
      ) : (
        <List dense disablePadding>
          {q.data.notices.map((n) => (
            <ListItem key={n.noticeId} divider component={Link} href={`/notices/${n.noticeId}`} sx={{ color: 'inherit', textDecoration: 'none', display: 'block' }}>
              <ListItemText primary={n.title} secondary={t('{0} 발송 · {1}/{2}명 열람 ({3})', { 0: dateTime(n.sentAt), 1: n.readStudents, 2: n.targetStudents, 3: ratioText(n.readRate, 0) })} />
              <LinearProgress variant="determinate" value={n.readRate * 100} color="warning" sx={{ height: 5, borderRadius: 3 }} />
            </ListItem>
          ))}
        </List>
      )}
    </Paper>
  );
}

/** DASH-006 오늘 혼잡도 미니 위젯 — 시간대별 등·하원 건수 */
export function CongestionMiniWidget({ instId }: { instId?: string }) {
  const t = useT();
  const q = useQuery({ queryKey: ['dashboard', 'congestion', instId], queryFn: () => api.get<CongestionToday>('dashboard/widgets/congestion'), enabled: !!instId, refetchInterval: 120_000 });
  const hours = q.data?.hours ?? [];
  return (
    <Paper>
      <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ flex: 1 }}>
          {t('오늘 혼잡도')}
        </Typography>
        {q.data?.peakHour !== null && q.data?.peakHour !== undefined && <Chip size="small" color="primary" label={t('피크 {0}시', { 0: q.data.peakHour })} sx={{ mr: 1 }} />}
        <MenuIdChip id="DASH-006" />
      </Box>
      <Divider />
      <Box sx={{ p: 2 }}>
        {q.isLoading ? (
          <Skeleton variant="rounded" height={120} />
        ) : hours.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
            {t('아직 오늘 등·하원 기록이 없습니다')}
          </Typography>
        ) : (
          <BarChart
            height={150}
            labels={hours.map((h) => t('{0}시', { 0: h.hour }))}
            series={[
              { name: t('등원'), color: '#1b2559', values: hours.map((h) => h.checkIns) },
              { name: t('하원'), color: '#e8913a', values: hours.map((h) => h.checkOuts) },
            ]}
          />
        )}
        <Box sx={{ textAlign: 'right' }}>
          <Typography component={Link} href="/stats" variant="body2" color="primary" sx={{ textDecoration: 'none' }}>
            {t('통계에서 더 보기 →')}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
}

interface MissingAlert {
  attendanceDayId: string;
  studentId: string;
  studentName: string;
  classroomId: string;
  classroomName: string;
  classStart: string;
  previousInstitutionName: string | null;
  previousCheckoutAt: string | null;
  notifiedParent: boolean;
  sentAt: string;
  currentStatus: 'SCHEDULED' | 'IN' | 'OUT' | 'ABSENT';
}

/** ATT-010 미등원 초과 경고 — 오늘 경고가 나간 원생. 아직 미등원이면 빨간색 */
export function MissingAlertWidget({ instId }: { instId?: string }) {
  const t = useT();
  const q = useQuery({ queryKey: ['dashboard', 'missing-alerts', instId], queryFn: () => api.get<MissingAlert[]>('attendance-missing-alerts'), enabled: !!instId, refetchInterval: 60_000 });
  const rows = q.data ?? [];
  if (!q.isLoading && rows.length === 0) return null;
  const still = rows.filter((r) => r.currentStatus === 'SCHEDULED').length;
  return (
    <Paper sx={{ borderColor: still > 0 ? 'error.main' : undefined }} variant={still > 0 ? 'outlined' : undefined}>
      <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="h4" sx={{ flex: 1 }}>
          {t('미등원 경고')}
        </Typography>
        {still > 0 && <Chip size="small" color="error" label={t('확인 필요 {0}명', { 0: still })} />}
        <MenuIdChip id="ATT-010" />
      </Box>
      <Divider />
      {q.isLoading ? (
        <Box sx={{ p: 2 }}>
          <Skeleton />
        </Box>
      ) : (
        <List dense disablePadding>
          {rows.map((r) => (
            <ListItem key={r.attendanceDayId} divider>
              <ListItemText
                primary={
                  <>
                    {r.studentName} · {r.classroomName} {r.classStart}
                    {r.currentStatus === 'SCHEDULED' ? (
                      <Chip size="small" color="error" label={t('미등원')} sx={{ ml: 1 }} />
                    ) : (
                      <Chip size="small" color="success" variant="outlined" label={r.currentStatus === 'ABSENT' ? t('결석 처리') : t('등원함')} sx={{ ml: 1 }} />
                    )}
                  </>
                }
                secondary={
                  t('{0} 경고', { 0: time(r.sentAt) }) + (r.notifiedParent ? t(' · 보호자 알림') : '') +
                  (r.previousInstitutionName ? t(' · {0}에서 {1} 하원', { 0: r.previousInstitutionName, 1: r.previousCheckoutAt ? time(r.previousCheckoutAt) : '' }) : '')
                }
              />
            </ListItem>
          ))}
        </List>
      )}
      <Box sx={{ px: 2, py: 1, textAlign: 'right' }}>
        <Typography component={Link} href="/settings?tab=missing" variant="caption" color="text.secondary">
          {t('경고 기준 설정')}
        </Typography>
      </Box>
    </Paper>
  );
}
