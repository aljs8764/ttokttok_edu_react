'use client';

import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import { formatPhone, isMobile } from '@/lib/student';
import { dateTime } from '@/lib/format';

/**
 * STU-005 초대장 발송. 학부모 번호로 "자녀 정보 입력" 링크가 알림톡으로 간다(7일 유효).
 * 학부모가 정보를 내면 가입 승인(STU-004) 목록에 올라온다. 링크 토큰은 화면에 노출하지 않는다.
 */
export default function InviteParentDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [phone, setPhone] = useState('');
  const [sentTo, setSentTo] = useState<{ phone: string; expiresAt: string }[]>([]);

  useEffect(() => {
    if (open) {
      setPhone('');
      setSentTo([]);
    }
  }, [open]);

  const send = useMutation({
    mutationFn: () => api.post<{ expiresAt: string }>('invitations/parents', { phone }),
    onSuccess: (r) => {
      setSentTo((xs) => [{ phone, expiresAt: r.expiresAt }, ...xs]);
      setPhone('');
    },
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>학부모 초대 · STU-005</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            학부모가 링크에서 자녀 정보를 입력하면 가입 승인 목록에 올라옵니다. 승인할 때 반을 배정합니다.
          </Typography>
          <TextField
            label="학부모 휴대폰 번호"
            autoFocus
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && isMobile(phone) && !send.isPending) send.mutate();
            }}
            error={!!phone && !isMobile(phone)}
            helperText={phone && !isMobile(phone) ? '휴대폰 번호 형식이 아닙니다' : '엔터로 연속 발송할 수 있습니다'}
            inputProps={{ inputMode: 'numeric' }}
          />
          {send.isError && <Alert severity="error">{errorMessage(send.error)}</Alert>}
          {sentTo.map((s) => (
            <Alert key={s.phone + s.expiresAt} severity="success">
              {s.phone} 으로 보냈습니다 · {dateTime(s.expiresAt)} 까지 유효
            </Alert>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>닫기</Button>
        <Button variant="contained" disabled={!isMobile(phone) || send.isPending} onClick={() => send.mutate()}>
          초대 보내기
        </Button>
      </DialogActions>
    </Dialog>
  );
}
