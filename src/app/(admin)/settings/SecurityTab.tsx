'use client';

import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import dayjs from 'dayjs';
import QRCode from 'qrcode';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import { useSession } from '@/lib/session';
import { useT } from '@/lib/i18n';

interface OtpStatus { enabled: boolean; enabledAt: string | null; recoveryCodesLeft: number }

const IDLE_OPTIONS = [0, 10, 15, 30, 60, 120, 240];

function RecoveryCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const t = useT();
  return (
    <Alert severity="warning" sx={{ '& .MuiAlert-message': { width: '100%' } }}>
      <Typography variant="subtitle2" gutterBottom>{t('복구 코드 — 지금 한 번만 보입니다')}</Typography>
      <Typography variant="body2" sx={{ mb: 1 }}>{t('휴대폰을 잃어버렸을 때 인증 코드 대신 쓸 수 있습니다. 각 코드는 한 번만 쓸 수 있으니 안전한 곳에 적어 두세요.')}</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, max-content)', gap: 1, fontFamily: 'monospace', fontSize: 15, mb: 1 }}>
        {codes.map((c) => <span key={c}>{c}</span>)}
      </Box>
      <Stack direction="row" spacing={1}>
        <Button size="small" onClick={() => void navigator.clipboard?.writeText(codes.join('\n'))}>{t('복사')}</Button>
        <Button size="small" variant="contained" onClick={onDone}>{t('적어 두었습니다')}</Button>
      </Stack>
    </Alert>
  );
}

/** AUTH-007 2단계 인증 (내 계정) */
function OtpSection() {
  const t = useT();
  const qc = useQueryClient();
  const status = useQuery({ queryKey: ['me', 'otp'], queryFn: () => api.get<OtpStatus>('me/otp') });
  const [setup, setSetup] = useState<{ secret: string; otpauthUri: string } | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [codes, setCodes] = useState<string[] | null>(null);
  const [mode, setMode] = useState<'idle' | 'disable' | 'regen'>('idle');

  useEffect(() => {
    if (!setup) return setQr(null);
    void QRCode.toDataURL(setup.otpauthUri, { width: 200, margin: 1 }).then(setQr);
  }, [setup]);

  const refresh = () => void qc.invalidateQueries({ queryKey: ['me', 'otp'] });
  const start = useMutation({ mutationFn: () => api.post<{ secret: string; otpauthUri: string }>('me/otp/setup'), onSuccess: (s) => { setSetup(s); setCode(''); } });
  const enable = useMutation({
    mutationFn: () => api.post<{ recoveryCodes: string[] }>('me/otp/enable', { code: code.trim() }),
    onSuccess: (r) => { setCodes(r.recoveryCodes); setSetup(null); setCode(''); refresh(); },
  });
  const disable = useMutation({
    mutationFn: () => api.post('me/otp/disable', { password, code: code.trim() }),
    onSuccess: () => { setMode('idle'); setPassword(''); setCode(''); refresh(); },
  });
  const regen = useMutation({
    mutationFn: () => api.post<{ recoveryCodes: string[] }>('me/otp/recovery-codes', { code: code.trim() }),
    onSuccess: (r) => { setCodes(r.recoveryCodes); setMode('idle'); setCode(''); refresh(); },
  });
  const err = status.error ?? start.error ?? enable.error ?? disable.error ?? regen.error;
  const s = status.data;

  return (
    <Paper variant="outlined" sx={{ px: 3, py: 2.5 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <Typography variant="h4" component="h3">{t('2단계 인증')}</Typography>
        {s && <Chip size="small" color={s.enabled ? 'success' : 'default'} label={s.enabled ? t('사용 중') : t('꺼짐')} />}
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t('로그인할 때 비밀번호와 함께 휴대폰 인증 앱(Google Authenticator, Microsoft Authenticator 등)의 6자리 코드를 입력합니다. 비밀번호가 새도 계정을 지킬 수 있어 원장·실장 계정에 권장합니다.')}
      </Typography>
      {err && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage(err)}</Alert>}
      {codes && <Box sx={{ mb: 2 }}><RecoveryCodes codes={codes} onDone={() => setCodes(null)} /></Box>}

      {s && !s.enabled && !setup && <Button variant="contained" onClick={() => start.mutate()} disabled={start.isPending}>{t('2단계 인증 켜기')}</Button>}

      {setup && (
        <Stack spacing={2}>
          <Typography variant="body2">{t('1. 인증 앱에서 아래 QR 코드를 찍으세요. 찍을 수 없으면 키를 직접 입력합니다.')}</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
            {qr && <Box component="img" src={qr} alt={t('2단계 인증 QR 코드')} sx={{ width: 180, height: 180, border: 1, borderColor: 'divider', borderRadius: 1 }} />}
            <Box>
              <Typography variant="caption" color="text.secondary">{t('직접 입력할 키')}</Typography>
              <Typography sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{setup.secret.replace(/(.{4})/g, '$1 ').trim()}</Typography>
            </Box>
          </Stack>
          <Typography variant="body2">{t('2. 앱에 표시된 6자리 숫자를 입력하세요.')}</Typography>
          <Stack direction="row" spacing={1}>
            <TextField size="small" label={t('인증 코드')} value={code} onChange={(e) => setCode(e.target.value)} inputProps={{ inputMode: 'numeric', maxLength: 6 }} />
            <Button variant="contained" disabled={code.trim().length !== 6 || enable.isPending} onClick={() => enable.mutate()}>{t('확인하고 켜기')}</Button>
            <Button onClick={() => setSetup(null)}>{t('취소')}</Button>
          </Stack>
        </Stack>
      )}

      {s?.enabled && mode === 'idle' && (
        <Stack spacing={1}>
          <Typography variant="body2">
            {s.enabledAt && t('{0}부터 사용 중 · ', { 0: dayjs(s.enabledAt).format('YYYY-MM-DD') })}{t('남은 복구 코드 {0}개', { 0: s.recoveryCodesLeft })}
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={() => { setMode('regen'); setCode(''); }}>{t('복구 코드 다시 만들기')}</Button>
            <Button color="error" onClick={() => { setMode('disable'); setCode(''); setPassword(''); }}>{t('2단계 인증 끄기')}</Button>
          </Stack>
        </Stack>
      )}
      {s?.enabled && mode === 'regen' && (
        <Stack direction="row" spacing={1}>
          <TextField size="small" label={t('인증 코드')} value={code} onChange={(e) => setCode(e.target.value)} />
          <Button variant="contained" disabled={code.trim().length !== 6 || regen.isPending} onClick={() => regen.mutate()}>{t('새로 만들기')}</Button>
          <Button onClick={() => setMode('idle')}>{t('취소')}</Button>
        </Stack>
      )}
      {s?.enabled && mode === 'disable' && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <TextField size="small" type="password" label={t('비밀번호')} value={password} onChange={(e) => setPassword(e.target.value)} />
          <TextField size="small" label={t('인증 코드 또는 복구 코드')} value={code} onChange={(e) => setCode(e.target.value)} />
          <Button color="error" variant="contained" disabled={!password || code.trim().length < 6 || disable.isPending} onClick={() => disable.mutate()}>{t('끄기')}</Button>
          <Button onClick={() => setMode('idle')}>{t('취소')}</Button>
        </Stack>
      )}
    </Paper>
  );
}

/** AUTH-010 자동 로그아웃 (기관 설정) */
function IdleSection() {
  const t = useT();
  const qc = useQueryClient();
  const { session, manager } = useSession();
  const instId = session?.institution?.institutionId;
  const q = useQuery({ queryKey: ['session-policy', instId], queryFn: () => api.get<{ idleMinutes: number }>('institution/session-policy'), enabled: !!instId });
  const save = useMutation({
    mutationFn: (idleMinutes: number) => api.put<{ idleMinutes: number }>('institution/session-policy', { idleMinutes }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['session-policy'] }),
  });
  const value = q.data?.idleMinutes;
  return (
    <Paper variant="outlined" sx={{ px: 3, py: 2.5 }}>
      <Typography variant="h4" component="h3" sx={{ mb: 1 }}>{t('자동 로그아웃')}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t('관리자 웹을 이 시간 동안 쓰지 않으면 자동으로 로그아웃합니다(1분 전에 안내). 기관의 모든 교직원에게 적용되며, &quot;자동 로그인&quot;을 켠 경우에도 적용됩니다.')}
      </Typography>
      {(q.isError || save.isError) && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage(q.error ?? save.error)}</Alert>}
      <TextField
        select size="small" label={t('미사용 시간')} sx={{ minWidth: 200 }} value={value ?? ''} disabled={!manager || value === undefined || save.isPending}
        onChange={(e) => save.mutate(Number(e.target.value))}
        helperText={manager ? ' ' : t('원장·실장만 바꿀 수 있습니다')}
      >
        {[...new Set([...IDLE_OPTIONS, ...(value !== undefined ? [value] : [])])].sort((a, b) => a - b).map((m) => (
          <MenuItem key={m} value={m}>{m === 0 ? t('사용 안 함') : m >= 60 ? t('{0}시간', { 0: m / 60 }) : t('{0}분', { 0: m })}</MenuItem>
        ))}
      </TextField>
      {save.isSuccess && <Alert severity="success" sx={{ mt: 1 }} onClose={() => save.reset()}>{t('저장했습니다. 다른 교직원은 다음 페이지 이동 때부터 적용됩니다.')}</Alert>}
    </Paper>
  );
}

/** 설정 > 보안 (AUTH-007 · AUTH-010) */
export default function SecurityTab() {
  return (
    <Stack spacing={2} sx={{ maxWidth: 760 }}>
      <OtpSection />
      <IdleSection />
    </Stack>
  );
}
