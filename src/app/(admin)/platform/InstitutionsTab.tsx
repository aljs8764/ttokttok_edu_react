'use client';

import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
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
import { won } from '@/lib/billing';
import { PAYMENT_STATUS, SERVICE_STATUS, type OwnerInvitation, type PlatformInstitution, type PlatformInstitutionDetail, type ServiceStatus } from '@/lib/platform';
import { INSTITUTION_TYPE_LABEL, type InstitutionType } from '@/lib/types';
import type { MenuGroup } from '@/lib/menus';
import { useT } from '@/lib/i18n';

const SUB_STATUS = ['TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED'];
const PLANS = ['TRIAL', 'BASIC', 'PRO', 'ENTERPRISE'];
const OWNER_INVITE_STATUS: Record<OwnerInvitation['status'], { label: string; color: 'warning' | 'success' | 'default' }> = {
  PENDING: { label: '수락 대기', color: 'warning' },
  ACCEPTED: { label: '수락', color: 'success' },
  REVOKED: { label: '취소', color: 'default' },
  EXPIRED: { label: '만료', color: 'default' },
};

/** 운영사가 기관을 직접 등록하고 원장에게 초대 메일을 보낸다. 원장은 메일 링크에서 비밀번호를 정하면 바로 쓸 수 있다 */
function CreateDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const t = useT();
  const qc = useQueryClient();
  const [form, setForm] = useState({ institutionName: '', type: 'ACADEMY' as InstitutionType, ownerName: '', ownerEmail: '' });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });
  const create = useMutation({
    mutationFn: () => api.post<PlatformInstitutionDetail>('platform/institutions', {
      institutionName: form.institutionName.trim(), type: form.type, ownerName: form.ownerName.trim(), ownerEmail: form.ownerEmail.trim(),
    }),
    onSuccess: (d) => { void qc.invalidateQueries({ queryKey: ['platform'] }); onCreated(d.id); },
  });
  const ready = form.institutionName.trim() && form.ownerName.trim() && form.ownerEmail.trim();
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{t('기관 추가')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {create.error && <Alert severity="error">{errorMessage(create.error)}</Alert>}
          <TextField size="small" label={t('기관명')} value={form.institutionName} onChange={set('institutionName')} inputProps={{ maxLength: 100 }} required autoFocus />
          <TextField select size="small" label={t('기관 종류')} value={form.type} onChange={set('type')}>
            {(Object.keys(INSTITUTION_TYPE_LABEL) as InstitutionType[]).map((k) => <MenuItem key={k} value={k}>{t(INSTITUTION_TYPE_LABEL[k])}</MenuItem>)}
          </TextField>
          <TextField size="small" label={t('원장 이름')} value={form.ownerName} onChange={set('ownerName')} inputProps={{ maxLength: 50 }} required />
          <TextField size="small" type="email" label={t('원장 이메일')} value={form.ownerEmail} onChange={set('ownerEmail')} required helperText={t('이 주소로 원장 계정 초대 메일을 보냅니다 (7일 유효)')} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('취소')}</Button>
        <Button variant="contained" disabled={!ready || create.isPending} onClick={() => create.mutate()}>{t('추가하고 초대 보내기')}</Button>
      </DialogActions>
    </Dialog>
  );
}

function Detail({ id, onClose }: { id: string; onClose: () => void }) {
  const t = useT();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['platform', 'institution', id], queryFn: () => api.get<PlatformInstitutionDetail>(`platform/institutions/${id}`) });
  const refresh = () => { void qc.invalidateQueries({ queryKey: ['platform'] }); };
  const [reason, setReason] = useState('');
  const [plan, setPlan] = useState('');
  const [subStatus, setSubStatus] = useState('');
  const [next, setNext] = useState('');
  const [payOpen, setPayOpen] = useState(false);
  const [pay, setPay] = useState({ planCode: 'BASIC', amount: '49000', paid: true, periodStart: dayjs().format('YYYY-MM-DD'), periodEnd: dayjs().add(1, 'month').subtract(1, 'day').format('YYYY-MM-DD'), failureReason: '' });

  const approve = useMutation({ mutationFn: () => api.post(`platform/institutions/${id}/approve`), onSuccess: refresh });
  const resend = useMutation({ mutationFn: () => api.post(`platform/institutions/${id}/owner-invitation`), onSuccess: refresh });
  const groups = useQuery({ queryKey: ['platform', 'menu-groups'], queryFn: () => api.get<MenuGroup[]>('platform/menu-groups') });
  const assignGroup = useMutation({
    mutationFn: (menuGroupId: string | null) => api.put(`platform/institutions/${id}/menu-group`, { menuGroupId }),
    onSuccess: refresh,
  });
  const suspend = useMutation({ mutationFn: () => api.post(`platform/institutions/${id}/suspend`, { reason }), onSuccess: () => { setReason(''); refresh(); } });
  const override = useMutation({
    mutationFn: () => api.put(`platform/institutions/${id}/subscription`, { planCode: plan || d!.planCode, status: subStatus || d!.subscriptionStatus, nextBillingDate: next || null }),
    onSuccess: refresh,
  });
  const record = useMutation({
    mutationFn: () => api.post(`platform/institutions/${id}/payments`, { ...pay, amount: Number(pay.amount), failureReason: pay.paid ? null : pay.failureReason || null }),
    onSuccess: () => { setPayOpen(false); refresh(); },
  });
  const d = q.data;
  const err = approve.error ?? resend.error ?? assignGroup.error ?? suspend.error ?? override.error ?? record.error ?? q.error;

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{d?.name ?? t('기관')}</DialogTitle>
      <DialogContent>
        {err && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage(err)}</Alert>}
        {d && (
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Chip size="small" color={SERVICE_STATUS[d.serviceStatus].color} label={t(SERVICE_STATUS[d.serviceStatus].label)} />
              <Typography variant="body2">{t('대표 {0} · 교직원 {1}명 · 원생 {2}명', { 0: d.ownerName, 1: d.staffCount, 2: d.studentCount })}</Typography>
            </Stack>
            {d.statusReason && <Alert severity="warning">{t('정지 사유: {0}', { 0: d.statusReason })}</Alert>}
            {d.ownerInvitation && (
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Typography variant="body2">{t('원장 초대: {0} ({1})', { 0: d.ownerInvitation.name, 1: d.ownerInvitation.email })}</Typography>
                <Chip size="small" color={OWNER_INVITE_STATUS[d.ownerInvitation.status].color} label={t(OWNER_INVITE_STATUS[d.ownerInvitation.status].label)} />
                {d.ownerInvitation.status === 'PENDING' && (
                  <Typography variant="caption" color="text.secondary">{t('{0}까지 유효', { 0: dayjs(d.ownerInvitation.expiresAt).format('YYYY-MM-DD HH:mm') })}</Typography>
                )}
                {d.ownerInvitation.status !== 'ACCEPTED' && (
                  <Button size="small" disabled={resend.isPending} onClick={() => resend.mutate()}>{t('초대 다시 보내기')}</Button>
                )}
              </Stack>
            )}
            <Typography variant="body2">
              {t('구독: {0} / {1}', { 0: d.planCode ?? '-', 1: d.subscriptionStatus ?? '-' })}
              {d.nextBillingDate && t(' · 다음 결제일 {0}', { 0: d.nextBillingDate })}
              {d.trialEndsOn && t(' · 체험 종료 {0}', { 0: d.trialEndsOn })}
              {d.cancelAtPeriodEnd && t(' · 기간 종료 시 해지 예약')}
              {d.card && t(' · 카드 {0} ****{1}', { 0: d.card.brand ?? '', 1: d.card.last4 })}
            </Typography>
            <Stack direction="row" spacing={1}>
              {d.serviceStatus !== 'ACTIVE' && <Button variant="contained" onClick={() => approve.mutate()}>{d.serviceStatus === 'PENDING' ? t('가입 승인') : t('정지 해제')}</Button>}
            </Stack>
            {d.serviceStatus !== 'SUSPENDED' && (
              <Stack direction="row" spacing={1}>
                <TextField size="small" fullWidth label={t('정지 사유')} value={reason} onChange={(e) => setReason(e.target.value)} />
                <Button color="error" variant="outlined" disabled={!reason.trim()} onClick={() => suspend.mutate()}>{t('정지')}</Button>
              </Stack>
            )}
            <Divider />
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                select size="small" label={t('메뉴 그룹')} value={d.menuGroupId ?? ''} sx={{ minWidth: 220 }}
                disabled={assignGroup.isPending}
                onChange={(e) => assignGroup.mutate(e.target.value || null)}
              >
                <MenuItem value="">{t('모든 메뉴 (그룹 없음)')}</MenuItem>
                {groups.data?.map((g) => <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
              </TextField>
              <Typography variant="caption" color="text.secondary">{t('바꾸면 이 기관의 메뉴에 바로 적용됩니다.')}</Typography>
            </Stack>
            <Divider />
            <Typography variant="subtitle2">{t('구독 직접 변경')}</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <TextField select size="small" label={t('플랜')} value={plan || d.planCode || ''} onChange={(e) => setPlan(e.target.value)} sx={{ minWidth: 130 }}>
                {PLANS.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
              </TextField>
              <TextField select size="small" label={t('상태')} value={subStatus || d.subscriptionStatus || ''} onChange={(e) => setSubStatus(e.target.value)} sx={{ minWidth: 130 }}>
                {SUB_STATUS.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
              </TextField>
              <TextField size="small" type="date" label={t('다음 결제일')} value={next || d.nextBillingDate || ''} onChange={(e) => setNext(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
              <Button variant="outlined" onClick={() => override.mutate()}>{t('적용')}</Button>
            </Stack>
            <Divider />
            <Stack direction="row" alignItems="center">
              <Typography variant="subtitle2" sx={{ flex: 1 }}>{t('최근 결제')}</Typography>
              <Button size="small" onClick={() => setPayOpen(true)}>{t('결제 결과 기록')}</Button>
            </Stack>
            <Table size="small">
              <TableBody>
                {d.recentPayments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.periodStart} ~ {p.periodEnd}</TableCell>
                    <TableCell>{p.planCode}</TableCell>
                    <TableCell align="right">{won(p.amount)}</TableCell>
                    <TableCell><Chip size="small" color={PAYMENT_STATUS[p.status].color} label={t(PAYMENT_STATUS[p.status].label)} /></TableCell>
                  </TableRow>
                ))}
                {d.recentPayments.length === 0 && <TableRow><TableCell colSpan={4} align="center">{t('결제 이력이 없습니다')}</TableCell></TableRow>}
              </TableBody>
            </Table>
          </Stack>
        )}
      </DialogContent>
      <DialogActions><Button onClick={onClose}>{t('닫기')}</Button></DialogActions>

      <Dialog open={payOpen} onClose={() => setPayOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{t('결제 결과 기록')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField select size="small" label={t('플랜')} value={pay.planCode} onChange={(e) => setPay({ ...pay, planCode: e.target.value })}>
              {PLANS.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
            </TextField>
            <TextField size="small" label={t('금액(원)')} value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value.replace(/\D/g, '') })} />
            <Stack direction="row" spacing={1}>
              <TextField size="small" type="date" label={t('이용 시작')} value={pay.periodStart} onChange={(e) => setPay({ ...pay, periodStart: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
              <TextField size="small" type="date" label={t('이용 종료')} value={pay.periodEnd} onChange={(e) => setPay({ ...pay, periodEnd: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
            </Stack>
            <FormControlLabel control={<Switch checked={pay.paid} onChange={(e) => setPay({ ...pay, paid: e.target.checked })} />} label={pay.paid ? t('결제 성공') : t('결제 실패')} />
            {!pay.paid && <TextField size="small" label={t('실패 사유')} value={pay.failureReason} onChange={(e) => setPay({ ...pay, failureReason: e.target.value })} />}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPayOpen(false)}>{t('취소')}</Button>
          <Button variant="contained" disabled={!pay.amount || record.isPending} onClick={() => record.mutate()}>{t('기록')}</Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
}

/** SAAS-001 기관 목록·승인·정지 */
export default function InstitutionsTab() {
  const t = useT();
  const [status, setStatus] = useState<'' | ServiceStatus>('');
  const [kw, setKw] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const q = useQuery({ queryKey: ['platform', 'institutions', status, kw], queryFn: () => api.get<PlatformInstitution[]>('platform/institutions', { status, q: kw }) });
  return (
    <>
      {q.isError && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage(q.error)}</Alert>}
      <Paper sx={{ overflowX: 'auto', pt: 2.5 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} useFlexGap flexWrap="wrap" sx={{ px: 3, pb: 2, position: 'sticky', left: 0 }}>
          <TextField select size="small" label={t('상태')} value={status} onChange={(e) => setStatus(e.target.value as '' | ServiceStatus)} sx={{ minWidth: 130 }}>
            <MenuItem value="">{t('전체')}</MenuItem>
            {(Object.keys(SERVICE_STATUS) as ServiceStatus[]).map((s) => <MenuItem key={s} value={s}>{t(SERVICE_STATUS[s].label)}</MenuItem>)}
          </TextField>
          <TextField size="small" label={t('기관·대표명 검색')} value={kw} onChange={(e) => setKw(e.target.value)} />
          <Button variant="contained" onClick={() => setCreating(true)} sx={{ ml: { sm: 'auto' } }}>{t('기관 추가')}</Button>
        </Stack>
        <Table size="small">
          <TableHead>
            <TableRow><TableCell>{t('기관')}</TableCell><TableCell>{t('대표')}</TableCell><TableCell>{t('상태')}</TableCell><TableCell>{t('플랜')}</TableCell><TableCell align="right">{t('원생')}</TableCell><TableCell>{t('바우처')}</TableCell><TableCell>{t('메뉴 그룹')}</TableCell><TableCell>{t('가입일')}</TableCell></TableRow>
          </TableHead>
          <TableBody>
            {q.data?.map((i) => (
              <TableRow key={i.id} hover sx={{ cursor: 'pointer' }} onClick={() => setOpen(i.id)}>
                <TableCell>{i.name}</TableCell>
                <TableCell>{i.ownerName}</TableCell>
                <TableCell><Chip size="small" color={SERVICE_STATUS[i.serviceStatus].color} label={t(SERVICE_STATUS[i.serviceStatus].label)} /></TableCell>
                <TableCell>{i.planCode ?? '-'} {i.subscriptionStatus && <Typography component="span" variant="caption" color="text.secondary">({i.subscriptionStatus})</Typography>}</TableCell>
                <TableCell align="right">{i.studentCount}</TableCell>
                <TableCell>{i.voucherCode ?? '-'}</TableCell>
                <TableCell>{i.menuGroupName ?? t('모든 메뉴')}</TableCell>
                <TableCell>{dayjs(i.createdAt).format('YYYY-MM-DD')}</TableCell>
              </TableRow>
            ))}
            {q.data?.length === 0 && <TableRow><TableCell colSpan={8} align="center">{t('기관이 없습니다')}</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Paper>
      {open && <Detail id={open} onClose={() => setOpen(null)} />}
      {creating && <CreateDialog onClose={() => setCreating(false)} onCreated={(id) => { setCreating(false); setOpen(id); }} />}
    </>
  );
}
