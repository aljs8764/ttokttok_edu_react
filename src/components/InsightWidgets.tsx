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
import { dateTime } from '@/lib/format';
import { ratioText, type CongestionToday, type LowReadNotices } from '@/lib/stats';
import { BarChart } from '@/components/charts';

/** DASH-004 미열람 알림장 위젯 — 최근 7일 발송분 중 열람률이 낮은 건 */
export function LowReadNoticesWidget({ instId }: { instId?: string }) {
  const q = useQuery({ queryKey: ['dashboard', 'low-read', instId], queryFn: () => api.get<LowReadNotices>('dashboard/widgets/low-read-notices', { limit: 5 }), enabled: !!instId, refetchInterval: 120_000 });
  return (
    <Paper>
      <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ flex: 1 }}>
          열람률 낮은 알림장
        </Typography>
        <Chip size="small" variant="outlined" label="DASH-004" />
      </Box>
      <Divider />
      {q.isLoading ? (
        <Box sx={{ p: 2 }}>
          <Skeleton />
          <Skeleton />
        </Box>
      ) : !q.data?.notices.length ? (
        <Typography variant="body2" color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
          최근 7일 알림장은 모두 {Math.round((q.data?.threshold ?? 0.5) * 100)}% 이상 열람됐습니다
        </Typography>
      ) : (
        <List dense disablePadding>
          {q.data.notices.map((n) => (
            <ListItem key={n.noticeId} divider component={Link} href={`/notices/${n.noticeId}`} sx={{ color: 'inherit', textDecoration: 'none', display: 'block' }}>
              <ListItemText primary={n.title} secondary={`${dateTime(n.sentAt)} 발송 · ${n.readStudents}/${n.targetStudents}명 열람 (${ratioText(n.readRate, 0)})`} />
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
  const q = useQuery({ queryKey: ['dashboard', 'congestion', instId], queryFn: () => api.get<CongestionToday>('dashboard/widgets/congestion'), enabled: !!instId, refetchInterval: 120_000 });
  const hours = q.data?.hours ?? [];
  return (
    <Paper>
      <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ flex: 1 }}>
          오늘 혼잡도
        </Typography>
        {q.data?.peakHour !== null && q.data?.peakHour !== undefined && <Chip size="small" color="primary" label={`피크 ${q.data.peakHour}시`} sx={{ mr: 1 }} />}
        <Chip size="small" variant="outlined" label="DASH-006" />
      </Box>
      <Divider />
      <Box sx={{ p: 2 }}>
        {q.isLoading ? (
          <Skeleton variant="rounded" height={120} />
        ) : hours.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
            아직 오늘 등·하원 기록이 없습니다
          </Typography>
        ) : (
          <BarChart
            height={150}
            labels={hours.map((h) => `${h.hour}시`)}
            series={[
              { name: '등원', color: '#1b2559', values: hours.map((h) => h.checkIns) },
              { name: '하원', color: '#e8913a', values: hours.map((h) => h.checkOuts) },
            ]}
          />
        )}
        <Box sx={{ textAlign: 'right' }}>
          <Typography component={Link} href="/stats" variant="body2" color="primary" sx={{ textDecoration: 'none' }}>
            통계에서 더 보기 →
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
}
