'use client';

import { useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import dayjs from 'dayjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import { INVOICE_FILTER, PAY_METHOD, won, type Invoice, type InvoiceFilter, type InvoiceSummary, type PayMethod } from '@/lib/billing';
import { percent } from '@/lib/format';
import { useSession } from '@/lib/session';
import type { Classroom, Page, Student } from '@/lib/types';
import PageHeader from '@/components/PageHeader';
import { DiscountRulesDialog, RefundDialog, RefundListDialog, useDiscountPreview } from './BillingExtras';
import { useT } from '@/lib/i18n';

function StatusChip({ i }: { i: Invoice }) {
  const t = useT();
  if (i.status === 'CANCELED') return <Chip size="small" label={t('취소')} variant="outlined" />;
  if (i.status === 'PAID') return <Chip size="small" color="success" label={t('수납 {0}{1}', { 0: dayjs(i.paidOn).format('M/D'), 1: i.payMethod ? ` · ${t(PAY_METHOD[i.payMethod])}` : '' })} />;
  if (i.overdueDays > 0) return <Chip size="small" color="error" label={t('연체 {0}일', { 0: i.overdueDays })} />;
  return <Chip size="small" color="warning" label={t('미납')} />;
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'error' }) {
  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="h3" color={tone === 'error' ? 'error' : undefined}>{value}</Typography>
      {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
    </Paper>
  );
}

/** PAY-001 청구서 발송 · PAY-002 수납 리스트(수동 체크) — 원장·실장 */
export default function InvoicesView() {
  const t = useT();
  const qc = useQueryClient();
  const { session, manager } = useSession();
  const instId = session?.institution?.institutionId;
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'));
  const [status, setStatus] = useState<InvoiceFilter>('ALL');
  const [classId, setClassId] = useState('');
  const [issueOpen, setIssueOpen] = useState(false);
  const [paying, setPaying] = useState<Invoice | null>(null);
  const [refunding, setRefunding] = useState<Invoice | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [refundsOpen, setRefundsOpen] = useState(false);

  const classes = useQuery({ queryKey: ['classes', instId], queryFn: () => api.get<Classroom[]>('classes'), enabled: !!instId });
  const summary = useQuery({ queryKey: ['invoice-summary', instId, month], queryFn: () => api.get<InvoiceSummary>('invoices/summary', { month }), enabled: !!instId && manager });
  const list = useQuery({
    queryKey: ['invoices', instId, month, status, classId],
    queryFn: () => api.get<Invoice[]>('invoices', { month, status, classroomId: classId || undefined }),
    enabled: !!instId && manager,
  });
  const refresh = () => (qc.invalidateQueries({ queryKey: ['invoices'] }), qc.invalidateQueries({ queryKey: ['invoice-summary'] }), qc.invalidateQueries({ queryKey: ['dashboard', 'billing'] }));
  const act = useMutation({
    mutationFn: (v: { id: string; op: 'unpaid' | 'cancel' | 'remind' }) => api.post(`invoices/${v.id}/${v.op}`),
    onSuccess: refresh,
  });

  if (!manager) return <Alert severity="info">{t('원장·실장만 볼 수 있습니다.')}</Alert>;
  const s = summary.data;

  return (
    <>
      <PageHeader
        title={t('수납 관리')}
        menuId="PAY-002"
        description={t('원생별 원비를 청구하고 납부 여부를 확인합니다. 앱 결제(PG)는 아직 연동 전이라 납부 확인은 직접 체크합니다. 기한이 가까워지거나 지나면 학부모에게 자동으로 알려 줍니다.')}
        actions={
          <>
            <Button variant="outlined" onClick={() => setRulesOpen(true)}>{t('할인 규칙')}</Button>
            <Button variant="outlined" onClick={() => setRefundsOpen(true)}>{t('환불 내역')}</Button>
            <Button variant="contained" onClick={() => setIssueOpen(true)}>{t('청구서 발송')}</Button>
          </>
        }
      />
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, mb: 2 }}>
        <Stat label={t('청구액')} value={s ? won(s.totalAmount) : '-'} sub={s ? t('{0}건', { 0: s.count }) : ''} />
        <Stat label={t('수납액')} value={s ? won(s.paidAmount) : '-'} sub={s?.collectionRate != null ? t('수납률 {0}', { 0: percent(s.collectionRate) }) : ''} />
        <Stat label={t('미납')} value={s ? t('{0}건', { 0: s.unpaidCount }) : '-'} />
        <Stat label={t('연체')} value={s ? t('{0}건', { 0: s.overdueCount }) : '-'} sub={s && s.overdueCount > 0 ? won(s.overdueAmount) : ''} tone={s && s.overdueCount > 0 ? 'error' : undefined} />
      </Box>
      <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', rowGap: 1 }}>
        <TextField size="small" type="month" label={t('기한 월')} value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField select size="small" label={t('상태')} value={status} onChange={(e) => setStatus(e.target.value as InvoiceFilter)} sx={{ minWidth: 130 }}>
          {INVOICE_FILTER.map((f) => <MenuItem key={f.value} value={f.value}>{t(f.label)}</MenuItem>)}
        </TextField>
        <TextField select size="small" label={t('반')} value={classId} onChange={(e) => setClassId(e.target.value)} sx={{ minWidth: 160 }}>
          <MenuItem value="">{t('전체')}</MenuItem>
          {classes.data?.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
        </TextField>
      </Stack>
      {(list.isError || act.isError) && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage(list.error ?? act.error)}</Alert>}
      {act.isSuccess && act.variables?.op === 'remind' && <Alert severity="success" sx={{ mb: 2 }} onClose={() => act.reset()}>{t('학부모에게 다시 알렸습니다')}</Alert>}
      {list.isFetching && <LinearProgress />}
      <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('원생')}</TableCell><TableCell>{t('반')}</TableCell><TableCell>{t('청구')}</TableCell>
              <TableCell align="right">{t('금액')}</TableCell><TableCell>{t('기한')}</TableCell><TableCell>{t('상태')}</TableCell><TableCell align="right">{t('처리')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {list.data?.map((i) => (
              <TableRow key={i.id} hover>
                <TableCell>{i.student.name}</TableCell>
                <TableCell>{i.classroomName ?? '-'}</TableCell>
                <TableCell>
                  {i.title}
                  {!i.sentAt && <Chip size="small" label={t('미발송')} sx={{ ml: 1 }} />}
                </TableCell>
                <TableCell align="right">{won(i.amount)}</TableCell>
                <TableCell>{dayjs(i.dueDate).format('M/D')}</TableCell>
                <TableCell><StatusChip i={i} /></TableCell>
                <TableCell align="right">
                  {i.status === 'UNPAID' && (
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <Button size="small" color="success" onClick={() => setPaying(i)}>{t('수납 처리')}</Button>
                      <Button size="small" onClick={() => act.mutate({ id: i.id, op: 'remind' })}>{i.sentAt ? t('다시 알림') : t('발송')}</Button>
                      <Button size="small" color="inherit" onClick={() => confirm(t('{0} · {1} 청구를 취소할까요?', { 0: i.student.name, 1: i.title })) && act.mutate({ id: i.id, op: 'cancel' })}>{t('취소')}</Button>
                    </Stack>
                  )}
                  {i.status === 'PAID' && (
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <Button size="small" color="warning" onClick={() => setRefunding(i)}>{t('환불')}</Button>
                      <Button size="small" color="inherit" onClick={() => confirm(t('수납 완료를 미납으로 되돌릴까요?')) && act.mutate({ id: i.id, op: 'unpaid' })}>{t('되돌리기')}</Button>
                    </Stack>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {list.data?.length === 0 && <TableRow><TableCell colSpan={7} align="center" sx={{ py: 5, color: 'text.secondary' }}>{t('이 달에 기한이 있는 청구서가 없습니다')}</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Paper>
      {issueOpen && <IssueDialog classes={classes.data ?? []} onClose={() => setIssueOpen(false)} onIssued={() => (setIssueOpen(false), refresh())} />}
      {paying && <PaidDialog invoice={paying} onClose={() => setPaying(null)} onDone={() => (setPaying(null), refresh())} />}
      {refunding && <RefundDialog invoice={refunding} onClose={() => setRefunding(null)} onDone={() => (setRefunding(null), refresh())} />}
      {rulesOpen && <DiscountRulesDialog onClose={() => setRulesOpen(false)} />}
      {refundsOpen && <RefundListDialog month={month} onClose={() => setRefundsOpen(false)} />}
    </>
  );
}

function PaidDialog({ invoice, onClose, onDone }: { invoice: Invoice; onClose: () => void; onDone: () => void }) {
  const t = useT();
  const [method, setMethod] = useState<PayMethod>('TRANSFER');
  const [paidOn, setPaidOn] = useState(dayjs().format('YYYY-MM-DD'));
  const [note, setNote] = useState('');
  const save = useMutation({ mutationFn: () => api.post(`invoices/${invoice.id}/paid`, { method, paidOn, note: note.trim() || null }), onSuccess: onDone });
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{t('수납 처리 — {0}', { 0: invoice.student.name })}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {save.isError && <Alert severity="error">{errorMessage(save.error)}</Alert>}
          <Typography variant="body2" color="text.secondary">{invoice.title} · {won(invoice.amount)}</Typography>
          <TextField select label={t('납부 방법')} value={method} onChange={(e) => setMethod(e.target.value as PayMethod)}>
            {(Object.keys(PAY_METHOD) as PayMethod[]).map((m) => <MenuItem key={m} value={m}>{t(PAY_METHOD[m])}</MenuItem>)}
          </TextField>
          <TextField type="date" label={t('납부일')} value={paidOn} onChange={(e) => setPaidOn(e.target.value)} slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: dayjs().format('YYYY-MM-DD') } }} />
          <TextField label={t('메모')} value={note} onChange={(e) => setNote(e.target.value)} slotProps={{ htmlInput: { maxLength: 200 } }} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('닫기')}</Button>
        <Button variant="contained" disabled={!paidOn || save.isPending} onClick={() => save.mutate()}>{t('수납 완료')}</Button>
      </DialogActions>
    </Dialog>
  );
}

function IssueDialog({ classes, onClose, onIssued }: { classes: Classroom[]; onClose: () => void; onIssued: () => void }) {
  const t = useT();
  const { session } = useSession();
  const instId = session?.institution?.institutionId;
  const [classId, setClassId] = useState('');
  const [title, setTitle] = useState(`${dayjs().format('M')}월 원비`);
  const [dueDate, setDueDate] = useState(dayjs().add(7, 'day').format('YYYY-MM-DD'));
  const [memo, setMemo] = useState('');
  const [bulk, setBulk] = useState('');
  const [notify, setNotify] = useState(true);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [applyDiscounts, setApplyDiscounts] = useState(true);
  const [periodStart, setPeriodStart] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [periodEnd, setPeriodEnd] = useState(dayjs().endOf('month').format('YYYY-MM-DD'));

  const students = useQuery({
    queryKey: ['invoice-students', instId, classId],
    queryFn: () => api.get<Page<Student>>('students', { classId, status: 'ACTIVE', size: 100, page: 0 }),
    enabled: !!instId && !!classId,
  });
  const rows = useMemo(() => students.data?.items ?? [], [students.data]);
  const chosen = rows.filter((r) => picked[r.id] !== false);
  const amountOf = (id: string) => Number((amounts[id] ?? bulk).replace(/[^0-9]/g, '')) || 0;
  const ready = !!title.trim() && !!dueDate && chosen.length > 0 && chosen.every((r) => (amounts[r.id] ?? bulk) !== '');
  // PAY-006 할인 미리보기 (발행 때 서버가 같은 규칙으로 다시 계산한다)
  const previewItems = ready ? chosen.map((r) => ({ studentId: r.id, amount: amountOf(r.id) })) : [];
  const preview = useDiscountPreview(previewItems, applyDiscounts && ready);
  const discountOf = (id: string) => (applyDiscounts ? preview.data?.find((p) => p.studentId === id) : undefined);
  const finalOf = (id: string) => discountOf(id)?.finalAmount ?? amountOf(id);

  const issue = useMutation({
    mutationFn: () =>
      api.post('invoices/with-discounts', {
        title: title.trim(), dueDate, memo: memo.trim() || null, notify, applyDiscounts,
        periodStart: periodStart || null, periodEnd: periodEnd || null,
        items: chosen.map((r) => ({ studentId: r.id, amount: amountOf(r.id) })),
      }),
    onSuccess: onIssued,
  });

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{t('청구서 발송')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {issue.isError && <Alert severity="error">{errorMessage(issue.error)}</Alert>}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField label={t('청구 제목')} value={title} onChange={(e) => setTitle(e.target.value)} fullWidth slotProps={{ htmlInput: { maxLength: 100 } }} />
            <TextField type="date" label={t('납부기한')} value={dueDate} onChange={(e) => setDueDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          </Stack>
          <TextField label={t('안내 메모 (선택)')} value={memo} onChange={(e) => setMemo(e.target.value)} slotProps={{ htmlInput: { maxLength: 300 } }} />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
            <TextField type="date" size="small" label={t('교습 시작')} value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField type="date" size="small" label={t('교습 종료')} value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            <Typography variant="caption" color="text.secondary">{t('중도 퇴원 환불 계산의 기준 기간입니다')}</Typography>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField select label={t('반 선택')} value={classId} onChange={(e) => (setClassId(e.target.value), setPicked({}), setAmounts({}))} sx={{ minWidth: 200 }}>
              {classes.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
            </TextField>
            <TextField label={t('일괄 금액(원)')} value={bulk} onChange={(e) => setBulk(e.target.value.replace(/[^0-9]/g, ''))} slotProps={{ htmlInput: { inputMode: 'numeric' } }} helperText={t('원생별 금액을 따로 적지 않으면 이 금액으로 청구합니다')} />
          </Stack>
          {students.isFetching && <LinearProgress />}
          {classId && rows.length === 0 && !students.isFetching && <Typography color="text.secondary">{t('이 반에 재원 중인 원생이 없습니다')}</Typography>}
          {rows.length > 0 && (
            <Paper variant="outlined" sx={{ maxHeight: 320, overflowY: 'auto' }}>
              <Table size="small" stickyHeader>
                <TableHead><TableRow><TableCell padding="checkbox" /><TableCell>{t('원생')}</TableCell><TableCell>{t('금액(원)')}</TableCell>{applyDiscounts && <><TableCell>{t('할인')}</TableCell><TableCell align="right">{t('청구액')}</TableCell></>}</TableRow></TableHead>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell padding="checkbox"><Checkbox checked={picked[r.id] !== false} onChange={(e) => setPicked({ ...picked, [r.id]: e.target.checked })} /></TableCell>
                      <TableCell>{r.name}</TableCell>
                      <TableCell>
                        <TextField size="small" variant="standard" value={amounts[r.id] ?? bulk} onChange={(e) => setAmounts({ ...amounts, [r.id]: e.target.value.replace(/[^0-9]/g, '') })} slotProps={{ htmlInput: { inputMode: 'numeric' } }} />
                      </TableCell>
                      {applyDiscounts && (
                        <>
                          <TableCell>
                            {discountOf(r.id)?.applied.map((a) => <Chip key={a.ruleId} size="small" color="info" variant="outlined" label={`${a.name} -${won(a.amount)}`} sx={{ mr: 0.5 }} />)}
                          </TableCell>
                          <TableCell align="right">{picked[r.id] === false ? '-' : won(finalOf(r.id))}</TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          )}
          <FormControlLabel control={<Switch checked={applyDiscounts} onChange={(e) => setApplyDiscounts(e.target.checked)} />} label={t('할인 규칙 자동 적용 (형제·장기 등록·다과목)')} />
          {preview.isError && <Alert severity="warning">{errorMessage(preview.error)}</Alert>}
          <FormControlLabel control={<Switch checked={notify} onChange={(e) => setNotify(e.target.checked)} />} label={t('학부모에게 바로 알림 보내기 (끄면 미발송으로 저장)')} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Typography variant="caption" color="text.secondary" sx={{ flex: 1, pl: 2 }}>{t('{0}명 · 합계', { 0: chosen.length })}{' '}{won(chosen.reduce((a, r) => a + finalOf(r.id), 0))}</Typography>
        <Button onClick={onClose}>{t('취소')}</Button>
        <Button variant="contained" disabled={!ready || issue.isPending} onClick={() => issue.mutate()}>{t('발송')}</Button>
      </DialogActions>
    </Dialog>
  );
}
