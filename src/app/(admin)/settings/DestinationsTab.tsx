'use client';

import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import ArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import ArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/EditOutlined';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import { useSession } from '@/lib/session';
import type { Destination, DestinationType } from '@/lib/types';
import { useT } from '@/lib/i18n';

const TYPE_LABEL: Record<DestinationType, string> = { HOME: '귀가', ACADEMY: '다른 학원', SHUTTLE: '셔틀', ETC: '기타' };

/**
 * SET-002 하원 목적지 — 교사 앱에서 하원 처리할 때 고르는 "다음 목적지" 목록.
 * 학부모 하원 푸시에 함께 표시된다. 삭제해도 지난 출결 기록의 목적지는 남는다(소프트 삭제).
 */
export default function DestinationsTab() {
  const tr = useT();
  const qc = useQueryClient();
  const { session, manager } = useSession();
  const instId = session?.institution?.institutionId;
  const [editing, setEditing] = useState<Destination | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Destination | null>(null);

  const list = useQuery({ queryKey: ['destinations', instId], queryFn: () => api.get<Destination[]>('destinations'), enabled: !!instId });
  const items = [...(list.data ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);

  const reorder = useMutation({
    mutationFn: (ids: string[]) => api.put<Destination[]>('destinations/order', { ids }),
    onMutate: (ids) => {
      // 화살표 반응이 바로 보이도록 먼저 바꿔 둔다
      qc.setQueryData<Destination[]>(['destinations', instId], (old) => old?.map((d) => ({ ...d, sortOrder: ids.indexOf(d.id) })));
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: ['destinations'] }),
  });

  const move = (i: number, dir: -1 | 1) => {
    const ids = items.map((d) => d.id);
    [ids[i], ids[i + dir]] = [ids[i + dir], ids[i]];
    reorder.mutate(ids);
  };

  return (
    <Paper sx={{ p: 3, maxWidth: 640 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="body2" color="text.secondary">
          {tr('교사 앱 하원 화면에 이 순서대로 나옵니다.')}
        </Typography>
        {manager && (
          <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => setEditing('new')}>
            {tr('추가')}
          </Button>
        )}
      </Stack>
      {(list.isFetching || reorder.isPending) && <LinearProgress />}
      {list.isError && <Alert severity="error">{errorMessage(list.error)}</Alert>}
      {reorder.isError && <Alert severity="error">{errorMessage(reorder.error)}</Alert>}
      {items.length === 0 && list.isSuccess && (
        <Alert severity="info" sx={{ mt: 1 }}>
          {tr('목적지가 없습니다. 예: 귀가(보호자 픽업), 셔틀 1호차, 피아노학원')}
        </Alert>
      )}
      <List>
        {items.map((d, i) => (
          <ListItem
            key={d.id}
            divider
            secondaryAction={
              manager && (
                <Stack direction="row">
                  <IconButton size="small" disabled={i === 0 || reorder.isPending} onClick={() => move(i, -1)} aria-label={tr('위로')}>
                    <ArrowUpIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" disabled={i === items.length - 1 || reorder.isPending} onClick={() => move(i, 1)} aria-label={tr('아래로')}>
                    <ArrowDownIcon fontSize="small" />
                  </IconButton>
                  <Tooltip title={tr('수정')}>
                    <IconButton size="small" onClick={() => setEditing(d)} aria-label={tr('수정')}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={tr('삭제')}>
                    <IconButton size="small" onClick={() => setDeleting(d)} aria-label={tr('삭제')}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              )
            }
          >
            <ListItemText
              primary={
                <Stack direction="row" spacing={1} alignItems="center">
                  <span>{d.name}</span>
                  <Chip size="small" variant="outlined" label={tr(TYPE_LABEL[d.type])} />
                </Stack>
              }
            />
          </ListItem>
        ))}
      </List>

      {manager && (
        <>
          <EditDialog target={editing} count={items.length} onClose={() => setEditing(null)} />
          <DeleteDialog target={deleting} onClose={() => setDeleting(null)} />
        </>
      )}
    </Paper>
  );
}

function EditDialog({ target, count, onClose }: { target: Destination | 'new' | null; count: number; onClose: () => void }) {
  const tr = useT();
  const qc = useQueryClient();
  const isNew = target === 'new';
  const [name, setName] = useState('');
  const [type, setType] = useState<DestinationType>('HOME');

  useEffect(() => {
    if (!target) return;
    setName(target === 'new' ? '' : target.name);
    setType(target === 'new' ? 'HOME' : target.type);
  }, [target]);

  const save = useMutation({
    mutationFn: () =>
      isNew
        ? api.post('destinations', { name: name.trim(), type, sortOrder: count })
        : api.patch(`destinations/${(target as Destination).id}`, { name: name.trim(), type }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['destinations'] });
      onClose();
    },
  });

  return (
    <Dialog open={!!target} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{isNew ? tr('목적지 추가') : tr('목적지 수정')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label={tr('이름')} required autoFocus value={name} onChange={(e) => setName(e.target.value)} inputProps={{ maxLength: 50 }} placeholder={tr('예: 셔틀 1호차')} />
          <TextField select label={tr('종류')} value={type} onChange={(e) => setType(e.target.value as DestinationType)}>
            {(Object.keys(TYPE_LABEL) as DestinationType[]).map((t) => (
              <MenuItem key={t} value={t}>
                {tr(TYPE_LABEL[t])}
              </MenuItem>
            ))}
          </TextField>
          {save.isError && <Alert severity="error">{errorMessage(save.error)}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{tr('취소')}</Button>
        <Button variant="contained" disabled={!name.trim() || save.isPending} onClick={() => save.mutate()}>
          {isNew ? tr('추가') : tr('저장')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function DeleteDialog({ target, onClose }: { target: Destination | null; onClose: () => void }) {
  const tr = useT();
  const qc = useQueryClient();
  const del = useMutation({
    mutationFn: () => api.delete(`destinations/${target!.id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['destinations'] });
      onClose();
    },
  });
  useEffect(() => del.reset(), [target]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Dialog open={!!target} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{tr('목적지 삭제')}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mt: 1 }}>
          {tr('{0}을(를) 목록에서 뺍니다. 이미 기록된 하원 목적지는 그대로 남습니다.', { 0: target?.name })}
        </Typography>
        {del.isError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {errorMessage(del.error)}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{tr('취소')}</Button>
        <Button variant="contained" color="error" disabled={del.isPending} onClick={() => del.mutate()}>
          {tr('삭제')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
