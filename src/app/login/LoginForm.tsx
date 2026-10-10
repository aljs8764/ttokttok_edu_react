'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import Link from '@mui/material/Link';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { Membership } from '@/lib/types';
import { ROLE_LABEL } from '@/lib/format';
import { useT } from '@/lib/i18n';
import LanguageSwitch from '@/components/LanguageSwitch';

const SAVED_ID = 'ttok.savedLoginId';

/** AUTH-001 관리자 로그인 (아이디 저장 · 자동 로그인) + 여러 기관 소속이면 기관 선택 */
export default function LoginForm() {
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/dashboard';

  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [saveId, setSaveId] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [memberships, setMemberships] = useState<Membership[] | null>(null);
  const [findOpen, setFindOpen] = useState(false);
  // AUTH-007 2단계 인증
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SAVED_ID);
      if (saved) {
        setLoginId(saved);
        setSaveId(true);
      }
    } catch {
      /* 저장소 사용 불가 */
    }
    // 로그인은 했는데 기관을 아직 안 고른 경우
    if (params.get('step') === 'institution') {
      void fetch('/api/auth/session').then(async (r) => {
        if (r.ok) setMemberships((await r.json()).user.memberships);
      });
    }
  }, [params]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginId: loginId.trim(), password, rememberMe }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(res.status === 429 ? '시도가 너무 많습니다. 1분 뒤 다시 시도하세요' : body.message ?? '로그인에 실패했습니다');
        return;
      }
      if (body.otpRequired) {
        setChallengeId(body.challengeId);
        setOtpCode('');
        return;
      }
      afterLogin(body);
    } catch {
      setError('서버에 연결할 수 없습니다');
    } finally {
      setPending(false);
    }
  }

  async function submitOtp(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId, code: otpCode.trim(), rememberMe }),
      });
      const body = await res.json();
      if (!res.ok) {
        // 시간 초과·5회 실패면 처음으로
        if (/처음부터/.test(body.message ?? '')) setChallengeId(null);
        setError(res.status === 429 ? '시도가 너무 많습니다. 1분 뒤 다시 시도하세요' : body.message ?? '인증에 실패했습니다');
        return;
      }
      afterLogin(body);
    } catch {
      setError('서버에 연결할 수 없습니다');
    } finally {
      setPending(false);
    }
  }

  function afterLogin(body: { needsInstitution: boolean; user: { memberships: Membership[] } }) {
    try {
      if (saveId) localStorage.setItem(SAVED_ID, loginId.trim());
      else localStorage.removeItem(SAVED_ID);
    } catch {
      /* 무시 */
    }
    if (body.needsInstitution) setMemberships(body.user.memberships);
    else router.replace(next);
  }

  async function choose(institutionId: string) {
    const res = await fetch('/api/auth/session', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ institutionId }),
    });
    if (res.ok) router.replace(next);
    else setError('기관을 선택할 수 없습니다');
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2, bgcolor: 'background.default' }}>
      <Paper sx={{ width: '100%', maxWidth: 400, p: { xs: 3, sm: 4 } }}>
        <Typography variant="h1" sx={{ letterSpacing: -0.5 }}>
          똑똑<Box component="span" sx={{ color: 'secondary.main' }}>.</Box>
        </Typography>
        <Stack direction="row" alignItems="center" sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
            {t('학원 운영 관리자')}
          </Typography>
          <LanguageSwitch />
        </Stack>

        {memberships ? (
          <>
            <Typography variant="subtitle1" gutterBottom>
              {t('관리할 기관을 선택하세요')}
            </Typography>
            <List disablePadding>
              {memberships.map((m) => (
                <ListItemButton key={m.institutionId} onClick={() => void choose(m.institutionId)} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, mb: 1 }}>
                  <ListItemText primary={m.institutionName} secondary={t(ROLE_LABEL[m.role])} />
                </ListItemButton>
              ))}
            </List>
          </>
        ) : challengeId ? (
          <Box component="form" onSubmit={submitOtp}>
            <Stack spacing={2}>
              <Typography variant="subtitle1">{t('2단계 인증')}</Typography>
              <Typography variant="body2" color="text.secondary">
                {t('인증 앱(Google Authenticator 등)에 표시된 6자리 숫자를 입력하세요. 휴대폰을 잃어버렸다면 복구 코드(XXXXX-XXXXX)를 입력할 수 있습니다.')}
              </Typography>
              <TextField
                label={t('인증 코드')}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                autoComplete="one-time-code"
                inputProps={{ inputMode: 'text', maxLength: 11 }}
                autoFocus
                required
              />
              {error && <Alert severity="error">{t(error)}</Alert>}
              <Button type="submit" variant="contained" size="large" disabled={pending || otpCode.trim().length < 6}>
                {t('확인')}
              </Button>
              <Link component="button" type="button" variant="body2" onClick={() => { setChallengeId(null); setError(null); }} sx={{ alignSelf: 'center' }}>
                {t('처음으로')}
              </Link>
            </Stack>
          </Box>
        ) : (
          <Box component="form" onSubmit={submit}>
            <Stack spacing={2}>
              <TextField label={t('이메일')} value={loginId} onChange={(e) => setLoginId(e.target.value)} autoComplete="username" autoFocus required />
              <TextField label={t('비밀번호')} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <FormControlLabel control={<Checkbox size="small" checked={saveId} onChange={(e) => setSaveId(e.target.checked)} />} label={t('아이디 저장')} />
                  <FormControlLabel control={<Checkbox size="small" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />} label={t('자동 로그인')} />
                </Box>
              </Stack>
              {error && <Alert severity="error">{t(error)}</Alert>}
              <Button type="submit" variant="contained" size="large" disabled={pending || !loginId || !password}>
                {t('로그인')}
              </Button>
              <Link component="button" type="button" variant="body2" onClick={() => setFindOpen(true)} sx={{ alignSelf: 'center' }}>
                {t('비밀번호를 잊으셨나요?')}
              </Link>
            </Stack>
          </Box>
        )}
      </Paper>
      <TempPasswordDialog open={findOpen} onClose={() => setFindOpen(false)} />
    </Box>
  );
}

/** AUTH-004 임시 비밀번호 메일 — 가입 여부와 관계없이 같은 안내 */
function TempPasswordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setError(null);
    const res = await fetch('/api/proxy-public/auth/password/temp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() }),
    });
    if (res.ok) setSent(true);
    else setError(res.status === 429 ? '시도가 너무 많습니다. 잠시 후 다시 시도하세요' : '요청에 실패했습니다');
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        onClose();
        setSent(false);
      }}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>{t('임시 비밀번호 받기')}</DialogTitle>
      <DialogContent>
        {sent ? (
          <Alert severity="success" sx={{ mt: 1 }}>
            {t('가입된 이메일이면 임시 비밀번호를 보냈습니다. 로그인 후 바로 새 비밀번호로 바꿔 주세요.')}
          </Alert>
        ) : (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label={t('가입한 이메일')} value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
            {error && <Alert severity="error">{t(error)}</Alert>}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('닫기')}</Button>
        {!sent && (
          <Button variant="contained" disabled={!email.includes('@')} onClick={() => void send()}>
            {t('보내기')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
