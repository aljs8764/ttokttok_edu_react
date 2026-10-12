'use client';

import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import LinearProgress from '@mui/material/LinearProgress';
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
import { SUBSCRIPTION_STATUS, won, type Plan, type Subscription, type SubscriptionPayment } from '@/lib/billing';
import { percent } from '@/lib/format';
import { useSession } from '@/lib/session';
import { useT } from '@/lib/i18n';

/** SET-003 SaaS 구독 관리 — 플랜 조회·변경, 카드 표시 정보, 결제 내역. 플랜·카드 변경은 원장만 */
export default function SubscriptionTab() {
  const t = useT();
  const qc = useQueryClient();
  const { session, role } = useSession();
  const instId = session?.institution?.institutionId;
  const owner = role === 'OWNER';
  const [cardOpen, setCardOpen] = useState(false);

  const sub = useQuery({ queryKey: ['subscription', instId], queryFn: () => api.get<Subscription>('subscription'), enabled: !!instId });
  const plans = useQuery({ queryKey: ['subscription-plans', instId], queryFn: () => api.get<Plan[]>('subscription/plans'), enabled: !!instId });
  const pays = useQuery({ queryKey: ['subscription-payments', instId], queryFn: () => api.get<SubscriptionPayment[]>('subscription/payments'), enabled: !!instId });
  const done = (data: Subscription) => (qc.setQueryData(['subscription', instId], data), qc.invalidateQueries({ queryKey: ['dashboard', 'billing'] }));
  const change = useMutation({ mutationFn: (code: string) => api.put<Subscription>('subscription/plan', { planCode: code }), onSuccess: done });
  const cancel = useMutation({ mutationFn: (c: boolean) => api.put<Subscription>('subscription/cancel', { cancel: c }), onSuccess: done });

  const s = sub.data;
  const st = s ? SUBSCRIPTION_STATUS[s.status] : null;

  return (
    <Stack spacing={3} sx={{ maxWidth: 900 }}>
      <Alert severity="info">
        {t('앱 결제(PG)는 연동 전입니다. 플랜을 바꾸면 즉시 반영되고 실제 청구는 운영팀이 별도로 진행합니다. 카드 정보는 카드사와 끝 4자리만 표시용으로 저장하며 카드 번호는 받지 않습니다.')}
      </Alert>
      {(sub.isError || change.isError || cancel.isError) && <Alert severity="error">{errorMessage(sub.error ?? change.error ?? cancel.error)}</Alert>}
      {sub.isFetching && <LinearProgress />}
      {s && (
        <Paper sx={{ p: 2.5 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="h3">{t('{0} 플랜', { 0: s.plan.name })}</Typography>
            {st && <Chip size="small" label={t(st.label)} color={st.color} />}
            {s.cancelAtPeriodEnd && <Chip size="small" label={t('기간 종료 시 해지 예정')} color="warning" />}
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {s.plan.monthlyPrice === null ? t('별도 협의') : t('월 {0}', { 0: won(s.plan.monthlyPrice) })}
            {s.status === 'TRIAL' && s.trialEndsOn ? t(' · 체험 종료 {0}', { 0: dayjs(s.trialEndsOn).format('YYYY.M.D') }) : s.nextBillingDate ? t(' · 다음 결제 {0}', { 0: dayjs(s.nextBillingDate).format('YYYY.M.D') }) : ''}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1.5 }}>
            {t('원생 {0}', { 0: s.studentCount })}{s.studentLimit !== null ? t(' / {0}명 ({1})', { 0: s.studentLimit, 1: percent(s.usagePercent) }) : t('명 (제한 없음)')}
          </Typography>
          {s.usagePercent !== null && <LinearProgress variant="determinate" value={Math.min(100, s.usagePercent)} color={s.usagePercent >= 90 ? 'warning' : 'primary'} sx={{ mt: 0.5, height: 6, borderRadius: 3 }} />}
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 2 }}>
            <Typography variant="body2">{t('결제 카드:')}{' '}{s.card ? `${s.card.brand ?? ''} ····${s.card.last4}` : t('등록 안 됨')}</Typography>
            {owner && <Button size="small" onClick={() => setCardOpen(true)}>{t('카드 변경')}</Button>}
            <Box sx={{ flex: 1 }} />
            {owner && s.status === 'ACTIVE' && (
              <FormControlLabel control={<Switch checked={s.cancelAtPeriodEnd} onChange={(e) => cancel.mutate(e.target.checked)} />} label={t('기간 종료 시 해지')} />
            )}
          </Stack>
        </Paper>
      )}

      <Box>
        <Typography variant="h4" sx={{ mb: 1 }}>{t('플랜 변경')}</Typography>
        {!owner && <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{t('플랜 변경은 원장만 할 수 있습니다.')}</Typography>}
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
          {plans.data?.filter((p) => p.code !== 'TRIAL').map((p) => {
            const current = s?.plan.code === p.code;
            return (
              <Card key={p.code} variant="outlined" sx={current ? { borderColor: 'primary.main' } : undefined}>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{p.name}</Typography>
                  <Typography variant="h3" sx={{ my: 0.5 }}>{p.monthlyPrice === null ? t('별도 협의') : t('{0}/월', { 0: won(p.monthlyPrice) })}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ minHeight: 56 }}>{p.description}</Typography>
                  <Button
                    fullWidth sx={{ mt: 1 }} variant={current ? 'outlined' : 'contained'}
                    disabled={!owner || current || p.monthlyPrice === null || change.isPending}
                    onClick={() => confirm(t('{0} 플랜으로 변경할까요?', { 0: p.name })) && change.mutate(p.code)}
                  >
                    {current ? t('이용 중') : p.monthlyPrice === null ? t('문의 필요') : t('이 플랜으로 변경')}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      </Box>

      <Box>
        <Typography variant="h4" sx={{ mb: 1 }}>{t('결제 내역')}</Typography>
        <Paper variant="outlined">
          <Table size="small">
            <TableHead><TableRow><TableCell>{t('기간')}</TableCell><TableCell>{t('플랜')}</TableCell><TableCell align="right">{t('금액')}</TableCell><TableCell>{t('상태')}</TableCell></TableRow></TableHead>
            <TableBody>
              {pays.data?.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{dayjs(p.periodStart).format('YY.M.D')} ~ {dayjs(p.periodEnd).format('YY.M.D')}</TableCell>
                  <TableCell>{p.planCode}</TableCell>
                  <TableCell align="right">{won(p.amount)}</TableCell>
                  <TableCell>{p.status === 'PAID' ? t('결제 완료') : p.status === 'REFUNDED' ? t('환불') : t('실패{0}', { 0: p.failureReason ? ` (${p.failureReason})` : '' })}</TableCell>
                </TableRow>
              ))}
              {pays.data?.length === 0 && <TableRow><TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>{t('결제 내역이 없습니다')}</TableCell></TableRow>}
            </TableBody>
          </Table>
        </Paper>
      </Box>
      {cardOpen && <CardDialog onClose={() => setCardOpen(false)} onSaved={(d) => (setCardOpen(false), done(d))} />}
    </Stack>
  );
}

function CardDialog({ onClose, onSaved }: { onClose: () => void; onSaved: (s: Subscription) => void }) {
  const t = useT();
  const [brand, setBrand] = useState('');
  const [last4, setLast4] = useState('');
  const save = useMutation({ mutationFn: () => api.put<Subscription>('subscription/card', { brand: brand.trim(), last4 }), onSuccess: onSaved });
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{t('결제 카드 변경')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {save.isError && <Alert severity="error">{errorMessage(save.error)}</Alert>}
          <TextField label={t('카드사')} value={brand} onChange={(e) => setBrand(e.target.value)} slotProps={{ htmlInput: { maxLength: 20 } }} />
          <TextField label={t('카드 끝 4자리')} value={last4} onChange={(e) => setLast4(e.target.value.replace(/\D/g, '').slice(0, 4))} slotProps={{ htmlInput: { inputMode: 'numeric' } }} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('취소')}</Button>
        <Button variant="contained" disabled={!brand.trim() || last4.length !== 4 || save.isPending} onClick={() => save.mutate()}>{t('저장')}</Button>
      </DialogActions>
    </Dialog>
  );
}
