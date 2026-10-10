'use client';

import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import NextLink from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import type { Album } from '@/lib/comm';
import { dateTime } from '@/lib/format';

interface EventAlbumLink { albumId: string; title: string; itemCount: number; createdAt: string }
interface EventReview { id: string; eventId: string; studentName: string; authorName: string; body: string; hidden: boolean; mine: boolean; createdAt: string }

/** EVT-009 행사 후기·사진 — 앨범 연결, 학부모 후기 확인·숨김 */
export default function EventFollowUpPanel({ eventId, instId }: { eventId: string; instId?: string }) {
  const qc = useQueryClient();
  const [pick, setPick] = useState('');
  const albums = useQuery({ queryKey: ['event-albums', eventId], queryFn: () => api.get<EventAlbumLink[]>(`events/${eventId}/albums`), enabled: !!instId });
  const allAlbums = useQuery({ queryKey: ['albums', instId], queryFn: () => api.get<Album[]>('albums', { size: 30 }), enabled: !!instId });
  const reviews = useQuery({ queryKey: ['event-reviews', eventId], queryFn: () => api.get<EventReview[]>(`events/${eventId}/reviews`), enabled: !!instId });

  const setAlbums = (data: EventAlbumLink[]) => qc.setQueryData(['event-albums', eventId], data);
  const link = useMutation({ mutationFn: (albumId: string) => api.post<EventAlbumLink[]>(`events/${eventId}/albums`, { albumId }), onSuccess: (d) => { setAlbums(d); setPick(''); } });
  const unlink = useMutation({ mutationFn: (albumId: string) => api.delete<EventAlbumLink[]>(`events/${eventId}/albums/${albumId}`), onSuccess: setAlbums });
  const hide = useMutation({
    mutationFn: ({ id, hidden }: { id: string; hidden: boolean }) => api.post(`event-reviews/${id}/hidden`, { hidden }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['event-reviews', eventId] }),
  });

  const linked = new Set((albums.data ?? []).map((a) => a.albumId));
  const candidates = (allAlbums.data ?? []).filter((a) => !linked.has(a.id));
  const err = albums.error ?? reviews.error ?? link.error ?? unlink.error ?? hide.error;

  return (
    <Paper sx={{ p: 2.5, mt: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
        <Typography variant="h4" sx={{ flex: 1 }}>행사 사진·후기</Typography>
        <Chip size="small" variant="outlined" label="EVT-009" />
      </Box>
      {err && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage(err)}</Alert>}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Typography variant="subtitle2" gutterBottom>연결된 앨범</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            학부모 앱의 행사 화면에 함께 보입니다. 앨범 공개 대상에 포함된 보호자에게만 보입니다.
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
            <TextField select size="small" label="앨범 고르기" value={pick} onChange={(e) => setPick(e.target.value)} sx={{ flex: 1 }}>
              {candidates.length === 0 && <MenuItem value="" disabled>연결할 앨범이 없습니다</MenuItem>}
              {candidates.map((a) => <MenuItem key={a.id} value={a.id}>{a.title} ({a.itemCount}장)</MenuItem>)}
            </TextField>
            <Button variant="outlined" disabled={!pick || link.isPending} onClick={() => link.mutate(pick)}>연결</Button>
          </Stack>
          <Button size="small" component={NextLink} href="/albums">앨범 새로 올리기</Button>
          <List dense>
            {(albums.data ?? []).map((a) => (
              <ListItem key={a.albumId} divider secondaryAction={<Button size="small" color="error" onClick={() => unlink.mutate(a.albumId)}>해제</Button>}>
                <ListItemText primary={a.title} secondary={`사진 ${a.itemCount}장 · ${dateTime(a.createdAt)}`} />
              </ListItem>
            ))}
          </List>
        </Grid>
        <Grid size={{ xs: 12, md: 7 }}>
          <Typography variant="subtitle2" gutterBottom>학부모 후기 {reviews.data ? `${reviews.data.length}건` : ''}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            행사가 시작된 뒤 대상 원생의 보호자가 남길 수 있습니다. 부적절한 후기는 숨기면 다른 보호자에게 보이지 않습니다.
          </Typography>
          {reviews.data?.length === 0 && <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>아직 후기가 없습니다.</Typography>}
          <List dense>
            {(reviews.data ?? []).map((r) => (
              <ListItem
                key={r.id}
                divider
                alignItems="flex-start"
                secondaryAction={
                  <Button size="small" onClick={() => hide.mutate({ id: r.id, hidden: !r.hidden })}>{r.hidden ? '다시 보이기' : '숨기기'}</Button>
                }
                sx={{ opacity: r.hidden ? 0.55 : 1, pr: 12 }}
              >
                <ListItemText
                  primary={<Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{r.body}</Typography>}
                  secondary={`${r.studentName} 보호자(${r.authorName}) · ${dateTime(r.createdAt)}${r.hidden ? ' · 숨김' : ''}`}
                />
              </ListItem>
            ))}
          </List>
        </Grid>
      </Grid>
    </Paper>
  );
}
