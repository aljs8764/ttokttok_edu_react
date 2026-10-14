'use client';

import { useState, type FormEvent } from 'react';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { INSTITUTION_TYPE_LABEL, type InstitutionType } from '@/lib/types';
import { useT } from '@/lib/i18n';
import LanguageSwitch from '@/components/LanguageSwitch';
import AuthLayout, { FieldLabel } from '@/components/shell/AuthLayout';

const strongEnough = (pw: string) => pw.length >= 8 && /\d/.test(pw) && /[A-Za-z]/.test(pw);

/** SAAS-001 원장 셀프 가입 — 기관 + 원장 계정을 만들고 바로 시작하기(ONB-001)로. 약관 동의는 로그인 후 TermsGate 가 받는다 */
export default function SignupForm() {
  const t = useT();
  const router = useRouter();
  const [form, setForm] = useState({ institutionName: '', type: 'ACADEMY' as InstitutionType, ownerName: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  const weak = form.password !== '' && !strongEnough(form.password);
  const mismatch = form.confirm !== '' && form.password !== form.confirm;
  const ready = form.institutionName.trim() && form.ownerName.trim() && form.email.trim() && strongEnough(form.password) && form.password === form.confirm;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          institutionName: form.institutionName.trim(), type: form.type, ownerName: form.ownerName.trim(),
          email: form.email.trim(), password: form.password,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(res.status === 429 ? t('시도가 너무 많습니다. 1분 뒤 다시 시도하세요') : body.message ?? t('가입하지 못했습니다'));
        return;
      }
      router.replace('/onboarding');
    } catch {
      setError(t('서버에 연결할 수 없습니다'));
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthLayout title="기관 가입" menuId="SAAS-001" subtitle={t('학원·기관을 등록하고 원장 계정을 만듭니다.')} topRight={<LanguageSwitch />}>
      <Box component="form" onSubmit={submit}>
        <Stack spacing={2.5}>
          <FieldLabel label={t('기관명')} htmlFor="signup-inst">
            <TextField id="signup-inst" value={form.institutionName} onChange={set('institutionName')} inputProps={{ maxLength: 100 }} autoFocus required />
          </FieldLabel>
          <FieldLabel label={t('기관 종류')} htmlFor="signup-type">
            <TextField id="signup-type" select value={form.type} onChange={set('type')}>
              {(Object.keys(INSTITUTION_TYPE_LABEL) as InstitutionType[]).map((k) => <MenuItem key={k} value={k}>{t(INSTITUTION_TYPE_LABEL[k])}</MenuItem>)}
            </TextField>
          </FieldLabel>
          <FieldLabel label={t('원장 이름')} htmlFor="signup-owner">
            <TextField id="signup-owner" value={form.ownerName} onChange={set('ownerName')} autoComplete="name" inputProps={{ maxLength: 50 }} required />
          </FieldLabel>
          <FieldLabel label={t('이메일')} htmlFor="signup-email">
            <TextField id="signup-email" type="email" value={form.email} onChange={set('email')} autoComplete="username" helperText={t('로그인 아이디로 씁니다')} required />
          </FieldLabel>
          <FieldLabel label={t('비밀번호')} htmlFor="signup-pw">
            <TextField
              id="signup-pw" type="password" value={form.password} onChange={set('password')} autoComplete="new-password" required
              error={weak} helperText={t('영문·숫자 포함 8자 이상')}
            />
          </FieldLabel>
          <FieldLabel label={t('비밀번호 확인')} htmlFor="signup-pw2">
            <TextField
              id="signup-pw2" type="password" value={form.confirm} onChange={set('confirm')} autoComplete="new-password" required
              error={mismatch} helperText={mismatch ? t('비밀번호가 일치하지 않습니다') : undefined}
            />
          </FieldLabel>
          {error && <Alert severity="error">{t(error)}</Alert>}
          <Button type="submit" variant="contained" size="large" disabled={pending || !ready}>
            {t('가입하기')}
          </Button>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
            {t('이미 계정이 있나요?')}{' '}
            <Link component={NextLink} href="/login" sx={{ fontWeight: 600 }}>{t('로그인')}</Link>
          </Typography>
        </Stack>
      </Box>
    </AuthLayout>
  );
}
