'use client';

import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import dayjs from 'dayjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import { useT } from '@/lib/i18n';
import { boardKeyLabel, reasonLabel, type CommunityReport } from '@/lib/community';

type Action = 'HIDE' | 'RESTORE' | 'DELETE' | 'DISMISS';
const path = (r: CommunityReport) => `platform/community/${r.targetType}/${r.targetId}`;

function SanctionDialog({ report, onClose }: { report: CommunityReport; onClose: () => void }) {
  const t = useT();
  const qc = useQueryClient();
  const [days, setDays] = useState<string>('7');
  const [reason, setReason] = useState('');
  const save = useMutation({
    mutationFn: () => api.post(`${path(report)}/sanction`, { days: days === 'PERM' ? null : Number(days), reason }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['platform', 'community'] }); onClose(); },
  });
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{t('작성자 이용 제한')}</DialogTitle>
      <DialogContent>
        {save.error && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage(save.error)}</Alert>}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('작성자 이름·연락처는 보이지 않습니다. 이 글·댓글을 쓴 계정의 커뮤니티 글·댓글 작성을 막습니다.')}
        </Typography>
        <Stack spacing={2}>
          <TextField select size="small" label={t('기간')} value={days} onChange={(e) => setDays(e.target.value)}>
            <MenuItem value="1">{t('1일')}</MenuItem>
            <MenuItem value="7">{t('7일')}</MenuItem>
            <MenuItem value="30">{t('30일')}</MenuItem>
            <MenuItem value="PERM">{t('영구')}</MenuItem>
          </TextField>
          <TextField size="small" label={t('사유 (본인에게 보입니다)')} value={reason} onChange={(e) => setReason(e.target.value)} slotProps={{ htmlInput: { maxLength: 200 } }} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('취소')}</Button>
        <Button color="error" variant="contained" disabled={!reason.trim() || save.isPending} onClick={() => save.mutate()}>{t('제한')}</Button>
      </DialogActions>
    </Dialog>
  );
}

/** COM-008 커뮤니티 신고 처리 */
export default function CommunityReportsTab() {
  const t = useT();
  const qc = useQueryClient();
  const [status, setStatus] = useState<'OPEN' | 'RESOLVED'>('OPEN');
  const [sanction, setSanction] = useState<CommunityReport | null>(null);
  const q = useQuery({
    queryKey: ['platform', 'community', status],
    queryFn: () => api.get<CommunityReport[]>('platform/community/reports', { status, page: 0 }),
  });
  const refresh = () => { void qc.invalidateQueries({ queryKey: ['platform', 'community'] }); };
  const resolve = useMutation({ mutationFn: (v: { r: CommunityReport; action: Action }) => api.post(`${path(v.r)}/resolve`, { action: v.action }), onSuccess: refresh });
  const lift = useMutation({ mutationFn: (r: CommunityReport) => api.post(`${path(r)}/lift-sanction`), onSuccess: refresh });
  const err = q.error ?? resolve.error ?? lift.error;

  const act = (r: CommunityReport, action: Action, confirmText?: string) => {
    if (confirmText && !window.confirm(t(confirmText))) return;
    resolve.mutate({ r, action });
  };

  return (
    <>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <ToggleButtonGroup size="small" exclusive value={status} onChange={(_, v: 'OPEN' | 'RESOLVED' | null) => v && setStatus(v)}>
          <ToggleButton value="OPEN">{t('대기')}</ToggleButton>
          <ToggleButton value="RESOLVED">{t('처리 완료')}</ToggleButton>
        </ToggleButtonGroup>
        <Typography variant="body2" color="text.secondary">
          {t('라운지는 신고 5건, 기관 게시판은 3건이면 자동으로 숨겨집니다. 작성자 신원은 표시하지 않습니다.')}
        </Typography>
      </Stack>
      {err && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage(err)}</Alert>}
      {q.data?.length === 0 && <Alert severity="success">{status === 'OPEN' ? t('처리할 신고가 없습니다.') : t('처리한 신고가 없습니다.')}</Alert>}
      <Stack spacing={1.5}>
        {q.data?.map((r) => (
          <Paper key={`${r.targetType}-${r.targetId}`} variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 0.5, mb: 1 }}>
              <Chip size="small" label={r.targetType === 'POST' ? t('게시글') : t('댓글')} />
              <Chip size="small" variant="outlined" label={boardKeyLabel(r.boardKey)} />
              <Chip size="small" color="error" label={t('신고 {0}건', { 0: r.reportCount })} />
              {r.deleted && <Chip size="small" label={t('삭제됨')} />}
              {r.hidden && <Chip size="small" color="warning" label={r.hidden === 'REPORTED' ? t('자동 숨김') : t('운영 숨김')} />}
              {r.authorSanctioned && <Chip size="small" color="error" variant="outlined" label={t('작성자 제한 중')} />}
              <Box sx={{ flex: 1 }} />
              <Typography variant="caption" color="text.secondary">{t('첫 신고 {0}', { 0: dayjs(r.firstReportedAt).format('M/D HH:mm') })}</Typography>
            </Stack>
            {r.title && <Typography variant="subtitle2">{r.targetType === 'COMMENT' ? t('원글: {0}', { 0: r.title }) : r.title}</Typography>}
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', bgcolor: 'action.hover', p: 1.5, borderRadius: 1, my: 1, maxHeight: 200, overflow: 'auto' }}>
              {r.body}
            </Typography>
            <Typography variant="caption" color="text.secondary" component="div">
              {Object.entries(r.reasons).map(([k, v]) => `${t(reasonLabel(k))} ${v}`).join(' · ')}
            </Typography>
            {r.memos.length > 0 && (
              <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.5 }}>
                {t('메모')}: {r.memos.join(' / ')}
              </Typography>
            )}
            <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap', rowGap: 1 }}>
              {!r.deleted && (r.hidden
                ? <Button size="small" onClick={() => act(r, 'RESTORE')}>{t('복구')}</Button>
                : <Button size="small" color="warning" onClick={() => act(r, 'HIDE')}>{t('숨김')}</Button>)}
              {!r.deleted && <Button size="small" color="error" onClick={() => act(r, 'DELETE', '삭제하면 되돌릴 수 없습니다. 삭제할까요?')}>{t('삭제')}</Button>}
              {r.open && <Button size="small" onClick={() => act(r, 'DISMISS')}>{t('문제 없음 (신고 닫기)')}</Button>}
              <Box sx={{ flex: 1 }} />
              {r.authorSanctioned
                ? <Button size="small" onClick={() => lift.mutate(r)}>{t('이용 제한 해제')}</Button>
                : <Button size="small" color="error" variant="outlined" onClick={() => setSanction(r)}>{t('작성자 이용 제한')}</Button>}
            </Stack>
          </Paper>
        ))}
      </Stack>
      {sanction && <SanctionDialog report={sanction} onClose={() => setSanction(null)} />}
    </>
  );
}
