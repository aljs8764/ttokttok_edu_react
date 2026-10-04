'use client';

import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import { logout, useSession } from '@/lib/session';
import type { Terms } from '@/lib/types';

/** 아직 동의하지 않은 기관용 약관 (개정 시 재동의) */
export function usePendingTerms() {
  const { session } = useSession();
  return useQuery({
    queryKey: ['terms', 'pending', session?.user.id],
    queryFn: () => api.get<Terms[]>('me/terms/pending', { audience: 'INSTITUTION' }),
    enabled: !!session,
    staleTime: 10 * 60_000,
  });
}

/**
 * SET-005 약관 재동의 게이트. 필수 약관이 남아 있으면 동의 전까지 화면을 쓸 수 없다.
 * 선택 약관만 남았으면 한 번 보여 주고 닫을 수 있다.
 */
export default function TermsGate() {
  const qc = useQueryClient();
  const pending = usePendingTerms();
  const items = pending.data ?? [];
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => setChecked(new Set()), [pending.data]);

  const agree = useMutation({
    mutationFn: () => api.post('me/terms/agreements', { termsIds: [...checked] }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['terms'] }),
  });

  const required = items.filter((t) => t.required);
  const blocking = required.length > 0;
  const open = items.length > 0 && (blocking || !dismissed);
  const allRequired = required.every((t) => checked.has(t.id));
  const toggle = (id: string) => setChecked((s) => (s.has(id) ? (s.delete(id), new Set(s)) : new Set(s.add(id))));

  return (
    <Dialog open={open} maxWidth="sm" fullWidth onClose={blocking ? undefined : () => setDismissed(true)}>
      <DialogTitle>약관이 개정되었습니다</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {blocking ? '계속 이용하려면 필수 약관에 동의해 주세요.' : '선택 약관에 동의하지 않아도 이용할 수 있습니다.'}
        </Typography>
        <Stack spacing={2}>
          {items.map((t) => (
            <Box key={t.id}>
              <FormControlLabel
                control={<Checkbox checked={checked.has(t.id)} onChange={() => toggle(t.id)} />}
                label={
                  <Typography variant="subtitle2">
                    [{t.required ? '필수' : '선택'}] {t.title} (v{t.version})
                  </Typography>
                }
              />
              <Box sx={{ maxHeight: 160, overflow: 'auto', p: 1.5, bgcolor: 'background.default', borderRadius: 1, typography: 'body2', whiteSpace: 'pre-wrap' }}>{t.body}</Box>
            </Box>
          ))}
        </Stack>
        {agree.isError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {errorMessage(agree.error)}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        {blocking ? (
          <Button color="inherit" onClick={() => void logout()}>
            로그아웃
          </Button>
        ) : (
          <Button onClick={() => setDismissed(true)}>나중에</Button>
        )}
        <Button variant="contained" disabled={!allRequired || checked.size === 0 || agree.isPending} onClick={() => agree.mutate()}>
          동의하고 계속
        </Button>
      </DialogActions>
    </Dialog>
  );
}
