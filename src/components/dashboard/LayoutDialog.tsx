'use client';

import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import ArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import ArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { errorMessage } from '@/lib/api';
import type { DashboardWidget } from '@/lib/dashboard';
import { useT } from '@/lib/i18n';

/** DASH-017 위젯 켜기/끄기·순서 (사용자별 저장) */
export default function LayoutDialog({ widgets, labels, busy, error, onSave, onReset, onClose }: {
  widgets: DashboardWidget[];
  labels: Record<string, string>;
  busy: boolean;
  error: unknown;
  /** 저장이 끝나면 done() 을 불러 창을 닫는다 */
  onSave: (w: DashboardWidget[], done: () => void) => void;
  onReset: (done: () => void) => void;
  onClose: () => void;
}) {
  const t = useT();
  const [list, setList] = useState<DashboardWidget[]>(widgets);
  const move = (i: number, d: -1 | 1) => setList((l) => {
    const j = i + d;
    if (j < 0 || j >= l.length) return l;
    const next = [...l];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });
  const toggle = (i: number) => setList((l) => l.map((w, k) => (k === i ? { ...w, visible: !w.visible } : w)));
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{t('위젯 설정')}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{t('보일 위젯을 고르고 순서를 바꿉니다. 이 계정에만 저장됩니다.')}</Typography>
        {!!error && <Alert severity="error" sx={{ mb: 1 }}>{errorMessage(error)}</Alert>}
        <List dense>
          {list.map((w, i) => (
            <ListItem
              key={w.key}
              divider
              secondaryAction={
                <Box>
                  <IconButton size="small" disabled={i === 0} onClick={() => move(i, -1)} aria-label={t('위로')}><ArrowUpIcon fontSize="small" /></IconButton>
                  <IconButton size="small" disabled={i === list.length - 1} onClick={() => move(i, 1)} aria-label={t('아래로')}><ArrowDownIcon fontSize="small" /></IconButton>
                </Box>
              }
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <Checkbox edge="start" size="small" checked={w.visible} onChange={() => toggle(i)} />
              </ListItemIcon>
              <ListItemText primary={t(labels[w.key] ?? w.key)} />
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onReset(onClose)} disabled={busy}>{t('기본값으로 되돌리기')}</Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose}>{t('취소')}</Button>
        <Button variant="contained" disabled={busy} onClick={() => onSave(list, onClose)}>{t('저장')}</Button>
      </DialogActions>
    </Dialog>
  );
}
