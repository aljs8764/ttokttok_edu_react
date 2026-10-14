'use client';

import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import dayjs from 'dayjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import { LineChart } from '@/components/charts';
import { useT } from '@/lib/i18n';

interface UsageRow {
  institutionId: string; institutionName: string; serviceStatus: string; requests: number; errors: number; denied: number; throttled: number;
  peakActiveUsers: number; lastActiveAt: string | null; changeRate: number | null; openAlerts: number;
}
interface Overview { days: number; totalRequests: number; loginSuccess: number; loginFailed: number; institutions: UsageRow[]; silentInstitutions: number }
interface Point { hour: string; requests: number; errors: number; denied: number; throttled: number; activeUsers: number; loginSuccess: number; loginFailed: number }
interface UsageAlert {
  id: string; institutionId: string | null; institutionName: string | null; kind: string; hour: string; value: number; baseline: number | null;
  message: string; createdAt: string; acknowledgedAt: string | null; acknowledgedByName: string | null;
}

const KIND: Record<string, { label: string; color: 'error' | 'warning' | 'info' | 'default' }> = {
  SPIKE: { label: '요청 급증', color: 'warning' },
  ERRORS: { label: '오류율', color: 'error' },
  DENIED: { label: '권한 거부', color: 'warning' },
  THROTTLED: { label: '요청 제한', color: 'warning' },
  LOGIN_FAIL: { label: '로그인 실패', color: 'error' },
  SILENT: { label: '무사용(이탈 위험)', color: 'info' },
};

const n = (v: number) => v.toLocaleString('ko-KR');

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Paper sx={{ px: 3, py: 2.5 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="h3">{value}</Typography>
      {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
    </Paper>
  );
}

/** SAAS-006 기관별 사용량·이상 탐지 */
export default function UsageTab() {
  const t = useT();
  const qc = useQueryClient();
  const [days, setDays] = useState(7);
  const [inst, setInst] = useState('');
  const [openOnly, setOpenOnly] = useState(true);
  const overview = useQuery({ queryKey: ['platform', 'usage', days], queryFn: () => api.get<Overview>('platform/usage', { days }) });
  const hourly = useQuery({
    queryKey: ['platform', 'usage', 'hourly', inst, days],
    queryFn: () => api.get<Point[]>('platform/usage/hourly', { days, institutionId: inst || undefined }),
  });
  const alerts = useQuery({ queryKey: ['platform', 'usage-alerts', openOnly], queryFn: () => api.get<UsageAlert[]>('platform/usage-alerts', { openOnly }) });
  const ack = useMutation({
    mutationFn: (id: string) => api.post(`platform/usage-alerts/${id}/ack`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['platform', 'usage-alerts'] });
      void qc.invalidateQueries({ queryKey: ['platform', 'usage'] });
    },
  });
  const o = overview.data;
  const pts = hourly.data ?? [];
  // 시간 단위가 많으면 일 단위로 묶어 그린다
  const daily = days > 2;
  const grouped = daily
    ? Object.values(
        pts.reduce<Record<string, { label: string; requests: number; errors: number; denied: number; users: number }>>((acc, p) => {
          const k = dayjs(p.hour).format('M/D');
          const g = (acc[k] ??= { label: k, requests: 0, errors: 0, denied: 0, users: 0 });
          g.requests += p.requests; g.errors += p.errors; g.denied += p.denied; g.users = Math.max(g.users, p.activeUsers);
          return acc;
        }, {}),
      )
    : pts.map((p) => ({ label: dayjs(p.hour).format(t('D일 HH시')), requests: p.requests, errors: p.errors, denied: p.denied, users: p.activeUsers }));
  const err = overview.error ?? hourly.error ?? alerts.error ?? ack.error;

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} alignItems="center">
        <ToggleButtonGroup exclusive size="small" value={days} onChange={(_, v) => v && setDays(v)}>
          {[1, 7, 30].map((d) => <ToggleButton key={d} value={d}>{d === 1 ? t('24시간') : t('{0}일', { 0: d })}</ToggleButton>)}
        </ToggleButtonGroup>
        <Typography variant="caption" color="text.secondary">{t('관리자 웹·교사 앱 요청(기관 헤더 기준) · 학부모 앱(/me)은 기관별 집계에서 빠집니다')}</Typography>
      </Stack>
      {err && <Alert severity="error">{errorMessage(err)}</Alert>}
      {o && (
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' } }}>
          <Stat label={t('API 요청')} value={n(o.totalRequests)} sub={t('최근 {0}일', { 0: o.days })} />
          <Stat label={t('로그인 성공')} value={n(o.loginSuccess)} />
          <Stat label={t('로그인 실패')} value={n(o.loginFailed)} sub={o.loginSuccess + o.loginFailed > 0 ? t('실패율 {0}%', { 0: Math.round((o.loginFailed * 100) / (o.loginSuccess + o.loginFailed)) }) : ''} />
          <Stat label={t('사용 없는 운영 기관')} value={t('{0}곳', { 0: o.silentInstitutions })} sub={t('기간 내 요청 0건')} />
        </Box>
      )}

      <Paper sx={{ px: 3, py: 2.5 }}>
        <Stack direction="row" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="h4" sx={{ flex: 1 }}>{t('이상 탐지 경고')}</Typography>
          <ToggleButtonGroup exclusive size="small" value={openOnly} onChange={(_, v) => v !== null && setOpenOnly(v)}>
            <ToggleButton value={true}>{t('미확인')}</ToggleButton>
            <ToggleButton value={false}>{t('전체')}</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          {t('매시 5분에 지난 1시간을 판정합니다: 평소(직전 7일 같은 시각)보다 5배 넘는 요청 급증, 서버 오류 10% 이상, 권한 거부 100건·요청 제한 20건 이상, 로그인 실패 100회 이상, 3일 무사용(매일 오전).')}
        </Typography>
        <Table size="small">
          <TableHead><TableRow><TableCell>{t('시각')}</TableCell><TableCell>{t('종류')}</TableCell><TableCell>{t('내용')}</TableCell><TableCell align="right">{t('처리')}</TableCell></TableRow></TableHead>
          <TableBody>
            {(alerts.data ?? []).map((a) => (
              <TableRow key={a.id}>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{dayjs(a.hour).format('M/D HH:00')}</TableCell>
                <TableCell><Chip size="small" color={KIND[a.kind]?.color ?? 'default'} label={t(KIND[a.kind]?.label ?? a.kind)} /></TableCell>
                <TableCell>{a.message}</TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                  {a.acknowledgedAt ? (
                    <Typography variant="caption" color="text.secondary">{t('{0} 확인', { 0: a.acknowledgedByName })}</Typography>
                  ) : (
                    <Button size="small" onClick={() => ack.mutate(a.id)}>{t('확인')}</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {alerts.data?.length === 0 && <TableRow><TableCell colSpan={4} align="center" sx={{ py: 3, color: 'text.secondary' }}>{t('경고가 없습니다')}</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Paper>

      <Paper sx={{ px: 3, py: 2.5 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <Typography variant="h4" sx={{ flex: 1 }}>{daily ? t('일별') : t('시간별')}{' '}{t('요청')}</Typography>
          <TextField select size="small" label={t('기관')} value={inst} onChange={(e) => setInst(e.target.value)} sx={{ minWidth: 220 }}>
            <MenuItem value="">{t('플랫폼 전체')}</MenuItem>
            {(o?.institutions ?? []).map((r) => <MenuItem key={r.institutionId} value={r.institutionId}>{r.institutionName}</MenuItem>)}
          </TextField>
        </Stack>
        <LineChart
          labels={grouped.map((g) => g.label)}
          series={[
            { name: t('요청'), color: '#1b2559', values: grouped.map((g) => g.requests) },
            { name: '5xx', color: '#d6453d', values: grouped.map((g) => g.errors) },
            { name: '401·403', color: '#e8913a', values: grouped.map((g) => g.denied) },
          ]}
        />
      </Paper>

      <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('기관')}</TableCell><TableCell>{t('상태')}</TableCell><TableCell align="right">{t('요청')}</TableCell><TableCell align="right">{t('이전 대비')}</TableCell>
              <TableCell align="right">5xx</TableCell><TableCell align="right">401·403</TableCell><TableCell align="right">429</TableCell>
              <TableCell align="right">{t('최대 동시 사용자/시')}</TableCell><TableCell>{t('마지막 사용')}</TableCell><TableCell align="right">{t('경고')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(o?.institutions ?? []).map((r) => (
              <TableRow key={r.institutionId} hover onClick={() => setInst(r.institutionId)} sx={{ cursor: 'pointer' }}>
                <TableCell>{r.institutionName}</TableCell>
                <TableCell>{r.serviceStatus}</TableCell>
                <TableCell align="right">{n(r.requests)}</TableCell>
                <TableCell align="right" sx={{ color: r.changeRate != null && r.changeRate < -0.5 ? 'error.main' : undefined }}>
                  {r.changeRate == null ? '-' : `${r.changeRate > 0 ? '+' : ''}${Math.round(r.changeRate * 100)}%`}
                </TableCell>
                <TableCell align="right">{n(r.errors)}</TableCell>
                <TableCell align="right">{n(r.denied)}</TableCell>
                <TableCell align="right">{n(r.throttled)}</TableCell>
                <TableCell align="right">{r.peakActiveUsers}</TableCell>
                <TableCell>{r.lastActiveAt ? dayjs(r.lastActiveAt).format(t('M/D HH시')) : '-'}</TableCell>
                <TableCell align="right">{r.openAlerts > 0 ? <Chip size="small" color="error" label={r.openAlerts} /> : ''}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Stack>
  );
}
