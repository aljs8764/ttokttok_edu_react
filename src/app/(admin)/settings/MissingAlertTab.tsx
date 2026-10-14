'use client';

import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import { useSession } from '@/lib/session';
import { useT } from '@/lib/i18n';

interface Policy { minutes: number; notifyParent: boolean }

const OPTIONS = [0, 10, 15, 20, 30, 45, 60, 90, 120, 180];

/** ATT-010 미등원 초과 경고 설정 */
export default function MissingAlertTab() {
  const t = useT();
  const { role } = useSession();
  const manager = role === 'OWNER' || role === 'ADMIN';
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['missing-alert-policy'], queryFn: () => api.get<Policy>('institution/missing-alert') });
  const [form, setForm] = useState<Policy | null>(null);
  useEffect(() => { if (q.data) setForm(q.data); }, [q.data]);

  const save = useMutation({
    mutationFn: (p: Policy) => api.put<Policy>('institution/missing-alert', p),
    onSuccess: (p) => qc.setQueryData(['missing-alert-policy'], p),
  });
  const dirty = !!form && !!q.data && (form.minutes !== q.data.minutes || form.notifyParent !== q.data.notifyParent);
  const err = q.error ?? save.error;

  return (
    <Paper variant="outlined" sx={{ px: 3, py: 2.5, maxWidth: 640 }}>
      <Typography variant="h4" component="h3" gutterBottom>{t('미등원 초과 경고')}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t('수업 시작 후 정한 시간이 지나도 등원 기록이 없으면 원장·실장과 담당 교사에게 알림을 보냅니다. 결석 신청한 원생은 빼고, 지각 신청이 있으면 예상 등원 시각을 기준으로 늦춰 보냅니다. 다른 기관에서 같은 날 하원한 기록이 있으면(다기관 아이) 어디서 몇 시에 하원했는지도 함께 알려 드립니다.')}
      </Typography>
      {err && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage(err)}</Alert>}
      {save.isSuccess && !dirty && <Alert severity="success" sx={{ mb: 2 }}>{t('저장했습니다.')}</Alert>}
      {form && (
        <Stack spacing={2}>
          <TextField
            select label={t('경고 기준')} value={form.minutes} disabled={!manager} sx={{ maxWidth: 280 }}
            onChange={(e) => setForm({ ...form, minutes: Number(e.target.value) })}
            helperText={t('수업 시작 시각 기준')}
          >
            {OPTIONS.map((m) => <MenuItem key={m} value={m}>{m === 0 ? t('사용 안 함') : t('시작 {0}분 후', { 0: m })}</MenuItem>)}
          </TextField>
          <FormControlLabel
            control={<Switch checked={form.notifyParent} disabled={!manager || form.minutes === 0} onChange={(e) => setForm({ ...form, notifyParent: e.target.checked })} />}
            label={t('보호자에게도 알림 보내기')}
          />
          {manager ? (
            <div>
              <Button variant="contained" disabled={!dirty || save.isPending} onClick={() => save.mutate(form)}>{t('저장')}</Button>
            </div>
          ) : (
            <Typography variant="caption" color="text.secondary">{t('설정 변경은 원장·실장만 할 수 있습니다.')}</Typography>
          )}
        </Stack>
      )}
    </Paper>
  );
}
