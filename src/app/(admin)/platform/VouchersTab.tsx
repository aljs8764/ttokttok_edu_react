'use client';

import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
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
import type { PlatformInstitution, Voucher, VoucherSettlement } from '@/lib/platform';
import { useT } from '@/lib/i18n';

const EMPTY = { institutionId: '', voucherCode: '', supportRatio: '80', status: 'ACTIVE', startedOn: '', endedOn: '', memo: '' };

/** SAAS-003 K-비대면 바우처 등록·정산 */
export default function VouchersTab() {
  const t = useT();
  const qc = useQueryClient();
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'));
  const [form, setForm] = useState<typeof EMPTY | null>(null);
  const vouchers = useQuery({ queryKey: ['platform', 'vouchers'], queryFn: () => api.get<Voucher[]>('platform/vouchers') });
  const settlements = useQuery({ queryKey: ['platform', 'settlements', month], queryFn: () => api.get<VoucherSettlement[]>('platform/voucher-settlements', { month }) });
  const institutions = useQuery({ queryKey: ['platform', 'institutions', '', ''], queryFn: () => api.get<PlatformInstitution[]>('platform/institutions'), enabled: !!form });
  const refresh = () => { void qc.invalidateQueries({ queryKey: ['platform'] }); };
  const save = useMutation({
    mutationFn: (f: typeof EMPTY) => api.put(`platform/institutions/${f.institutionId}/voucher`, {
      voucherCode: f.voucherCode, supportRatio: Number(f.supportRatio), status: f.status,
      startedOn: f.startedOn || null, endedOn: f.endedOn || null, memo: f.memo || null,
    }),
    onSuccess: () => { setForm(null); refresh(); },
  });
  const remove = useMutation({ mutationFn: (id: string) => api.delete(`platform/institutions/${id}/voucher`), onSuccess: refresh });
  const generate = useMutation({ mutationFn: () => api.post<{ created: number }>(`platform/voucher-settlements/generate?month=${month}`), onSuccess: refresh });
  const settle = useMutation({ mutationFn: (id: string) => api.post(`platform/voucher-settlements/${id}/settle`, {}), onSuccess: refresh });
  const err = vouchers.error ?? settlements.error ?? save.error ?? remove.error ?? generate.error ?? settle.error;

  return (
    <Stack spacing={3}>
      {err && <Alert severity="error">{errorMessage(err)}</Alert>}
      <div>
        <Stack direction="row" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="h3" sx={{ flex: 1 }}>{t('바우처 등록 기관')}</Typography>
          <Button variant="contained" onClick={() => setForm(EMPTY)}>{t('바우처 등록')}</Button>
        </Stack>
        <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead><TableRow><TableCell>{t('기관')}</TableCell><TableCell>{t('바우처 코드')}</TableCell><TableCell align="right">{t('지원 비율')}</TableCell><TableCell>{t('상태')}</TableCell><TableCell>{t('기간')}</TableCell><TableCell align="right">{t('처리')}</TableCell></TableRow></TableHead>
            <TableBody>
              {vouchers.data?.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>{v.institutionName}</TableCell>
                  <TableCell>{v.voucherCode}</TableCell>
                  <TableCell align="right">{v.supportRatio}%</TableCell>
                  <TableCell><Chip size="small" color={v.status === 'ACTIVE' ? 'success' : 'default'} label={v.status === 'ACTIVE' ? t('적용 중') : t('종료')} /></TableCell>
                  <TableCell>{v.startedOn ?? '-'} ~ {v.endedOn ?? ''}</TableCell>
                  <TableCell align="right">
                    <Button size="small" onClick={() => setForm({ institutionId: v.institutionId, voucherCode: v.voucherCode, supportRatio: String(v.supportRatio), status: v.status, startedOn: v.startedOn ?? '', endedOn: v.endedOn ?? '', memo: v.memo ?? '' })}>{t('수정')}</Button>
                    <Button size="small" color="error" onClick={() => window.confirm(t('바우처 등록을 삭제할까요?')) && remove.mutate(v.institutionId)}>{t('삭제')}</Button>
                  </TableCell>
                </TableRow>
              ))}
              {vouchers.data?.length === 0 && <TableRow><TableCell colSpan={6} align="center">{t('등록된 바우처가 없습니다')}</TableCell></TableRow>}
            </TableBody>
          </Table>
        </Paper>
      </div>

      <div>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="h3" sx={{ flex: 1 }}>{t('월별 정산')}</Typography>
          <TextField size="small" type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
          <Button variant="outlined" disabled={generate.isPending} onClick={() => generate.mutate()}>{t('정산 대상 생성')}</Button>
        </Stack>
        {generate.isSuccess && <Alert severity="success" sx={{ mb: 1 }} onClose={() => generate.reset()}>{t('{0}건을 새로 만들었습니다', { 0: generate.data.created })}</Alert>}
        <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead><TableRow><TableCell>{t('기관')}</TableCell><TableCell align="right">{t('청구액')}</TableCell><TableCell align="right">{t('정부 지원분')}</TableCell><TableCell>{t('상태')}</TableCell><TableCell align="right">{t('처리')}</TableCell></TableRow></TableHead>
            <TableBody>
              {settlements.data?.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.institutionName}</TableCell>
                  <TableCell align="right">{won(s.billedAmount)}</TableCell>
                  <TableCell align="right">{won(s.supportAmount)}</TableCell>
                  <TableCell>{s.status === 'SETTLED' ? <Chip size="small" color="success" label={t('정산 {0}', { 0: s.settledOn ?? '' })} /> : <Chip size="small" color="warning" label={t('정산 대기')} />}</TableCell>
                  <TableCell align="right">{s.status === 'PENDING' && <Button size="small" onClick={() => settle.mutate(s.id)}>{t('정산 완료')}</Button>}</TableCell>
                </TableRow>
              ))}
              {settlements.data?.length === 0 && <TableRow><TableCell colSpan={5} align="center">{t('{0} 정산 대상이 없습니다', { 0: month })}</TableCell></TableRow>}
            </TableBody>
          </Table>
        </Paper>
      </div>

      <Dialog open={!!form} onClose={() => setForm(null)} fullWidth maxWidth="xs">
        <DialogTitle>{t('바우처 등록')}</DialogTitle>
        <DialogContent>
          {form && (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField select size="small" label={t('기관')} value={form.institutionId} onChange={(e) => setForm({ ...form, institutionId: e.target.value })}>
                {institutions.data?.map((i) => <MenuItem key={i.id} value={i.id}>{i.name}</MenuItem>)}
              </TextField>
              <TextField size="small" label={t('바우처 코드')} value={form.voucherCode} onChange={(e) => setForm({ ...form, voucherCode: e.target.value })} />
              <TextField size="small" label={t('지원 비율(%)')} value={form.supportRatio} onChange={(e) => setForm({ ...form, supportRatio: e.target.value.replace(/\D/g, '') })} />
              <TextField select size="small" label={t('상태')} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <MenuItem value="ACTIVE">{t('적용 중')}</MenuItem><MenuItem value="ENDED">{t('종료')}</MenuItem>
              </TextField>
              <Stack direction="row" spacing={1}>
                <TextField size="small" type="date" label={t('시작일')} value={form.startedOn} onChange={(e) => setForm({ ...form, startedOn: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
                <TextField size="small" type="date" label={t('종료일')} value={form.endedOn} onChange={(e) => setForm({ ...form, endedOn: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
              </Stack>
              <TextField size="small" label={t('메모')} value={form.memo} onChange={(e) => setForm({ ...form, memo: e.target.value })} />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setForm(null)}>{t('취소')}</Button>
          <Button variant="contained" disabled={!form?.institutionId || !form.voucherCode.trim() || save.isPending} onClick={() => form && save.mutate(form)}>{t('저장')}</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
