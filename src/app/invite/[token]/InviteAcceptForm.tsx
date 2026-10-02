'use client';

import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import NextLink from 'next/link';
import { ROLE_LABEL, dateTime } from '@/lib/format';
import type { ApiErrorBody, PublicStaffInvitation } from '@/lib/types';

/**
 * STF-002 초대 수락 (메일 링크 → /invite/{token}).
 * 새 계정이면 비밀번호를 정하고, 같은 이메일 계정이 있으면 기존 비밀번호로 확인해 소속만 추가한다.
 */
export default function InviteAcceptForm({ token }: { token: string }) {
  const [info, setInfo] = useState<PublicStaffInvitation | null>(null);
  const [loadError, setLoadError] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  useEffect(() => {
    fetch(`/api/proxy-public/staff-invitations/${encodeURIComponent(token)}`, { cache: 'no-store' })
      .then(async (res) => {
        if (res.ok) setInfo(await res.json());
        else setLoadError(((await res.json().catch(() => null)) as ApiErrorBody | null)?.message ?? '초대를 찾을 수 없습니다');
      })
      .catch(() => setLoadError('서버에 연결할 수 없습니다'));
  }, [token]);

  const existing = info?.existingAccount ?? false;
  const pwOk = password.length >= 8 && /\d/.test(password) && /[A-Za-z]/.test(password);
  const valid = existing ? password.length > 0 : pwOk && password === confirm;

  const accept = async () => {
    setPending(true);
    setError('');
    const res = await fetch(`/api/auth/staff-invitations/${encodeURIComponent(token)}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, institutionName: info?.institutionName }),
    }).catch(() => null);
    if (!res) {
      setPending(false);
      return setError('서버에 연결할 수 없습니다');
    }
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      setPending(false);
      return setError((body as ApiErrorBody | null)?.message ?? '초대를 수락하지 못했습니다');
    }
    window.location.href = body?.needsInstitution ? '/login?step=institution' : '/dashboard';
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2, bgcolor: 'background.default' }}>
      <Paper sx={{ width: '100%', maxWidth: 420, p: { xs: 3, sm: 4 } }}>
        <Typography variant="h1" sx={{ letterSpacing: -0.5 }}>
          똑똑<Box component="span" sx={{ color: 'secondary.main' }}>.</Box>
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          교직원 초대
        </Typography>

        {!info && !loadError && <CircularProgress size={24} />}
        {loadError && (
          <Stack spacing={2}>
            <Alert severity="warning">{loadError}</Alert>
            <Typography variant="body2" color="text.secondary">
              링크가 만료되었거나 취소되었을 수 있습니다. 원장님께 다시 초대를 요청하세요.
            </Typography>
            <Button component={NextLink} href="/login">
              로그인 화면으로
            </Button>
          </Stack>
        )}

        {info && (
          <Stack
            spacing={2}
            component="form"
            onSubmit={(e) => {
              e.preventDefault();
              if (valid && !pending) void accept();
            }}
          >
            <Typography variant="body1">
              <b>{info.institutionName}</b>에서 {info.name} 님을 <b>{ROLE_LABEL[info.role]}</b>(으)로 초대했습니다.
            </Typography>
            <TextField label="아이디(이메일)" value={info.email} InputProps={{ readOnly: true }} />
            {existing ? (
              <>
                <Alert severity="info">이미 똑똑 계정이 있는 이메일입니다. 기존 비밀번호를 입력하면 이 기관이 추가됩니다.</Alert>
                <TextField label="비밀번호" type="password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
              </>
            ) : (
              <>
                <TextField
                  label="비밀번호 만들기"
                  type="password"
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  error={!!password && !pwOk}
                  helperText="영문·숫자 포함 8자 이상"
                />
                <TextField
                  label="비밀번호 확인"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  error={!!confirm && confirm !== password}
                  helperText={confirm && confirm !== password ? '비밀번호가 다릅니다' : ' '}
                />
              </>
            )}
            {error && <Alert severity="error">{error}</Alert>}
            <Button type="submit" variant="contained" size="large" disabled={!valid || pending}>
              초대 수락하고 시작하기
            </Button>
            <Typography variant="caption" color="text.secondary" align="center">
              {dateTime(info.expiresAt)} 까지 유효한 링크입니다
            </Typography>
          </Stack>
        )}
      </Paper>
    </Box>
  );
}
