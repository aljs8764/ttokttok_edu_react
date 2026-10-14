'use client';

import { useState, type FormEvent } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import dayjs from 'dayjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import type { PlatformAdmin } from '@/lib/menus';
import { useSession } from '@/lib/session';
import { useT } from '@/lib/i18n';

/** SAAS-009 운영사 계정 — 이미 가입한 계정(이메일)을 운영사로 지정·해제. 자기 자신은 해제할 수 없다 */
export default function AdminsTab() {
  const t = useT();
  const qc = useQueryClient();
  const { session } = useSession();
  const [email, setEmail] = useState('');
  const q = useQuery({ queryKey: ['platform', 'admins'], queryFn: () => api.get<PlatformAdmin[]>('platform/admins') });
  const refresh = () => void qc.invalidateQueries({ queryKey: ['platform', 'admins'] });
  const add = useMutation({
    mutationFn: () => api.post('platform/admins', { email: email.trim() }),
    onSuccess: () => { setEmail(''); refresh(); },
  });
  const remove = useMutation({ mutationFn: (userId: string) => api.delete(`platform/admins/${userId}`), onSuccess: refresh });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (email.trim()) add.mutate();
  };
  const confirmRemove = (a: PlatformAdmin) => {
    if (window.confirm(t('{0} 님의 운영사 권한을 해제할까요?', { 0: a.name }))) remove.mutate(a.userId);
  };
  const err = q.error ?? add.error ?? remove.error;

  return (
    <>
      {err && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage(err)}</Alert>}
      <Paper sx={{ overflowX: 'auto', pt: 2.5 }}>
        <Box component="form" onSubmit={submit} sx={{ px: 3, pb: 2, position: 'sticky', left: 0 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
            <TextField size="small" type="email" label={t('계정 이메일')} value={email} onChange={(e) => setEmail(e.target.value)} sx={{ minWidth: 280 }} />
            <Button type="submit" variant="contained" disabled={!email.trim() || add.isPending}>{t('운영사로 지정')}</Button>
            <Typography variant="caption" color="text.secondary">{t('이미 똑똑에 가입한 계정만 지정할 수 있습니다.')}</Typography>
          </Stack>
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow><TableCell>{t('이름')}</TableCell><TableCell>{t('이메일')}</TableCell><TableCell>{t('지정일')}</TableCell><TableCell align="right" /></TableRow>
          </TableHead>
          <TableBody>
            {q.data?.map((a) => {
              const me = a.userId === session?.user.id;
              return (
                <TableRow key={a.userId}>
                  <TableCell>{a.name}{me && <Typography component="span" variant="caption" color="text.secondary"> {t('(나)')}</Typography>}</TableCell>
                  <TableCell>{a.email ?? '-'}</TableCell>
                  <TableCell>{dayjs(a.createdAt).format('YYYY-MM-DD')}</TableCell>
                  <TableCell align="right">
                    {!me && <Button size="small" color="error" disabled={remove.isPending} onClick={() => confirmRemove(a)}>{t('해제')}</Button>}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Paper>
    </>
  );
}
