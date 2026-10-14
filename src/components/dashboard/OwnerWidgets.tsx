'use client';

import { useState } from 'react';
import Link from 'next/link';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import LinearProgress from '@mui/material/LinearProgress';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { api, errorMessage } from '@/lib/api';
import { won } from '@/lib/billing';
import { dateTime, ROLE_LABEL, time } from '@/lib/format';
import { ratioText } from '@/lib/stats';
import { useSwitchInstitution } from '@/lib/session';
import type { StaffMember } from '@/lib/types';
import type {
  ChurnReason, ChurnRisk, ClassFlag, InboxItem, InboxKey, InstitutionCard, OwnerBilling, OwnerClassRow, OwnerKpi, OwnerStaff, StaffMemo, StaffMemoAck,
} from '@/lib/dashboard';
import WidgetCard from '@/components/dashboard/WidgetCard';
import KpiCard from '@/components/ui/KpiCard';
import { color, tone } from '@/theme/tokens';
import { useT } from '@/lib/i18n';

const ratio = (v: number | null | undefined) => (v === null || v === undefined ? '-' : ratioText(v, 0));

// ───────── DASH-009 경영 KPI ─────────
export function BusinessKpiRow({ instId }: { instId?: string }) {
  const t = useT();
  const q = useQuery({ queryKey: ['owner', 'kpi', instId], queryFn: () => api.get<OwnerKpi>('dashboard/owner/kpi'), enabled: !!instId, refetchInterval: 120_000 });
  const k = q.data;
  const diff = k ? k.activeStudents - k.activeStudentsLastMonth : 0;
  const cards: { label: string; value: string; sub: string; href: string; tone?: 'error' | 'success' }[] = k
    ? [
        { label: t('재원생'), value: t('{0}명', { 0: k.activeStudents }), sub: t('지난달 대비 {0}', { 0: diff > 0 ? `+${diff}` : String(diff) }), href: '/stats', tone: diff < 0 ? 'error' : diff > 0 ? 'success' : undefined },
        { label: t('이번 달 신규 · 퇴원'), value: `${k.newThisMonth} · ${k.withdrawnThisMonth}`, sub: t('이번 달 1일부터'), href: '/stats' },
        { label: t('충원율'), value: ratio(k.fillRate), sub: t('반 정원 합 {0}명', { 0: k.capacity }), href: '/classes' },
        { label: t('이번 달 수납률'), value: ratio(k.collectionRate), sub: t('{0} / {1}', { 0: won(k.paidThisMonth), 1: won(k.billedThisMonth) }), href: '/invoices' },
        { label: t('미납'), value: won(k.unpaidAmount), sub: t('{0}건', { 0: k.unpaidCount }), href: '/invoices', tone: k.unpaidCount > 0 ? 'error' : undefined },
      ]
    : [];
  return (
    <Box component="section" aria-label={t('경영 KPI')} sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', mb: 3 }}>
      {q.isError && <Alert severity="error" sx={{ gridColumn: '1 / -1' }}>{errorMessage(q.error)}</Alert>}
      {!k
        ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} variant="rounded" height={120} sx={{ borderRadius: 3 }} />)
        : cards.map((c, i) => (
            <Box key={c.label} component={Link} href={c.href} sx={{ textDecoration: 'none', color: 'inherit', borderRadius: 3, '&:hover .MuiPaper-root': { borderColor: '#B9BFD3' }, '&:focus-visible': { outline: `2px solid ${color.primary}`, outlineOffset: 2 } }}>
              <KpiCard
                label={c.label}
                menuId={i === 0 ? 'DASH-009' : undefined}
                size="md"
                value={<Box component="span" sx={{ color: c.tone === 'error' ? tone.red.fg : c.tone === 'success' ? tone.green.fg : 'inherit' }}>{c.value}</Box>}
                footer={<Typography component="span" sx={{ fontSize: 13, color: 'text.secondary' }}>{c.sub}</Typography>}
              />
            </Box>
          ))}
    </Box>
  );
}

// ───────── DASH-011 처리 대기함 ─────────
const INBOX: Record<InboxKey, { label: string; href: string }> = {
  JOIN_REQUEST: { label: '가입 승인 대기', href: '/students/join-requests' },
  ABSENCE_REQUEST: { label: '확인 안 한 결석·지각 신청', href: '/absence-requests' },
  UNANSWERED_MESSAGE: { label: '24시간 넘게 답장 없는 메시지', href: '/messages' },
  NEW_CONSULT: { label: '오늘 들어온 상담 예약', href: '/consults' },
  SUPPORT_REPLY: { label: '운영사 답변 도착', href: '/support' },
};

export function InboxWidget({ instId }: { instId?: string }) {
  const t = useT();
  const q = useQuery({ queryKey: ['owner', 'inbox', instId], queryFn: () => api.get<InboxItem[]>('dashboard/owner/inbox'), enabled: !!instId, refetchInterval: 60_000 });
  const items = (q.data ?? []).filter((i) => i.count > 0);
  const total = items.reduce((s, i) => s + i.count, 0);
  return (
    <WidgetCard
      title={t('처리 대기함')}
      menuId="DASH-011"
      actions={total > 0 ? <Chip size="small" color="error" label={t('{0}건', { 0: total })} /> : undefined}
      loading={q.isLoading}
      empty={!q.isLoading && items.length === 0 && t('처리할 요청이 없습니다')}
    >
      <List dense disablePadding>
        {items.map((i) => (
          <ListItemButton key={i.key} component={Link} href={INBOX[i.key].href} divider>
            <ListItemText primary={t(INBOX[i.key].label)} secondary={i.oldestAt ? t('가장 오래된 건 {0}', { 0: dateTime(i.oldestAt) }) : undefined} />
            <Badge badgeContent={i.count} color="error" sx={{ mr: 1.5 }} />
          </ListItemButton>
        ))}
      </List>
    </WidgetCard>
  );
}

// ───────── DASH-010 반별 운영 현황판 ─────────
const FLAG: Record<ClassFlag, { label: string; color: 'error' | 'warning' | 'default' | 'info' }> = {
  MISSING: { label: '미등원 경고', color: 'error' },
  NO_TEACHER: { label: '담당 교사 없음', color: 'warning' },
  LOW_READ: { label: '열람률 낮음', color: 'warning' },
  FULL: { label: '정원 참', color: 'info' },
};

export function ClassBoardWidget({ instId }: { instId?: string }) {
  const t = useT();
  const [todayOnly, setTodayOnly] = useState(true);
  const q = useQuery({ queryKey: ['owner', 'classes', instId], queryFn: () => api.get<OwnerClassRow[]>('dashboard/owner/classes'), enabled: !!instId, refetchInterval: 60_000 });
  const rows = (q.data ?? []).filter((r) => !todayOnly || r.heldToday || r.flags.length > 0);
  return (
    <WidgetCard
      title={t('반별 운영 현황')}
      menuId="DASH-010"
      actions={<FormControlLabel control={<Switch size="small" checked={todayOnly} onChange={(e) => setTodayOnly(e.target.checked)} />} label={<Typography variant="caption">{t('오늘 수업만')}</Typography>} />}
      loading={q.isLoading}
      empty={!q.isLoading && rows.length === 0 && t('오늘 수업이 있는 반이 없습니다')}
    >
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('반')}</TableCell>
              <TableCell>{t('담당')}</TableCell>
              <TableCell align="right">{t('오늘 등원')}</TableCell>
              <TableCell align="right">{t('정원')}</TableCell>
              <TableCell align="right">{t('열람률(7일)')}</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.classroomId} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>{r.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{r.heldToday ? `${r.startTime}–${r.endTime}` : t('오늘 수업 없음')}</Typography>
                </TableCell>
                <TableCell>{r.teachers.join(', ') || '-'}</TableCell>
                <TableCell align="right">
                  {r.scheduled > 0 ? `${r.present}/${r.scheduled}` : '-'}
                  {r.notArrived > 0 && <Typography variant="caption" color="error.main" display="block">{t('미등원 {0}', { 0: r.notArrived })}</Typography>}
                </TableCell>
                <TableCell align="right">
                  {r.headcount}/{r.capacity}
                  {r.waiting > 0 && <Typography variant="caption" color="text.secondary" display="block">{t('대기 {0}', { 0: r.waiting })}</Typography>}
                </TableCell>
                <TableCell align="right">{ratio(r.readRate7d)}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                    {r.flags.map((f) => <Chip key={f} size="small" color={FLAG[f].color} label={t(FLAG[f].label)} />)}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
      <Box sx={{ px: 3, py: 1.5 }}>
        <Typography component={Link} href="/classes" variant="body2" color="primary" sx={{ textDecoration: 'none' }}>{t('반 관리로 →')}</Typography>
      </Box>
    </WidgetCard>
  );
}

// ───────── DASH-012 수납·미납 ─────────
export function OwnerBillingWidget({ instId }: { instId?: string }) {
  const t = useT();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['owner', 'billing', instId], queryFn: () => api.get<OwnerBilling>('dashboard/owner/billing'), enabled: !!instId, refetchInterval: 300_000 });
  const remind = useMutation({
    mutationFn: (id: string) => api.post(`invoices/${id}/remind`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['owner', 'billing'] }),
  });
  const b = q.data;
  return (
    <WidgetCard title={t('수납 · 미납')} menuId="DASH-012" loading={q.isLoading}>
      {b && (
        <Box sx={{ px: 3, pb: 2 }}>
          <Stack direction="row" spacing={3} sx={{ mb: 1.5 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">{t('미납')}</Typography>
              <Typography variant="h3">{won(b.unpaidAmount)}</Typography>
              <Typography variant="caption" color="text.secondary">{t('{0}건', { 0: b.unpaidCount })}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">{t('연체')}</Typography>
              <Typography variant="h3" color={b.overdueCount > 0 ? 'error.main' : undefined}>{won(b.overdueAmount)}</Typography>
              <Typography variant="caption" color="text.secondary">{t('{0}건', { 0: b.overdueCount })}</Typography>
            </Box>
          </Stack>
          {remind.isError && <Alert severity="error" sx={{ mb: 1 }}>{errorMessage(remind.error)}</Alert>}
          {remind.isSuccess && <Alert severity="success" sx={{ mb: 1 }} onClose={() => remind.reset()}>{t('학부모에게 다시 알렸습니다')}</Alert>}
          <Typography variant="subtitle2" sx={{ mt: 1 }}>{t('3일 안에 납부기한')}</Typography>
          {b.dueSoon.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>{t('없음')}</Typography>
          ) : (
            <List dense disablePadding>
              {b.dueSoon.map((i) => (
                <ListItem
                  key={i.id}
                  divider
                  secondaryAction={<Button size="small" disabled={remind.isPending} onClick={() => remind.mutate(i.id)}>{t('다시 알림')}</Button>}
                >
                  <ListItemText primary={`${i.studentName} · ${won(i.amount)}`} secondary={`${i.title} · ${dayjs(i.dueDate).format(t('M월 D일'))}`} />
                </ListItem>
              ))}
            </List>
          )}
          <Typography variant="subtitle2" sx={{ mt: 1.5 }}>{t('최근 수납')}</Typography>
          {b.recentPaid.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>{t('없음')}</Typography>
          ) : (
            <List dense disablePadding>
              {b.recentPaid.map((i) => (
                <ListItem key={i.id} divider>
                  <ListItemText primary={`${i.studentName} · ${won(i.amount)}`} secondary={`${i.title}${i.paidOn ? ` · ${dayjs(i.paidOn).format(t('M월 D일'))}` : ''}`} />
                </ListItem>
              ))}
            </List>
          )}
          <Box sx={{ pt: 1.5, textAlign: 'right' }}>
            <Typography component={Link} href="/invoices" variant="body2" color="primary" sx={{ textDecoration: 'none' }}>{t('수납 관리로 →')}</Typography>
          </Box>
        </Box>
      )}
    </WidgetCard>
  );
}

// ───────── DASH-013 이탈 위험 ─────────
const REASON: Record<ChurnReason, string> = {
  ABSENCE_UP: '결석 증가',
  UNREAD: '알림장 미열람',
  COUNSEL_WITHDRAW: '상담에서 퇴원 언급',
  OVERDUE: '원비 연체',
  PAUSED_BEFORE: '최근 휴원',
};

export function ChurnRiskWidget({ instId }: { instId?: string }) {
  const t = useT();
  const q = useQuery({ queryKey: ['owner', 'churn', instId], queryFn: () => api.get<ChurnRisk[]>('dashboard/owner/churn-risks', { limit: 10 }), enabled: !!instId, staleTime: 10 * 60_000 });
  return (
    <WidgetCard
      title={t('이탈 위험 원생')}
      menuId="DASH-013"
      loading={q.isLoading}
      empty={!q.isLoading && !q.data?.length && t('이탈 징후가 보이는 원생이 없습니다')}
    >
      <List dense disablePadding>
        {(q.data ?? []).map((r) => (
          <ListItemButton key={r.studentId} component={Link} href={`/students/${r.studentId}`} divider alignItems="flex-start">
            <ListItemText
              primary={
                <Stack direction="row" spacing={1} alignItems="center">
                  <span>{r.studentName}</span>
                  <Typography variant="caption" color="text.secondary">{r.classroomNames.join(', ')}</Typography>
                </Stack>
              }
              secondary={
                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                  {r.reasons.map((x) => (
                    <Chip key={x} size="small" variant="outlined" label={x === 'ABSENCE_UP' ? t('결석 {0}회 (이전 {1}회)', { 0: r.absentRecent, 1: r.absentBefore }) : t(REASON[x])} />
                  ))}
                </Stack>
              }
              slotProps={{ secondary: { component: 'div' } }}
            />
            <Tooltip title={t('위험 점수 (100점 만점)')}>
              <Chip size="small" color={r.score >= 70 ? 'error' : 'warning'} label={r.score} sx={{ ml: 1, mt: 0.5 }} />
            </Tooltip>
          </ListItemButton>
        ))}
      </List>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', p: 1.5 }}>
        {t('결석 증가·알림장 미열람·상담 내용·연체·휴원 이력으로 매긴 참고 점수입니다. 상담 예약으로 먼저 이야기를 들어 보세요.')}
      </Typography>
    </WidgetCard>
  );
}

// ───────── DASH-014 교직원 현황 ─────────
export function StaffTodayWidget({ instId }: { instId?: string }) {
  const t = useT();
  const q = useQuery({ queryKey: ['owner', 'staff', instId], queryFn: () => api.get<OwnerStaff>('dashboard/owner/staff'), enabled: !!instId, refetchInterval: 120_000 });
  const d = q.data;
  return (
    <WidgetCard title={t('교직원 현황')} menuId="DASH-014" loading={q.isLoading}>
      {d && (
        <>
          {d.coverNeeded.length > 0 && (
            <Alert severity="warning" sx={{ m: 1.5 }} action={<Button color="inherit" size="small" component={Link} href="/classes">{t('교사 배정')}</Button>}>
              {t('담당 교사가 아직 출근하지 않은 수업: {0}', { 0: d.coverNeeded.map((c) => `${c.classroomName}(${c.startTime})`).join(', ') })}
            </Alert>
          )}
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('이름')}</TableCell>
                  <TableCell>{t('출근')}</TableCell>
                  <TableCell>{t('오늘 수업')}</TableCell>
                  <TableCell align="right">{t('답장 대기')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {d.staff.map((s) => (
                  <TableRow key={s.userId}>
                    <TableCell>
                      {s.name} <Typography component="span" variant="caption" color="text.secondary">{t(ROLE_LABEL[s.role])}</Typography>
                    </TableCell>
                    <TableCell>
                      {s.checkInAt ? (
                        `${time(s.checkInAt)}${s.checkOutAt ? ` – ${time(s.checkOutAt)}` : ''}`
                      ) : s.classesToday.length > 0 ? (
                        <Typography variant="body2" color="error.main">{t('미출근')}</Typography>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>{s.classesToday.join(', ') || '-'}</TableCell>
                    <TableCell align="right">{s.unansweredMessages > 0 ? <Chip size="small" color="warning" label={s.unansweredMessages} /> : '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', p: 1.5 }}>
            {t('업무량 비교용 참고 지표입니다. 출근 기록은 교사 앱의 출퇴근 버튼 기준입니다.')}
          </Typography>
        </>
      )}
    </WidgetCard>
  );
}

// ───────── DASH-015 교직원 공지·업무 지시 ─────────
export function StaffMemoWidget({ instId }: { instId?: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<StaffMemo | null>(null);
  const q = useQuery({ queryKey: ['staff-memos', instId], queryFn: () => api.get<StaffMemo[]>('staff-memos'), enabled: !!instId });
  const list = (q.data ?? []).slice(0, 6);
  return (
    <WidgetCard
      title={t('교직원 공지 · 업무 지시')}
      menuId="DASH-015"
      actions={<Button size="small" variant="outlined" onClick={() => setOpen(true)}>{t('공지 보내기')}</Button>}
      loading={q.isLoading}
      empty={!q.isLoading && list.length === 0 && t('보낸 공지가 없습니다. 교직원에게만 보이는 공지나 할 일을 보낼 수 있습니다.')}
    >
      <List dense disablePadding>
        {list.map((m) => (
          <ListItemButton key={m.id} divider onClick={() => setDetail(m)}>
            <ListItemText
              primary={m.title}
              secondary={[
                dateTime(m.createdAt),
                m.dueDate && t('마감 {0}', { 0: dayjs(m.dueDate).format(t('M월 D일')) }),
                t('확인 {0}/{1} · 완료 {2}', { 0: m.readCount, 1: m.targets, 2: m.doneCount }),
              ].filter(Boolean).join(' · ')}
            />
            <Box sx={{ width: 80, ml: 1 }}>
              <LinearProgress variant="determinate" value={m.targets > 0 ? (m.doneCount / m.targets) * 100 : 0} sx={{ height: 6, borderRadius: 3 }} />
            </Box>
          </ListItemButton>
        ))}
      </List>
      {open && <StaffMemoDialog instId={instId} onClose={() => setOpen(false)} />}
      {detail && <StaffMemoAckDialog memo={detail} instId={instId} onClose={() => setDetail(null)} />}
    </WidgetCard>
  );
}

function StaffMemoDialog({ instId, onClose }: { instId?: string; onClose: () => void }) {
  const t = useT();
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [due, setDue] = useState('');
  const [toAll, setToAll] = useState(true);
  const [targets, setTargets] = useState<StaffMember[]>([]);
  const staff = useQuery({ queryKey: ['staff', instId], queryFn: () => api.get<StaffMember[]>('staff'), enabled: !!instId });
  const create = useMutation({
    mutationFn: () => api.post<StaffMemo>('staff-memos', {
      title: title.trim(), body: body.trim() || null, dueDate: due || null, targetUserIds: toAll ? [] : targets.map((s) => s.userId),
    }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['staff-memos'] });
      onClose();
    },
  });
  const valid = title.trim().length > 0 && (toAll || targets.length > 0);
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('교직원 공지 보내기')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {create.isError && <Alert severity="error">{errorMessage(create.error)}</Alert>}
          <TextField label={t('제목')} value={title} onChange={(e) => setTitle(e.target.value)} slotProps={{ htmlInput: { maxLength: 100 } }} autoFocus />
          <TextField label={t('내용 (선택)')} value={body} onChange={(e) => setBody(e.target.value)} multiline minRows={3} slotProps={{ htmlInput: { maxLength: 2000 } }} />
          <TextField label={t('마감일 (선택)')} type="date" value={due} onChange={(e) => setDue(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 200 }} />
          <FormControlLabel control={<Switch checked={toAll} onChange={(e) => setToAll(e.target.checked)} />} label={t('모든 교직원에게')} />
          {!toAll && (
            <Autocomplete
              multiple
              options={(staff.data ?? []).filter((s) => s.role !== 'PARENT')}
              getOptionLabel={(s) => `${s.name} (${t(ROLE_LABEL[s.role])})`}
              isOptionEqualToValue={(a, b) => a.userId === b.userId}
              value={targets}
              onChange={(_, v) => setTargets(v)}
              renderInput={(p) => <TextField {...p} label={t('받는 사람')} />}
            />
          )}
          <Typography variant="caption" color="text.secondary">{t('교사 앱으로 알림이 가고, 교사 대시보드에서 확인·완료를 표시합니다. 학부모에게는 보이지 않습니다.')}</Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('취소')}</Button>
        <Button variant="contained" disabled={!valid || create.isPending} onClick={() => create.mutate()}>{t('보내기')}</Button>
      </DialogActions>
    </Dialog>
  );
}

function StaffMemoAckDialog({ memo, instId, onClose }: { memo: StaffMemo; instId?: string; onClose: () => void }) {
  const t = useT();
  const qc = useQueryClient();
  const acks = useQuery({ queryKey: ['staff-memo-acks', instId, memo.id], queryFn: () => api.get<StaffMemoAck[]>(`staff-memos/${memo.id}/acks`), enabled: !!instId });
  const cancel = useMutation({
    mutationFn: () => api.delete(`staff-memos/${memo.id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['staff-memos'] });
      onClose();
    },
  });
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{memo.title}</DialogTitle>
      <DialogContent>
        {memo.body && <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>{memo.body}</Typography>}
        <Typography variant="caption" color="text.secondary">
          {[memo.authorName, dateTime(memo.createdAt), memo.dueDate && t('마감 {0}', { 0: dayjs(memo.dueDate).format(t('M월 D일')) })].filter(Boolean).join(' · ')}
        </Typography>
        {cancel.isError && <Alert severity="error" sx={{ mt: 1 }}>{errorMessage(cancel.error)}</Alert>}
        <List dense>
          {(acks.data ?? []).map((a) => (
            <ListItem key={a.userId} divider secondaryAction={
              a.doneAt ? <Chip size="small" color="success" label={t('완료 {0}', { 0: dateTime(a.doneAt) })} />
                : a.readAt ? <Chip size="small" label={t('확인 {0}', { 0: dateTime(a.readAt) })} />
                  : <Chip size="small" variant="outlined" label={t('안 읽음')} />
            }>
              <ListItemText primary={a.name} />
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button color="error" disabled={cancel.isPending} onClick={() => cancel.mutate()}>{t('공지 취소')}</Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose}>{t('닫기')}</Button>
      </DialogActions>
    </Dialog>
  );
}

// ───────── DASH-016 지점 비교 ─────────
export function InstitutionsWidget({ instId }: { instId?: string }) {
  const t = useT();
  const q = useQuery({ queryKey: ['owner', 'institutions'], queryFn: () => api.get<InstitutionCard[]>('me/dashboard/institutions'), staleTime: 120_000 });
  const switchInst = useSwitchInstitution();
  const cards = q.data ?? [];
  if (cards.length < 2) return null;
  return (
    <WidgetCard title={t('운영 기관 한눈에 보기')} menuId="DASH-016">
      <Box sx={{ display: 'grid', gap: 1.5, p: 1.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fill, minmax(200px, 1fr))' } }}>
        {cards.map((c) => (
          <Paper key={c.institutionId} variant="outlined" sx={{ p: 1.5, borderColor: c.institutionId === instId ? 'primary.main' : undefined }}>
            <Typography variant="subtitle2" noWrap>{c.name}</Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              {t('재원 {0}명 · 등원율 {1} · 수납률 {2}', { 0: c.activeStudents, 1: ratio(c.todayAttendanceRate), 2: ratio(c.collectionRate) })}
            </Typography>
            <Stack direction="row" alignItems="center" sx={{ mt: 1 }}>
              {c.pending > 0 && <Chip size="small" color="error" label={t('대기 {0}', { 0: c.pending })} />}
              <Box sx={{ flex: 1 }} />
              {c.institutionId !== instId && (
                <Button size="small" disabled={switchInst.isPending} onClick={() => switchInst.mutate(c.institutionId)}>{t('이 기관으로')}</Button>
              )}
            </Stack>
          </Paper>
        ))}
      </Box>
    </WidgetCard>
  );
}
