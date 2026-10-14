'use client';

import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
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
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/EditOutlined';
import dayjs from 'dayjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import { PAY_METHOD, won, type Invoice, type PayMethod } from '@/lib/billing';
import { WITHDRAWAL_REASON } from '@/lib/student';
import type { WithdrawalReason } from '@/lib/types';
import { useT, translate } from '@/lib/i18n';
import MenuIdChip from '@/components/ui/MenuIdChip';

// ───────── PAY-006 할인 규칙 ─────────
export type DiscountKind = 'SIBLING' | 'LONG_TERM' | 'MULTI_CLASS';
export interface DiscountRule { id: string; name: string; kind: DiscountKind; threshold: number; valueType: 'PERCENT' | 'AMOUNT'; value: number; active: boolean }
export interface DiscountPreviewItem {
  studentId: string; studentName: string; baseAmount: number; discountAmount: number; finalAmount: number;
  applied: { ruleId: string; name: string; amount: number }[]; siblingRank: number; monthsEnrolled: number; classCount: number;
}

const KIND: Record<DiscountKind, { label: string; unit: string; help: string }> = {
  SIBLING: { label: '형제', unit: '째부터', help: '같은 보호자 번호로 등록된 재원 형제 중, 먼저 등록한 순으로 n째부터' },
  LONG_TERM: { label: '장기 등록', unit: '개월부터', help: '첫 반 배정일부터 n개월이 지난 원생' },
  MULTI_CLASS: { label: '다과목', unit: '개 반부터', help: '지금 n개 이상의 반에 다니는 원생' },
};

export const ruleText = (r: DiscountRule) =>
  translate('{0} {1}{2} · {3} 할인', { 0: translate(KIND[r.kind].label), 1: r.threshold, 2: translate(KIND[r.kind].unit), 3: r.valueType === 'PERCENT' ? `${r.value}%` : won(r.value) });

type RuleForm = { id?: string; name: string; kind: DiscountKind; threshold: string; valueType: 'PERCENT' | 'AMOUNT'; value: string; active: boolean };
const emptyRule = (): RuleForm => ({ name: '', kind: 'SIBLING', threshold: '2', valueType: 'PERCENT', value: '10', active: true });

export function DiscountRulesDialog({ onClose }: { onClose: () => void }) {
  const tr = useT();
  const qc = useQueryClient();
  const rules = useQuery({ queryKey: ['discount-rules'], queryFn: () => api.get<DiscountRule[]>('discount-rules') });
  const [f, setF] = useState<RuleForm>(emptyRule());
  const refresh = () => void qc.invalidateQueries({ queryKey: ['discount-rules'] });
  const save = useMutation({
    mutationFn: () => {
      const body = { name: f.name.trim() || tr('{0} 할인', { 0: tr(KIND[f.kind].label) }), kind: f.kind, threshold: Number(f.threshold), valueType: f.valueType, value: Number(f.value), active: f.active };
      return f.id ? api.put(`discount-rules/${f.id}`, body) : api.post('discount-rules', body);
    },
    onSuccess: () => { setF(emptyRule()); refresh(); },
  });
  const del = useMutation({ mutationFn: (id: string) => api.delete(`discount-rules/${id}`), onSuccess: refresh });
  const err = rules.error ?? save.error ?? del.error;

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{tr('원비 할인 규칙')}{' '}<MenuIdChip id="PAY-006" sx={{ ml: 1 }} /></DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {tr('청구서를 만들 때 조건에 맞는 원생에게 자동으로 할인을 적용합니다. 여러 규칙에 해당하면 모두 더해 적용하고(청구액을 넘지 않음), 퍼센트 할인은 10원 단위로 버립니다.')}
        </Typography>
        {err && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage(err)}</Alert>}
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }}>
            <TextField select size="small" label={tr('종류')} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as DiscountKind, threshold: e.target.value === 'LONG_TERM' ? '12' : '2' })} sx={{ minWidth: 120 }}>
              {(Object.keys(KIND) as DiscountKind[]).map((k) => <MenuItem key={k} value={k}>{tr(KIND[k].label)}</MenuItem>)}
            </TextField>
            <TextField size="small" label={tr('조건')} value={f.threshold} onChange={(e) => setF({ ...f, threshold: e.target.value.replace(/[^0-9]/g, '') })}
              slotProps={{ input: { endAdornment: <Typography variant="caption" sx={{ whiteSpace: 'nowrap' }}>{tr(KIND[f.kind].unit)}</Typography> } }} sx={{ width: 130 }} />
            <ToggleButtonGroup exclusive size="small" value={f.valueType} onChange={(_, v) => v && setF({ ...f, valueType: v })}>
              <ToggleButton value="PERCENT">%</ToggleButton>
              <ToggleButton value="AMOUNT">{tr('원')}</ToggleButton>
            </ToggleButtonGroup>
            <TextField size="small" label={f.valueType === 'PERCENT' ? tr('할인율(%)') : tr('할인액(원)')} value={f.value} onChange={(e) => setF({ ...f, value: e.target.value.replace(/[^0-9]/g, '') })} sx={{ width: 130 }} />
            <TextField size="small" label={tr('이름 (선택)')} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} slotProps={{ htmlInput: { maxLength: 50 } }} sx={{ flex: 1 }} />
            {f.id && <FormControlLabel control={<Switch checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} />} label={tr('사용')} />}
            <Button variant="contained" disabled={!f.threshold || !f.value || save.isPending} onClick={() => save.mutate()}>{f.id ? tr('수정') : tr('추가')}</Button>
            {f.id && <Button onClick={() => setF(emptyRule())}>{tr('취소')}</Button>}
          </Stack>
          <Typography variant="caption" color="text.secondary">{tr(KIND[f.kind].help)}</Typography>
        </Paper>
        <Table size="small">
          <TableHead><TableRow><TableCell>{tr('이름')}</TableCell><TableCell>{tr('조건·할인')}</TableCell><TableCell>{tr('상태')}</TableCell><TableCell /></TableRow></TableHead>
          <TableBody>
            {(rules.data ?? []).map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.name}</TableCell>
                <TableCell>{ruleText(r)}</TableCell>
                <TableCell>{r.active ? <Chip size="small" color="success" label={tr('사용')} /> : <Chip size="small" label={tr('중지')} />}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => setF({ id: r.id, name: r.name, kind: r.kind, threshold: String(r.threshold), valueType: r.valueType, value: String(r.value), active: r.active })}><EditIcon fontSize="small" /></IconButton>
                  <IconButton size="small" onClick={() => confirm(tr('\'{0}\' 규칙을 지울까요? 이미 발행한 청구서는 바뀌지 않습니다.', { 0: r.name })) && del.mutate(r.id)}><DeleteIcon fontSize="small" /></IconButton>
                </TableCell>
              </TableRow>
            ))}
            {rules.data?.length === 0 && <TableRow><TableCell colSpan={4} align="center" sx={{ py: 3, color: 'text.secondary' }}>{tr('아직 할인 규칙이 없습니다')}</TableCell></TableRow>}
          </TableBody>
        </Table>
      </DialogContent>
      <DialogActions><Button onClick={onClose}>{tr('닫기')}</Button></DialogActions>
    </Dialog>
  );
}

/** 청구 대상·금액이 바뀌면 0.5초 뒤 할인 미리보기를 다시 받는다 */
export function useDiscountPreview(items: { studentId: string; amount: number }[], enabled: boolean) {
  const key = JSON.stringify(items);
  const [debounced, setDebounced] = useState(key);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(key), 500);
    return () => clearTimeout(t);
  }, [key]);
  return useQuery({
    queryKey: ['discount-preview', debounced],
    queryFn: () => api.post<DiscountPreviewItem[]>('invoices/discount-preview', { items: JSON.parse(debounced) }),
    enabled: enabled && items.length > 0 && debounced === key,
  });
}

// ───────── PAY-007 중도 퇴원 환불 ─────────
type RefundMethod = 'LAW' | 'DAILY';
interface RefundCalc {
  invoiceId: string; studentName: string; method: RefundMethod; paidAmount: number; periodStart: string; periodEnd: string;
  withdrawDate: string; totalDays: number; usedDays: number; refundAmount: number; lines: string[];
}
export interface Refund {
  id: string; invoiceId: string; invoiceTitle: string; studentId: string; studentName: string; method: RefundMethod; withdrawDate: string;
  periodStart: string; periodEnd: string; paidAmount: number; calculatedAmount: number; refundAmount: number; refundedOn: string;
  payMethod: PayMethod; note: string | null; createdByName: string; createdAt: string;
}

export function RefundDialog({ invoice, onClose, onDone }: { invoice: Invoice; onClose: () => void; onDone: () => void }) {
  const tr = useT();
  const [withdrawDate, setWithdrawDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [method, setMethod] = useState<RefundMethod>('LAW');
  const [periodStart, setPeriodStart] = useState(dayjs(invoice.dueDate).startOf('month').format('YYYY-MM-DD'));
  const [periodEnd, setPeriodEnd] = useState(dayjs(invoice.dueDate).endOf('month').format('YYYY-MM-DD'));
  const [amount, setAmount] = useState('');
  const [payMethod, setPayMethod] = useState<PayMethod>('TRANSFER');
  const [note, setNote] = useState('');
  const [withdraw, setWithdraw] = useState(true);
  const [reason, setReason] = useState<WithdrawalReason>('OTHER');

  const calcBody = { withdrawDate, method, periodStart, periodEnd };
  const calc = useQuery({
    queryKey: ['refund-calc', invoice.id, calcBody],
    queryFn: () => api.post<RefundCalc>(`invoices/${invoice.id}/refund-calc`, calcBody),
    enabled: !!withdrawDate && !!periodStart && !!periodEnd,
  });
  useEffect(() => { if (calc.data) setAmount(String(calc.data.refundAmount)); }, [calc.data]);

  const save = useMutation({
    mutationFn: () => api.post(`invoices/${invoice.id}/refund`, {
      ...calcBody, refundAmount: Number(amount), payMethod, note: note.trim() || null, withdrawReason: withdraw ? reason : null,
    }),
    onSuccess: onDone,
  });

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{tr('중도 퇴원 환불 · {0}', { 0: invoice.student.name })}{' '}<MenuIdChip id="PAY-007" sx={{ ml: 1 }} /></DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2">{tr('{0} · 납부 {1}', { 0: invoice.title, 1: won(invoice.amount) })}</Typography>
          <Stack direction="row" spacing={1}>
            <TextField type="date" size="small" label={tr('교습 시작')} value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField type="date" size="small" label={tr('교습 종료')} value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField type="date" size="small" label={tr('퇴원일(마지막 수업 다음 날)')} value={withdrawDate} onChange={(e) => setWithdrawDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            <ToggleButtonGroup exclusive size="small" value={method} onChange={(_, v) => v && setMethod(v)}>
              <ToggleButton value="LAW">{tr('학원법 기준')}</ToggleButton>
              <ToggleButton value="DAILY">{tr('일할')}</ToggleButton>
            </ToggleButtonGroup>
          </Stack>
          {calc.isError && <Alert severity="error">{errorMessage(calc.error)}</Alert>}
          {calc.data && (
            <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'background.default' }}>
              <Typography variant="subtitle2">{tr('계산 환불액 {0}', { 0: won(calc.data.refundAmount) })}</Typography>
              {calc.data.lines.map((l, i) => <Typography key={i} variant="caption" component="div" color="text.secondary">· {l}</Typography>)}
            </Paper>
          )}
          <Stack direction="row" spacing={1}>
            <TextField size="small" label={tr('실제 환불액(원)')} value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))} helperText={tr('계산값과 다르게 돌려준 경우 고쳐 적으세요')} />
            <TextField select size="small" label={tr('환불 수단')} value={payMethod} onChange={(e) => setPayMethod(e.target.value as PayMethod)} sx={{ minWidth: 120 }}>
              {(Object.keys(PAY_METHOD) as PayMethod[]).map((m) => <MenuItem key={m} value={m}>{tr(PAY_METHOD[m])}</MenuItem>)}
            </TextField>
          </Stack>
          <TextField size="small" label={tr('메모 (선택)')} value={note} onChange={(e) => setNote(e.target.value)} slotProps={{ htmlInput: { maxLength: 300 } }} />
          <Stack direction="row" spacing={1} alignItems="center">
            <FormControlLabel control={<Switch checked={withdraw} onChange={(e) => setWithdraw(e.target.checked)} />} label={tr('퇴원일로 원생 퇴원 처리')} />
            {withdraw && (
              <TextField select size="small" label={tr('퇴원 사유')} value={reason} onChange={(e) => setReason(e.target.value as WithdrawalReason)} sx={{ minWidth: 140 }}>
                {(Object.keys(WITHDRAWAL_REASON) as WithdrawalReason[]).map((r) => <MenuItem key={r} value={r}>{tr(WITHDRAWAL_REASON[r])}</MenuItem>)}
              </TextField>
            )}
          </Stack>
          <Alert severity="info">{tr('송금은 직접 해 주세요. 여기서는 환불액 계산과 처리 기록만 남깁니다(앱 결제 연동 전).')}</Alert>
          {save.isError && <Alert severity="error">{errorMessage(save.error)}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{tr('취소')}</Button>
        <Button variant="contained" disabled={!calc.data || amount === '' || save.isPending} onClick={() => save.mutate()}>{tr('환불 기록')}</Button>
      </DialogActions>
    </Dialog>
  );
}

export function RefundListDialog({ month, onClose }: { month: string; onClose: () => void }) {
  const tr = useT();
  const q = useQuery({ queryKey: ['refunds', month], queryFn: () => api.get<Refund[]>('refunds', { month }) });
  const total = (q.data ?? []).reduce((a, r) => a + r.refundAmount, 0);
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{dayjs(`${month}-01`).format(tr('YYYY년 M월'))}{' '}{tr('환불 내역')}</DialogTitle>
      <DialogContent>
        {q.isError && <Alert severity="error">{errorMessage(q.error)}</Alert>}
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow><TableCell>{tr('환불일')}</TableCell><TableCell>{tr('원생')}</TableCell><TableCell>{tr('청구')}</TableCell><TableCell>{tr('방식')}</TableCell><TableCell align="right">{tr('납부')}</TableCell><TableCell align="right">{tr('계산')}</TableCell><TableCell align="right">{tr('환불')}</TableCell><TableCell>{tr('수단')}</TableCell><TableCell>{tr('처리')}</TableCell></TableRow>
            </TableHead>
            <TableBody>
              {(q.data ?? []).map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{dayjs(r.refundedOn).format('M/D')}</TableCell>
                  <TableCell>{r.studentName}</TableCell>
                  <TableCell>{r.invoiceTitle}</TableCell>
                  <TableCell>{r.method === 'LAW' ? tr('학원법') : tr('일할')}</TableCell>
                  <TableCell align="right">{won(r.paidAmount)}</TableCell>
                  <TableCell align="right">{won(r.calculatedAmount)}</TableCell>
                  <TableCell align="right">{won(r.refundAmount)}</TableCell>
                  <TableCell>{tr(PAY_METHOD[r.payMethod])}</TableCell>
                  <TableCell>{r.createdByName}</TableCell>
                </TableRow>
              ))}
              {q.data?.length === 0 && <TableRow><TableCell colSpan={9} align="center" sx={{ py: 3, color: 'text.secondary' }}>{tr('이 달 환불 기록이 없습니다')}</TableCell></TableRow>}
            </TableBody>
          </Table>
        </Box>
      </DialogContent>
      <DialogActions>
        <Typography variant="caption" sx={{ flex: 1, pl: 2 }}>{tr('합계 {0}', { 0: won(total) })}</Typography>
        <Button onClick={onClose}>{tr('닫기')}</Button>
      </DialogActions>
    </Dialog>
  );
}
