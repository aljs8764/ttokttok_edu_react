'use client';

import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/EditOutlined';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import type { NoticeTemplate } from '@/lib/comm';
import { useSession } from '@/lib/session';
import PageHeader from '@/components/PageHeader';

type Draft = { id?: string; kind: 'NOTE' | 'ANNOUNCEMENT'; name: string; title: string; body: string };
const EMPTY: Draft = { kind: 'NOTE', name: '', title: '', body: '' };

/** NTC-003 알림장 템플릿 라이브러리 — 작성 화면에서 불러다 쓴다. 공지 양식은 원장·실장만 만들 수 있다 */
export default function TemplatesView() {
  const qc = useQueryClient();
  const { session, manager } = useSession();
  const instId = session?.institution?.institutionId;
  const [draft, setDraft] = useState<Draft | null>(null);

  const list = useQuery({ queryKey: ['notice-templates', instId], queryFn: () => api.get<NoticeTemplate[]>('notice-templates'), enabled: !!instId });
  const save = useMutation({
    mutationFn: (d: Draft) => {
      const body = { kind: d.kind, name: d.name.trim(), title: d.title.trim(), body: d.body.trim() };
      return d.id ? api.put(`notice-templates/${d.id}`, body) : api.post('notice-templates', body);
    },
    onSuccess: () => (setDraft(null), qc.invalidateQueries({ queryKey: ['notice-templates'] })),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`notice-templates/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notice-templates'] }),
  });

  return (
    <>
      <PageHeader
        title="알림장 템플릿"
        menuId="NTC-003"
        description="자주 쓰는 문구를 저장해 두고 알림장 작성 화면에서 불러옵니다."
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDraft(EMPTY)}>
            템플릿 추가
          </Button>
        }
      />
      {list.isError && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage(list.error)}</Alert>}
      {remove.isError && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage(remove.error)}</Alert>}
      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>이름</TableCell>
              <TableCell>제목</TableCell>
              <TableCell>종류</TableCell>
              <TableCell>작성</TableCell>
              <TableCell align="right">사용</TableCell>
              <TableCell align="right" />
            </TableRow>
          </TableHead>
          <TableBody>
            {list.data?.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  저장된 템플릿이 없습니다
                </TableCell>
              </TableRow>
            )}
            {list.data?.map((t) => (
              <TableRow key={t.id} hover>
                <TableCell sx={{ fontWeight: 600 }}>{t.name}</TableCell>
                <TableCell>{t.title}</TableCell>
                <TableCell>
                  <Chip size="small" variant="outlined" label={t.kind === 'ANNOUNCEMENT' ? '공지' : '알림장'} />
                </TableCell>
                <TableCell>{t.createdBy.name}</TableCell>
                <TableCell align="right">{t.useCount}회</TableCell>
                <TableCell align="right">
                  <IconButton size="small" aria-label="수정" onClick={() => setDraft({ id: t.id, kind: t.kind, name: t.name, title: t.title, body: t.body })}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    aria-label="삭제"
                    onClick={() => {
                      if (window.confirm(`'${t.name}' 템플릿을 삭제할까요?`)) remove.mutate(t.id);
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={!!draft} onClose={() => setDraft(null)} fullWidth maxWidth="sm">
        <DialogTitle>{draft?.id ? '템플릿 수정' : '템플릿 추가'}</DialogTitle>
        <DialogContent>
          {draft && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              {manager && (
                <ToggleButtonGroup exclusive size="small" value={draft.kind} onChange={(_, v) => v && setDraft({ ...draft, kind: v })}>
                  <ToggleButton value="NOTE">알림장</ToggleButton>
                  <ToggleButton value="ANNOUNCEMENT">공지</ToggleButton>
                </ToggleButtonGroup>
              )}
              <TextField label="템플릿 이름" required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} inputProps={{ maxLength: 50 }} />
              <TextField label="제목" required value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} inputProps={{ maxLength: 100 }} />
              <TextField label="내용" required multiline minRows={6} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} inputProps={{ maxLength: 5000 }} />
              <Typography variant="caption" color="text.secondary">
                {'{학생이름} 같은 치환 문구는 지원하지 않습니다. 보내기 전에 직접 고쳐 쓰세요.'}
              </Typography>
              {save.isError && <Alert severity="error">{errorMessage(save.error)}</Alert>}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDraft(null)}>취소</Button>
          <Button variant="contained" disabled={!draft?.name.trim() || !draft?.title.trim() || !draft?.body.trim() || save.isPending} onClick={() => draft && save.mutate(draft)}>
            저장
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
