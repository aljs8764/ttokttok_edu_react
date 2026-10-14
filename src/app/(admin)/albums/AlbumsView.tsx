'use client';

import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Paper from '@mui/material/Paper';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AddPhotoIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import type { Album } from '@/lib/comm';
import { dateTime } from '@/lib/format';
import { useSession } from '@/lib/session';
import type { FileRef, Target } from '@/lib/types';
import AttachmentField from '@/components/AttachmentField';
import PageHeader from '@/components/PageHeader';
import TargetPicker, { toTargetRequest } from '@/components/TargetPicker';
import { useT } from '@/lib/i18n';
import SectionCard from '@/components/ui/SectionCard';
import EmptyState from '@/components/ui/EmptyState';
import { color } from '@/theme/tokens';

const isVideo = (f: FileRef) => f.mime.startsWith('video/');

function Thumb({ f, size = 96 }: { f: FileRef; size?: number }) {
  const sx = { width: size, height: size, flexShrink: 0, objectFit: 'cover', borderRadius: '8px', bgcolor: color.neutral } as const;
  if (!f.downloadUrl) return <Box sx={sx} />;
  return isVideo(f) ? <Box component="video" src={f.downloadUrl} sx={sx} muted preload="metadata" /> : <Box component="img" src={f.downloadUrl} alt={f.name} sx={sx} />;
}

/** NTC-011 앨범 — 사진·영상을 대상 학부모에게만 공개 */
export default function AlbumsView() {
  const t = useT();
  const qc = useQueryClient();
  const { session } = useSession();
  const instId = session?.institution?.institutionId;
  const [createOpen, setCreateOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const list = useQuery({ queryKey: ['albums', instId], queryFn: () => api.get<Album[]>('albums', { size: 30 }), enabled: !!instId });
  // 디자인: 왼쪽 앨범 목록 + 오른쪽 선택한 앨범 (기본은 가장 최근 앨범)
  const current = openId && list.data?.some((x) => x.id === openId) ? openId : list.data?.[0]?.id ?? null;

  return (
    <>
      <PageHeader
        title={t('앨범')}
        menuId="NTC-011"
        description={t('활동 사진·영상을 반 또는 원생 단위로 공유합니다. 학부모 앱에서는 대상 자녀의 앨범만 보입니다.')}
        actions={
          <Button variant="contained" startIcon={<AddPhotoIcon />} onClick={() => setCreateOpen(true)}>
            {t('앨범 올리기')}
          </Button>
        }
      />
      {list.isError && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage(list.error)}</Alert>}
      {list.isFetching && !list.data && <LinearProgress />}
      {list.data?.length === 0 && (
        <Paper>
          <EmptyState title={t('올린 앨범이 없습니다')} action={<Button variant="outlined" startIcon={<AddPhotoIcon />} onClick={() => setCreateOpen(true)}>{t('앨범 올리기')}</Button>} />
        </Paper>
      )}
      {!!list.data?.length && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'flex-start' }}>
          <Paper component="nav" aria-label={t('앨범 목록')} sx={{ flex: '1 1 260px', p: 1.75, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {list.data.map((a) => {
              const active = a.id === current;
              return (
                <ButtonBase
                  key={a.id}
                  onClick={() => setOpenId(a.id)}
                  aria-current={active ? 'true' : undefined}
                  sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 1.5, p: 1, borderRadius: '10px', textAlign: 'left', bgcolor: active ? color.selected : 'transparent', '&:hover': { bgcolor: active ? color.selected : color.bg } }}
                >
                  {a.items[0] ? <Thumb f={a.items[0]} size={48} /> : <Box sx={{ width: 48, height: 48, borderRadius: '8px', bgcolor: color.neutral }} />}
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 700 }} noWrap>{a.title}</Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }} noWrap>
                      {t('{0}개 · {1} · {2}', { 0: a.itemCount, 1: a.author.name, 2: dateTime(a.createdAt) })}
                    </Typography>
                  </Box>
                </ButtonBase>
              );
            })}
          </Paper>
          {current && (
            <AlbumPanel id={current} onDeleted={() => (setOpenId(null), qc.invalidateQueries({ queryKey: ['albums'] }))} />
          )}
        </Box>
      )}

      <CreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => (setCreateOpen(false), qc.invalidateQueries({ queryKey: ['albums'] }))}
      />
    </>
  );
}

function CreateDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const t = useT();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<FileRef[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);

  const create = useMutation({
    mutationFn: () => api.post('albums', { title: title.trim(), description: description.trim() || undefined, files: files.map((f) => f.id), targets: toTargetRequest(targets) }),
    onSuccess: () => {
      setTitle('');
      setDescription('');
      setFiles([]);
      setTargets([]);
      onCreated();
    },
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{t('앨범 올리기')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <TargetPicker value={targets} onChange={setTargets} />
          <TextField label={t('제목')} required value={title} onChange={(e) => setTitle(e.target.value)} inputProps={{ maxLength: 100 }} />
          <TextField label={t('설명 (선택)')} multiline minRows={2} value={description} onChange={(e) => setDescription(e.target.value)} inputProps={{ maxLength: 1000 }} />
          <Box>
            <Typography variant="caption" color="text.secondary">
              {t('사진(jpg·png·heic) 또는 영상(mp4·mov, 100MB 이하) — 최대 30개')}
            </Typography>
            <AttachmentField purpose="ALBUM_MEDIA" value={files} onChange={setFiles} max={30} />
          </Box>
          {create.isError && <Alert severity="error">{errorMessage(create.error)}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('취소')}</Button>
        <Button variant="contained" disabled={!title.trim() || files.length === 0 || targets.length === 0 || create.isPending} onClick={() => create.mutate()}>
          {t('올리고 알림 보내기')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** 선택한 앨범 — 사진·영상 그리드 (기존 상세 다이얼로그와 같은 조회·삭제) */
function AlbumPanel({ id, onDeleted }: { id: string; onDeleted: () => void }) {
  const t = useT();
  const { session } = useSession();
  const instId = session?.institution?.institutionId;
  const detail = useQuery({ queryKey: ['albums', instId, 'detail', id], queryFn: () => api.get<Album>(`albums/${id}`), enabled: !!instId && !!id });
  const remove = useMutation({ mutationFn: () => api.delete(`albums/${id}`), onSuccess: onDeleted });
  const a = detail.data;

  return (
    <SectionCard
      title={a?.title ?? t('앨범')}
      menuId="NTC-011"
      sx={{ flex: '999 1 560px' }}
      actions={
        <Button
          size="small"
          variant="outlined"
          color="error"
          disabled={!a || remove.isPending}
          onClick={() => {
            if (window.confirm(t('앨범을 삭제할까요? 학부모 앱에서도 사라집니다.'))) remove.mutate();
          }}
        >
          {t('삭제')}
        </Button>
      }
    >
      {detail.isFetching && !a && <LinearProgress />}
      {detail.isError && <Alert severity="error">{errorMessage(detail.error)}</Alert>}
      {a && (
        <Stack spacing={2}>
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
            {t('{0} · {1} · {2}개', { 0: a.author.name, 1: dateTime(a.createdAt), 2: a.itemCount })}{a.recipients !== null && t(' · 받는 학부모 {0}명', { 0: a.recipients })}
          </Typography>
          {a.description && <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{a.description}</Typography>}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 1.25 }}>
            {a.items.map((f) =>
              f.downloadUrl ? (
                isVideo(f) ? (
                  <Box key={f.id} component="video" src={f.downloadUrl} controls preload="metadata" aria-label={f.name} sx={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', borderRadius: '10px', bgcolor: color.neutral }} />
                ) : (
                  <Box key={f.id} component="a" href={f.downloadUrl} target="_blank" rel="noopener noreferrer" sx={{ display: 'block', borderRadius: '10px', overflow: 'hidden' }}>
                    <Box component="img" src={f.downloadUrl} alt={f.name} sx={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', display: 'block', bgcolor: color.neutral }} />
                  </Box>
                )
              ) : null,
            )}
          </Box>
          {remove.isError && <Alert severity="error">{errorMessage(remove.error)}</Alert>}
        </Stack>
      )}
    </SectionCard>
  );
}
