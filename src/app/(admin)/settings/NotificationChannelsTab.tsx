'use client';

import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import type { ChannelSetting } from '@/lib/comm';
import { useSession } from '@/lib/session';
import { useT } from '@/lib/i18n';

/** SET-004 알림 종류별 채널(앱 푸시 / 알림톡) 켜기·끄기. 원장·실장만 바꿀 수 있다 */
export default function NotificationChannelsTab() {
  const t = useT();
  const qc = useQueryClient();
  const { session, manager } = useSession();
  const instId = session?.institution?.institutionId;
  const [rows, setRows] = useState<ChannelSetting[]>([]);

  const q = useQuery({ queryKey: ['notification-channels', instId], queryFn: () => api.get<{ categories: ChannelSetting[] }>('settings/notification-channels'), enabled: !!instId });
  useEffect(() => {
    if (q.data) setRows(q.data.categories);
  }, [q.data]);

  const save = useMutation({
    mutationFn: () => api.put('settings/notification-channels', { categories: Object.fromEntries(rows.map((r) => [r.category, { push: r.push, alimtalk: r.alimtalk }])) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notification-channels'] }),
  });
  const set = (cat: string, p: Partial<ChannelSetting>) => setRows((l) => l.map((r) => (r.category === cat ? { ...r, ...p } : r)));

  return (
    <Stack spacing={2} sx={{ maxWidth: 720 }}>
      <Typography variant="body2" color="text.secondary">
        {t('알림 종류마다 학부모에게 앱 푸시와 알림톡을 보낼지 정합니다. 알림톡은 앱을 설치하지 않았거나 푸시를 꺼 둔 보호자에게 대신 갑니다.')}
      </Typography>
      {q.isError && <Alert severity="error">{errorMessage(q.error)}</Alert>}
      {save.isError && <Alert severity="error">{errorMessage(save.error)}</Alert>}
      {save.isSuccess && <Alert severity="success">{t('저장했습니다')}</Alert>}
      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('알림 종류')}</TableCell>
              <TableCell align="center">{t('앱 푸시')}</TableCell>
              <TableCell align="center">{t('알림톡')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.category}>
                <TableCell>{t(r.label)}</TableCell>
                <TableCell align="center">
                  <Switch checked={r.push} disabled={!manager} onChange={(e) => set(r.category, { push: e.target.checked })} />
                </TableCell>
                <TableCell align="center">
                  <Switch checked={r.alimtalk} disabled={!manager} onChange={(e) => set(r.category, { alimtalk: e.target.checked })} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
      {manager && (
        <Button variant="contained" sx={{ alignSelf: 'flex-end' }} disabled={save.isPending || rows.length === 0} onClick={() => save.mutate()}>
          {t('저장')}
        </Button>
      )}
    </Stack>
  );
}
