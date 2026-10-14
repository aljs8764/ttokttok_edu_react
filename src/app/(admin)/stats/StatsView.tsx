'use client';

import { useState, type ReactNode } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DownloadIcon from '@mui/icons-material/FileDownloadOutlined';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useQuery } from '@tanstack/react-query';
import dayjs, { type Dayjs } from 'dayjs';
import { api, download, errorMessage } from '@/lib/api';
import { useSession } from '@/lib/session';
import type { Classroom } from '@/lib/types';
import {
  ratioText,
  WEEKDAY_LABEL,
  type ClassroomComparison,
  type ClassroomTrend,
  type CongestionReport,
  type EnrollmentStatusReport,
  type EnrollmentTrendReport,
  type KpiReport,
} from '@/lib/stats';
import { BarChart, Donut, Heatmap, LineChart } from '@/components/charts';
import PageHeader from '@/components/PageHeader';
import WorkTab from './WorkTab';
import { useT } from '@/lib/i18n';
import MenuIdChip from '@/components/ui/MenuIdChip';
import SectionCard from '@/components/ui/SectionCard';
import KpiCard from '@/components/ui/KpiCard';
import { chart } from '@/theme/tokens';

type Section = 'KPI' | 'CLASSROOMS' | 'ENROLLMENT';
const SECTION_LABEL: Record<Section, string> = { KPI: '기간 KPI', CLASSROOMS: '반별 비교', ENROLLMENT: '재원 현황' };
const BLUE = chart.primary;
const GREEN = chart.green;
const ORANGE = chart.amber;
const RED = chart.red;
const GRAY = chart.gray;

/** STAT-001~007 통계·분석 (원장·실장 전용). 기간은 STAT-001·002·003·004·007 공통 */
export default function StatsView() {
  const t = useT();
  const { session, manager } = useSession();
  const instId = session?.institution?.institutionId;
  const [tab, setTab] = useState<'kpi' | 'congestion' | 'classes' | 'enrollment' | 'work'>('kpi');
  const [from, setFrom] = useState<Dayjs>(dayjs().subtract(29, 'day'));
  const [to, setTo] = useState<Dayjs>(dayjs());
  const [sections, setSections] = useState<Section[]>(['KPI', 'CLASSROOMS', 'ENROLLMENT']);
  const [dlError, setDlError] = useState('');
  const [downloading, setDownloading] = useState(false);

  const range = { from: from.format('YYYY-MM-DD'), to: to.format('YYYY-MM-DD') };
  const rangeValid = !from.isAfter(to);
  const enabled = !!instId && manager && rangeValid;

  const quick = (days: number) => {
    setTo(dayjs());
    setFrom(dayjs().subtract(days - 1, 'day'));
  };

  const exportReport = async () => {
    setDlError('');
    setDownloading(true);
    try {
      await download('GET', `stats/report.xlsx?from=${range.from}&to=${range.to}&sections=${sections.join(',')}`, undefined, t('통계리포트_{0}_{1}.xlsx', { 0: range.from, 1: range.to }));
    } catch (e) {
      setDlError(errorMessage(e));
    } finally {
      setDownloading(false);
    }
  };

  if (!manager) {
    return <Alert severity="info">{t('통계는 원장·실장만 볼 수 있습니다.')}</Alert>;
  }

  return (
    <>
      <PageHeader
        title={t('통계·분석')}
        menuId="STAT-001"
        description={t('등원율·열람률 추이, 시간대 혼잡도, 반별 비교, 재원 현황을 확인하고 엑셀·PDF 리포트로 내려받습니다(PDF는 인쇄 창에서 \'PDF로 저장\').')}
      />
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }} flexWrap="wrap" useFlexGap>
          <DatePicker label={t('시작일')} value={from} onChange={(v) => v && setFrom(v)} format="YYYY.MM.DD" maxDate={dayjs()} slotProps={{ textField: { size: 'small', sx: { width: 160 } } }} />
          <DatePicker label={t('종료일')} value={to} onChange={(v) => v && setTo(v)} format="YYYY.MM.DD" maxDate={dayjs()} slotProps={{ textField: { size: 'small', sx: { width: 160 } } }} />
          <Stack direction="row" spacing={0.5}>
            {[7, 30, 90].map((d) => (
              <Chip key={d} size="small" label={t('최근 {0}일', { 0: d })} onClick={() => quick(d)} variant="outlined" />
            ))}
          </Stack>
          <Box sx={{ flex: 1 }} />
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            {(Object.keys(SECTION_LABEL) as Section[]).map((s) => (
              <FormControlLabel
                key={s}
                sx={{ mr: 0 }}
                control={<Checkbox size="small" checked={sections.includes(s)} onChange={(e) => setSections((cur) => (e.target.checked ? [...cur, s] : cur.filter((x) => x !== s)))} />}
                label={<Typography variant="body2">{t(SECTION_LABEL[s])}</Typography>}
              />
            ))}
            <Button variant="outlined" startIcon={<DownloadIcon />} disabled={!rangeValid || sections.length === 0 || downloading} onClick={exportReport}>
              {t('엑셀 리포트')}{' '}<MenuIdChip id="STAT-008" sx={{ ml: 1 }} />
            </Button>
            <Button
              variant="outlined"
              disabled={!rangeValid || sections.length === 0}
              onClick={() => window.open(`/print/stats?from=${range.from}&to=${range.to}&sections=${sections.join(',')}`, '_blank')}
            >
              {t('PDF 리포트')}
            </Button>
          </Stack>
        </Stack>
        {!rangeValid && (
          <Alert severity="warning" sx={{ mt: 1.5 }}>
            {t('시작일이 종료일보다 늦습니다.')}
          </Alert>
        )}
        {dlError && (
          <Alert severity="error" sx={{ mt: 1.5 }}>
            {dlError}
          </Alert>
        )}
      </Paper>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab value="kpi" label={t('기간 KPI')} />
        <Tab value="congestion" label={t('혼잡도')} />
        <Tab value="classes" label={t('반별 분석')} />
        <Tab value="enrollment" label={t('재원·증감')} />
        <Tab value="work" label={t('소통·업무')} />
      </Tabs>

      {tab === 'kpi' && <KpiTab range={range} enabled={enabled} instId={instId} />}
      {tab === 'congestion' && <CongestionTab range={range} enabled={enabled} instId={instId} />}
      {tab === 'classes' && <ClassesTab range={range} enabled={enabled} instId={instId} />}
      {tab === 'enrollment' && <EnrollmentTab enabled={!!instId} instId={instId} />}
      {tab === 'work' && <WorkTab range={range} enabled={enabled} instId={instId} />}
    </>
  );
}

function Card({ title, menuId, children }: { title: string; menuId?: string; children: ReactNode }) {
  return (
    <SectionCard title={title} menuId={menuId}>
      {children}
    </SectionCard>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return <KpiCard size="md" label={label} value={value} footer={sub && <Typography component="span" sx={{ fontSize: 13, color: 'text.secondary' }}>{sub}</Typography>} />;
}

function State({ q, children }: { q: { isLoading: boolean; isError: boolean; error: unknown }; children: ReactNode }) {
  if (q.isLoading) return <Skeleton variant="rounded" height={240} />;
  if (q.isError) return <Alert severity="error">{errorMessage(q.error)}</Alert>;
  return <>{children}</>;
}

const md = (d: string) => dayjs(d).format('M/D');

/** STAT-001 기간별 KPI 리포트 */
function KpiTab({ range, enabled, instId }: { range: { from: string; to: string }; enabled: boolean; instId?: string }) {
  const t = useT();
  const q = useQuery({ queryKey: ['stats', 'kpi', instId, range], queryFn: () => api.get<KpiReport>('stats/kpi', range), enabled });
  const d = q.data;
  return (
    <State q={q}>
      {d && (
        <Stack spacing={2}>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <Metric label={t('평균 등원율')} value={ratioText(d.summary.attendanceRate)} sub={t('등원 {0} / 예정 {1}', { 0: d.summary.present, 1: d.summary.scheduled })} />
            <Metric label={t('지각률')} value={ratioText(d.summary.lateRate)} sub={t('지각 {0}건', { 0: d.summary.late })} />
            <Metric label={t('결석률')} value={ratioText(d.summary.absentRate)} sub={t('결석 {0}건', { 0: d.summary.absent })} />
            <Metric label={t('알림장 열람률')} value={ratioText(d.summary.noticeReadRate)} sub={t('발송 {0}건', { 0: d.summary.noticeCount })} />
          </Box>
          <Card title={t('일별 등원율')}>
            <LineChart labels={d.days.map((x) => md(x.date))} yMax={1} percent series={[{ name: t('등원율'), color: BLUE, values: d.days.map((x) => x.attendanceRate) }]} />
          </Card>
          <Card title={t('일별 알림장 열람률')}>
            <LineChart labels={d.noticeReads.map((x) => md(x.date))} yMax={1} percent series={[{ name: t('열람률'), color: GREEN, values: d.noticeReads.map((x) => x.readRate) }]} />
          </Card>
          <Card title={t('일별 지각·결석')}>
            <BarChart
              labels={d.days.map((x) => md(x.date))}
              series={[
                { name: t('지각'), color: ORANGE, values: d.days.map((x) => x.late) },
                { name: t('결석'), color: RED, values: d.days.map((x) => x.absent) },
              ]}
            />
          </Card>
        </Stack>
      )}
    </State>
  );
}

/** STAT-002 혼잡도 분석 — 요일×시간대 하루 평균 등·하원 건수 */
function CongestionTab({ range, enabled, instId }: { range: { from: string; to: string }; enabled: boolean; instId?: string }) {
  const t = useT();
  const [kind, setKind] = useState<'checkIns' | 'checkOuts'>('checkIns');
  const q = useQuery({ queryKey: ['stats', 'congestion', instId, range], queryFn: () => api.get<CongestionReport>('stats/congestion', range), enabled });
  const d = q.data;
  const hours = d ? Array.from(new Set(d.cells.map((c) => c.hour))) : [];
  const minH = hours.length ? Math.min(...hours) : 7;
  const maxH = hours.length ? Math.max(...hours) : 20;
  const hourRange = Array.from({ length: maxH - minH + 1 }, (_, i) => minH + i);
  const value = (w: number, h: number) => {
    const c = d?.cells.find((x) => x.weekday === w && x.hour === h);
    const days = d?.weekdayCounts[String(w)] ?? 0;
    return c && days > 0 ? c[kind] / days : 0;
  };
  return (
    <State q={q}>
      {d && (
        <Stack spacing={2}>
          <Card title={t('요일×시간대 평균 건수 (하루 기준)')} menuId="STAT-002">
            <TextField select size="small" value={kind} onChange={(e) => setKind(e.target.value as 'checkIns' | 'checkOuts')} sx={{ mb: 2, width: 140 }}>
              <MenuItem value="checkIns">{t('등원')}</MenuItem>
              <MenuItem value="checkOuts">{t('하원')}</MenuItem>
            </TextField>
            {d.cells.length === 0 ? (
              <Typography color="text.secondary">{t('선택한 기간에 등·하원 기록이 없습니다.')}</Typography>
            ) : (
              <Heatmap weekdays={WEEKDAY_LABEL.slice(1).map((w) => t(w))} hours={hourRange} value={value} color={kind === 'checkIns' ? chart.rgbPrimary : chart.rgbAccent} />
            )}
          </Card>
          {d.peaks.length > 0 && (
            <Card title={t('혼잡 시간대 상위')}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {d.peaks.map((p) => (
                  <Chip key={`${p.weekday}-${p.hour}`} label={t('{0} {1}시 · 등원 {2} / 하원 {3}', { 0: t(WEEKDAY_LABEL[p.weekday]), 1: p.hour, 2: p.checkIns, 3: p.checkOuts })} />
                ))}
              </Stack>
            </Card>
          )}
        </Stack>
      )}
    </State>
  );
}

/** STAT-003 반별 성과 비교 · STAT-004 반별 상세 */
function ClassesTab({ range, enabled, instId }: { range: { from: string; to: string }; enabled: boolean; instId?: string }) {
  const t = useT();
  const [classId, setClassId] = useState('');
  const cmp = useQuery({ queryKey: ['stats', 'classrooms', instId, range], queryFn: () => api.get<ClassroomComparison>('stats/classrooms', range), enabled });
  const classes = useQuery({ queryKey: ['classes', instId], queryFn: () => api.get<Classroom[]>('classes'), enabled: !!instId });
  const selected = classId || cmp.data?.classrooms[0]?.classroomId || '';
  const trend = useQuery({
    queryKey: ['stats', 'classroom-trend', instId, selected, range],
    queryFn: () => api.get<ClassroomTrend>(`stats/classrooms/${selected}/trend`, range),
    enabled: enabled && !!selected,
  });
  return (
    <Stack spacing={2}>
      <State q={cmp}>
        <Card title={t('반별 비교')} menuId="STAT-003">
          {!cmp.data?.classrooms.length ? (
            <Typography color="text.secondary">{t('반이 없습니다.')}</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('반')}</TableCell>
                  <TableCell align="right">{t('원생')}</TableCell>
                  <TableCell align="right">{t('등원율')}</TableCell>
                  <TableCell align="right">{t('지각')}</TableCell>
                  <TableCell align="right">{t('결석')}</TableCell>
                  <TableCell align="right">{t('알림장 열람률')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cmp.data.classrooms.map((c) => (
                  <TableRow key={c.classroomId} hover selected={c.classroomId === selected} onClick={() => setClassId(c.classroomId)} sx={{ cursor: 'pointer' }}>
                    <TableCell>{c.name}</TableCell>
                    <TableCell align="right">{c.students}</TableCell>
                    <TableCell align="right">{ratioText(c.attendanceRate)}</TableCell>
                    <TableCell align="right">{c.late}</TableCell>
                    <TableCell align="right">{c.absent}</TableCell>
                    <TableCell align="right">{ratioText(c.noticeReadRate)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </State>
      {selected && (
        <State q={trend}>
          {trend.data && (
            <Card title={t('{0} 상세 추이', { 0: trend.data.name })} menuId="STAT-004">
              <TextField select size="small" label={t('반')} value={selected} onChange={(e) => setClassId(e.target.value)} sx={{ mb: 2, minWidth: 160 }}>
                {(classes.data ?? []).map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </TextField>
              <LineChart labels={trend.data.days.map((x) => md(x.date))} yMax={1} percent series={[{ name: t('등원율'), color: BLUE, values: trend.data.days.map((x) => x.attendanceRate) }]} />
              <Box sx={{ mt: 2 }}>
                <BarChart
                  labels={trend.data.days.map((x) => md(x.date))}
                  series={[
                    { name: t('지각'), color: ORANGE, values: trend.data.days.map((x) => x.late) },
                    { name: t('결석'), color: RED, values: trend.data.days.map((x) => x.absent) },
                  ]}
                />
              </Box>
            </Card>
          )}
        </State>
      )}
    </Stack>
  );
}

/** STAT-005 재원 현황 · STAT-006 원생 증감 추이 */
function EnrollmentTab({ enabled, instId }: { enabled: boolean; instId?: string }) {
  const t = useT();
  const status = useQuery({ queryKey: ['stats', 'enrollment', instId], queryFn: () => api.get<EnrollmentStatusReport>('stats/enrollment'), enabled });
  const trend = useQuery({ queryKey: ['stats', 'enrollment-trend', instId], queryFn: () => api.get<EnrollmentTrendReport>('stats/enrollment/trend'), enabled });
  const palette = [BLUE, GREEN, ORANGE, RED, GRAY, chart.violet, chart.teal, chart.pink];
  return (
    <Stack spacing={2}>
      <State q={status}>
        {status.data && (
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
            <Card title={t('재원 상태')} menuId="STAT-005">
              <Donut
                slices={[
                  { label: t('재원'), value: status.data.active, color: GREEN },
                  { label: t('휴원'), value: status.data.paused, color: ORANGE },
                  { label: t('퇴원'), value: status.data.withdrawn, color: GRAY },
                ]}
              />
            </Card>
            <Card title={t('학년별 재원생')}>
              <Donut slices={status.data.byGrade.map((g, i) => ({ label: g.grade, value: g.count, color: palette[i % palette.length] }))} />
            </Card>
          </Box>
        )}
      </State>
      <State q={trend}>
        {trend.data && (
          <>
            <Card title={t('월별 신규·퇴원')} menuId="STAT-006">
              <BarChart
                labels={trend.data.months.map((m) => dayjs(`${m.month}-01`).format('YY.M'))}
                series={[
                  { name: t('신규'), color: GREEN, values: trend.data.months.map((m) => m.joined) },
                  { name: t('퇴원'), color: RED, values: trend.data.months.map((m) => m.withdrawn) },
                ]}
              />
            </Card>
            <Card title={t('퇴원 사유')}>
              {trend.data.reasons.length === 0 ? (
                <Typography color="text.secondary">{t('기간 내 퇴원 기록이 없습니다.')}</Typography>
              ) : (
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {trend.data.reasons.map((r) => (
                    <Chip key={r.reason} label={t('{0} {1}명', { 0: r.reason, 1: r.count })} />
                  ))}
                </Stack>
              )}
            </Card>
          </>
        )}
      </State>
    </Stack>
  );
}
