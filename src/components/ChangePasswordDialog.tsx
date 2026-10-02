'use client';

import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useMutation } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import { logout } from '@/lib/session';

/** AUTH-005 비밀번호 변경. 성공하면 백엔드가 모든 세션을 끊으므로 다시 로그인 */
export default function ChangePasswordDialog({ open, forced, onClose }: { open: boolean; forced: boolean; onClose: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const mismatch = confirm.length > 0 && next !== confirm;

  const change = useMutation({
    mutationFn: () => api.put('auth/password', { currentPassword: current, newPassword: next }),
    onSuccess: () => void logout(),
  });

  return (
    <Dialog open={open} onClose={forced ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>비밀번호 변경</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {forced && <Alert severity="info">임시 비밀번호로 로그인했습니다. 새 비밀번호로 바꿔 주세요.</Alert>}
          <TextField label="현재 비밀번호" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
          <TextField
            label="새 비밀번호"
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            helperText="8자 이상, 영문과 숫자 포함"
            autoComplete="new-password"
          />
          <TextField
            label="새 비밀번호 확인"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            error={mismatch}
            helperText={mismatch ? '비밀번호가 다릅니다' : ' '}
            autoComplete="new-password"
          />
          {change.isError && <Alert severity="error">{errorMessage(change.error)}</Alert>}
          <Alert severity="warning" variant="outlined">
            변경하면 모든 기기에서 로그아웃되고 다시 로그인해야 합니다.
          </Alert>
        </Stack>
      </DialogContent>
      <DialogActions>
        {!forced && <Button onClick={onClose}>취소</Button>}
        <Button variant="contained" disabled={!current || !next || next !== confirm || change.isPending} onClick={() => change.mutate()}>
          변경
        </Button>
      </DialogActions>
    </Dialog>
  );
}
