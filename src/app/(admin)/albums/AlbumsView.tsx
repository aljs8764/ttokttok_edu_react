'use client';

import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
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

const isVideo = (f: FileRef) => f.mime.startsWith('video/');

function Thumb({ f, size = 96 }: { f: FileRef; size?: number }) {
  const sx = { width: size, height: size, objectFit: 'cover', borderRadius: 1, bgcolor: 'action.hover' } as const;
  if (!f.downloadUrl) return <Box sx={sx} />;
  return isVideo(f) ? <Box component="video" src={f.downloadUrl} sx={sx} muted preload="metadata" /> : <Box component="img" src={f.downloadUrl} alt={f.name} sx={sx} />;
}

/** NTC-011 앨범 — 사진·영상을 대상 학부모에게만 공개 */
export default function AlbumsView() {
  const qc = useQueryClient();
  const { session } = useSession();
  const instId = session?.institution?.institutionId;
  const [createOpen, setCreateOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const list = useQuery({ queryKey: ['albums', instId], queryFn: () => api.get<Album[]>('albums', { size: 30 }), enabled: !!instId });

  return (
    <>
      <PageHeader
        title="앨범"
        menuId="NTC-011"
        description="활동 사진·영상을 반 또는 원생 단위로 공유합니다. 학부모 앱에서는 대상 자녀의 앨범만 보입니다."
        actions={
          <Button variant="contained" startIcon={<AddPhotoIcon />} onClick={() => setCreateOpen(true)}>
            앨범 올리기
          </Button>
        }
      />
      {list.isError && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage(list.error)}</Alert>}
      {list.isFetching && <LinearProgress />}
      {list.data?.length === 0 && (
        <Typography color="text.secondary" align="center" sx={{ py: 6 }}>
          올린 앨범이 없습니다
        </Typography>
      )}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 2 }}>
        {list.data?.map((a) => (
          <Card key={a.id} variant="outlined">
            <CardActionArea onClick={() => setOpenId(a.id)}>
              <CardContent>
                <Stack direction="row" spacing={0.5} sx={{ mb: 1.5 }}>
                  {a.items.slice(0, 4).map((f) => <Thumb key={f.id} f={f} size={72} />)}
                </Stack>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }} noWrap>
                  {a.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {a.itemCount}개 · {a.author.name} · {dateTime(a.createdAt)}
                  {a.recipients !== null && ` · 받는 학부모 ${a.recipients}명`}
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Box>

      <CreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => (setCreateOpen(false), qc.invalidateQueries({ queryKey: ['albums'] }))}
      />
      <DetailDialog id={openId} onClose={() => setOpenId(null)} onDeleted={() => (setOpenId(null), qc.invalidateQueries({ queryKey: ['albums'] }))} />
    </>
  );
}

function CreateDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
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
      <DialogTitle>앨범 올리기</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <TargetPicker value={targets} onChange={setTargets} />
          <TextField label="제목" required value={title} onChange={(e) => setTitle(e.target.value)} inputProps={{ maxLength: 100 }} />
          <TextField label="설명 (선택)" multiline minRows={2} value={description} onChange={(e) => setDescription(e.target.value)} inputProps={{ maxLength: 1000 }} />
          <Box>
            <Typography variant="caption" color="text.secondary">
              사진(jpg·png·heic) 또는 영상(mp4·mov, 100MB 이하) — 최대 30개
            </Typography>
            <AttachmentField purpose="ALBUM_MEDIA" value={files} onChange={setFiles} max={30} />
          </Box>
          {create.isError && <Alert severity="error">{errorMessage(create.error)}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>취소</Button>
        <Button variant="contained" disabled={!title.trim() || files.length === 0 || targets.length === 0 || create.isPending} onClick={() => create.mutate()}>
          올리고 알림 보내기
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function DetailDialog({ id, onClose, onDeleted }: { id: string | null; onClose: () => void; onDeleted: () => void }) {
  const { session } = useSession();
  const instId = session?.institution?.institutionId;
  const detail = useQuery({ queryKey: ['albums', instId, 'detail', id], queryFn: () => api.get<Album>(`albums/${id}`), enabled: !!instId && !!id });
  const remove = useMutation({ mutationFn: () => api.delete(`albums/${id}`), onSuccess: onDeleted });
  const a = detail.data;

  return (
    <Dialog open={!!id} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{a?.title ?? '앨범'}</DialogTitle>
      <DialogContent>
        {detail.isFetching && <LinearProgress />}
        {detail.isError && <Alert severity="error">{errorMessage(detail.error)}</Alert>}
        {a && (
          <Stack spacing={1.5}>
            <Typography variant="caption" color="text.secondary">
              {a.author.name} · {dateTime(a.createdAt)} · {a.itemCount}개{a.recipients !== null && ` · 받는 학부모 ${a.recipients}명`}
            </Typography>
            {a.description && <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{a.description}</Typography>}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 1 }}>
              {a.items.map((f) =>
                f.downloadUrl ? (
                  isVideo(f) ? (
                    <Box key={f.id} component="video" src={f.downloadUrl} controls preload="metadata" sx={{ width: '100%', borderRadius: 1 }} />
                  ) : (
                    <a key={f.id} href={f.downloadUrl} target="_blank" rel="noopener noreferrer">
                      <Box component="img" src={f.downloadUrl} alt={f.name} sx={{ width: '100%', borderRadius: 1, display: 'block' }} />
                    </a>
                  )
                ) : null,
              )}
            </Box>
            {remove.isError && <Alert severity="error">{errorMessage(remove.error)}</Alert>}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button
          color="error"
          disabled={!a || remove.isPending}
          onClick={() => {
            if (window.confirm('앨범을 삭제할까요? 학부모 앱에서도 사라집니다.')) remove.mutate();
          }}
        >
          삭제
        </Button>
        <Button onClick={onClose}>닫기</Button>
      </DialogActions>
    </Dialog>
  );
}
