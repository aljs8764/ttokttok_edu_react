'use client';

import { useState, type ReactNode } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMutation } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import { ROLE_LABEL } from '@/lib/format';
import { logout, useSession } from '@/lib/session';
import ChangePasswordDialog from '@/components/ChangePasswordDialog';

/** 내 계정 — AUTH-005 비밀번호 변경, 모든 기기 로그아웃(refresh 전부 폐기) */
export default function AccountTab() {
  const { session } = useSession();
  const [pwOpen, setPwOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const logoutAll = useMutation({
    mutationFn: () => api.delete('me/sessions'),
    onSuccess: () => void logout(),
  });

  return (
    <Paper sx={{ p: 3, maxWidth: 640 }}>
      <Typography variant="subtitle1">{session?.user.name}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {session?.user.memberships.map((m) => `${m.institutionName} ${ROLE_LABEL[m.role]}`).join(' · ')}
      </Typography>
      <Divider sx={{ mb: 2 }} />

      <Stack spacing={2.5}>
        <Row title="비밀번호 변경" desc="바꾸면 다른 기기에서는 다시 로그인해야 합니다.">
          <Button variant="outlined" onClick={() => setPwOpen(true)}>
            변경
          </Button>
        </Row>
        <Row title="모든 기기에서 로그아웃" desc="이 브라우저를 포함해 로그인된 모든 곳(교사 앱 포함)이 로그아웃됩니다. 기기를 잃어버렸을 때 쓰세요.">
          <Button variant="outlined" color="error" onClick={() => setConfirmOpen(true)}>
            로그아웃
          </Button>
        </Row>
      </Stack>

      <ChangePasswordDialog open={pwOpen} forced={false} onClose={() => setPwOpen(false)} />
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>모든 기기에서 로그아웃</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mt: 1 }}>
            로그인된 모든 기기의 세션을 끊습니다. 계속할까요?
          </Typography>
          {logoutAll.isError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {errorMessage(logoutAll.error)}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>취소</Button>
          <Button variant="contained" color="error" disabled={logoutAll.isPending} onClick={() => logoutAll.mutate()}>
            모두 로그아웃
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}

function Row({ title, desc, children }: { title: string; desc: string; children: ReactNode }) {
  return (
    <Stack direction="row" spacing={2} alignItems="center">
      <Stack sx={{ flex: 1 }}>
        <Typography variant="subtitle2">{title}</Typography>
        <Typography variant="body2" color="text.secondary">
          {desc}
        </Typography>
      </Stack>
      {children}
    </Stack>
  );
}
