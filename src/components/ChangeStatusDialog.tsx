'use client';

import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import { STATUS_OPTIONS } from '@/lib/format';
import type { Attendance, AttendanceStatus } from '@/lib/types';
import StatusChip from './StatusChip';

/**
 * ATT-002 상태 수동 변경. 사유 필수 (이벤트 로그 + 감사 로그에 남음).
 * 학부모에게 푸시는 가지 않는다 — 정정 알림이 혼란을 주기 때문.
 */
export default function ChangeStatusDialog({ target, onClose }: { target: Attendance | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<AttendanceStatus>('IN');
  const [reason, setReason] = useState('');
  const [isLate, setIsLate] = useState(false);
  const [isEarlyLeave, setIsEarlyLeave] = useState(false);

  useEffect(() => {
    if (!target) return;
    setStatus(target.status === 'SCHEDULED' ? 'ABSENT' : target.status);
    setReason(target.absenceReason ?? '');
    setIsLate(target.isLate);
    setIsEarlyLeave(target.isEarlyLeave);
  }, [target]);

  const save = useMutation({
    mutationFn: () =>
      api.patch(`attendance/${target!.dayId}/status`, {
        status,
        reason,
        isLate: status === 'ABSENT' ? null : isLate,
        isEarlyLeave: status === 'OUT' ? isEarlyLeave : null,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['attendance'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
      onClose();
    },
  });

  return (
    <Dialog open={!!target} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>출결 수동 변경</DialogTitle>
      <DialogContent>
        {target && (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="subtitle1">{target.studentName}</Typography>
              <Typography variant="body2" color="text.secondary">
                현재
              </Typography>
              <StatusChip status={target.status} isLate={target.isLate} isEarlyLeave={target.isEarlyLeave} />
            </Stack>
            <ToggleButtonGroup exclusive fullWidth size="small" value={status} onChange={(_, v) => v && setStatus(v)}>
              {STATUS_OPTIONS.map((o) => (
                <ToggleButton key={o.value} value={o.value}>
                  {o.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            {status !== 'ABSENT' && (
              <Stack direction="row">
                <FormControlLabel control={<Checkbox checked={isLate} onChange={(e) => setIsLate(e.target.checked)} />} label="지각" />
                {status === 'OUT' && (
                  <FormControlLabel control={<Checkbox checked={isEarlyLeave} onChange={(e) => setIsEarlyLeave(e.target.checked)} />} label="조퇴" />
                )}
              </Stack>
            )}
            <TextField
              label={status === 'ABSENT' ? '변경 사유 (결석 사유로도 저장)' : '변경 사유'}
              required
              multiline
              minRows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              inputProps={{ maxLength: 500 }}
              placeholder="예: 기기 미소지로 수기 처리, 어머니 전화로 결석 확인"
            />
            {save.isError && <Alert severity="error">{errorMessage(save.error)}</Alert>}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>취소</Button>
        <Button variant="contained" disabled={!reason.trim() || save.isPending} onClick={() => save.mutate()}>
          변경
        </Button>
      </DialogActions>
    </Dialog>
  );
}
