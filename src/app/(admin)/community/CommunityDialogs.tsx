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
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import ReplyIcon from '@mui/icons-material/ReplyOutlined';
import FlagIcon from '@mui/icons-material/OutlinedFlag';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/EditOutlined';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import { useT } from '@/lib/i18n';
import {
  CATEGORIES, REASONS, RULES, ago, anonLabel, authorLabel, categoryLabel,
  type CommunityComment, type CommunityMe, type CommunityPostDetail, type PostCategory, type ReportReason,
} from '@/lib/community';

const invalidate = (qc: ReturnType<typeof useQueryClient>) => qc.invalidateQueries({ queryKey: ['community'] });

/** COM-002 최초 1회 이용 규칙 동의 */
export function RulesDialog({ open, onClose, onAgreed }: { open: boolean; onClose: () => void; onAgreed?: () => void }) {
  const t = useT();
  const qc = useQueryClient();
  const agree = useMutation({
    mutationFn: () => api.post<CommunityMe>('community/rules'),
    onSuccess: (me) => { qc.setQueryData(['community', 'me'], me); onAgreed?.(); onClose(); },
  });
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('커뮤니티 이용 규칙')}</DialogTitle>
      <DialogContent>
        {agree.error && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage(agree.error)}</Alert>}
        <Stack component="ol" spacing={1} sx={{ pl: 2.5, m: 0 }}>
          {RULES.map((r) => <Typography key={r} component="li" variant="body2">{t(r)}</Typography>)}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('닫기')}</Button>
        <Button variant="contained" disabled={agree.isPending} onClick={() => agree.mutate()}>{t('동의하고 시작하기')}</Button>
      </DialogActions>
    </Dialog>
  );
}

/** COM-002 글쓰기·수정 */
export function WriteDialog({ boardKey, editing, onClose, onSaved }: {
  boardKey: string;
  editing?: CommunityPostDetail;
  onClose: () => void;
  onSaved: (d: CommunityPostDetail) => void;
}) {
  const t = useT();
  const qc = useQueryClient();
  const [category, setCategory] = useState<PostCategory>(editing?.post.category ?? 'FREE');
  const [title, setTitle] = useState(editing?.post.title ?? '');
  const [body, setBody] = useState(editing?.body ?? '');
  const save = useMutation({
    mutationFn: () => {
      const req = { category, title, body };
      return editing
        ? api.put<CommunityPostDetail>(`community/posts/${editing.post.id}`, req)
        : api.post<CommunityPostDetail>(`community/boards/${encodeURIComponent(boardKey)}/posts`, req);
    },
    onSuccess: (d) => { void invalidate(qc); onSaved(d); },
  });
  const valid = title.trim().length > 0 && body.trim().length > 0;
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{editing ? t('글 고치기') : t('익명으로 글쓰기')}</DialogTitle>
      <DialogContent>
        {save.error && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage(save.error)}</Alert>}
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField select size="small" label={t('카테고리')} value={category} onChange={(e) => setCategory(e.target.value as PostCategory)} sx={{ maxWidth: 200 }}>
            {CATEGORIES.map((c) => <MenuItem key={c.id} value={c.id}>{t(c.label)}</MenuItem>)}
          </TextField>
          <TextField label={t('제목')} value={title} onChange={(e) => setTitle(e.target.value)} slotProps={{ htmlInput: { maxLength: 100 } }} />
          <TextField
            label={t('내용')} value={body} onChange={(e) => setBody(e.target.value)} multiline minRows={8}
            slotProps={{ htmlInput: { maxLength: 5000 } }}
            helperText={t('{0}/5000 · 전화번호·이메일은 자동으로 가려집니다', { 0: body.length })}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('취소')}</Button>
        <Button variant="contained" disabled={!valid || save.isPending} onClick={() => save.mutate()}>{editing ? t('저장') : t('올리기')}</Button>
      </DialogActions>
    </Dialog>
  );
}

/** COM-006 신고 */
export function ReportDialog({ target, onClose }: { target: { type: 'posts' | 'comments'; id: string }; onClose: () => void }) {
  const t = useT();
  const qc = useQueryClient();
  const [reason, setReason] = useState<ReportReason>('ABUSE');
  const [memo, setMemo] = useState('');
  const [done, setDone] = useState(false);
  const report = useMutation({
    mutationFn: () => api.post(`community/${target.type}/${target.id}/report`, { reason, memo: memo.trim() || null }),
    onSuccess: () => { setDone(true); void invalidate(qc); },
  });
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{t('신고하기')}</DialogTitle>
      <DialogContent>
        {report.error && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage(report.error)}</Alert>}
        {done ? (
          <Alert severity="success">{t('신고했습니다. 신고가 쌓이면 자동으로 숨겨지고 운영사가 검토합니다.')}</Alert>
        ) : (
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField select size="small" label={t('신고 사유')} value={reason} onChange={(e) => setReason(e.target.value as ReportReason)}>
              {REASONS.map((r) => <MenuItem key={r.id} value={r.id}>{t(r.label)}</MenuItem>)}
            </TextField>
            <TextField size="small" label={t('메모 (선택)')} value={memo} onChange={(e) => setMemo(e.target.value)} multiline minRows={2} slotProps={{ htmlInput: { maxLength: 300 } }} />
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('닫기')}</Button>
        {!done && <Button color="error" variant="contained" disabled={report.isPending} onClick={() => report.mutate()}>{t('신고')}</Button>}
      </DialogActions>
    </Dialog>
  );
}

function CommentItem({ c, onReply, onLike, onDelete, onReport }: {
  c: CommunityComment;
  onReply?: () => void;
  onLike: () => void;
  onDelete: () => void;
  onReport: () => void;
}) {
  const t = useT();
  const gone = c.deleted || c.hidden;
  return (
    <Box sx={{ pl: c.parentId ? 4 : 0, py: 1 }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="subtitle2" color={c.anonNo === 0 ? 'primary' : 'text.primary'}>{anonLabel(c.anonNo)}</Typography>
        {c.mine && <Chip size="small" label={t('나')} variant="outlined" sx={{ height: 20 }} />}
        <Typography variant="caption" color="text.secondary">{ago(c.createdAt)}</Typography>
        <Box sx={{ flex: 1 }} />
        {!gone && (
          <>
            <Tooltip title={t('공감')}>
              <Button size="small" onClick={onLike} startIcon={c.liked ? <FavoriteIcon fontSize="small" color="error" /> : <FavoriteBorderIcon fontSize="small" />} sx={{ minWidth: 0 }}>
                {c.likeCount}
              </Button>
            </Tooltip>
            {onReply && <Tooltip title={t('답글')}><IconButton size="small" onClick={onReply}><ReplyIcon fontSize="small" /></IconButton></Tooltip>}
            {c.mine
              ? <Tooltip title={t('삭제')}><IconButton size="small" onClick={onDelete}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
              : <Tooltip title={t('신고')}><IconButton size="small" onClick={onReport}><FlagIcon fontSize="small" /></IconButton></Tooltip>}
          </>
        )}
      </Stack>
      <Typography variant="body2" color={gone ? 'text.disabled' : 'text.primary'} sx={{ whiteSpace: 'pre-wrap', mt: 0.5 }}>
        {c.deleted ? t('삭제된 댓글입니다') : c.hidden ? t('신고·운영 정책으로 숨겨진 댓글입니다') : c.body}
      </Typography>
    </Box>
  );
}

/** COM-002~004 글 보기 + 익명 댓글 */
export function PostDialog({ id, boardName, onClose, onEdit, needRules }: {
  id: string;
  boardName: string;
  onClose: () => void;
  onEdit: (d: CommunityPostDetail) => void;
  /** 규칙 미동의면 true 를 돌려주고 동의 창을 연다 */
  needRules: () => boolean;
}) {
  const t = useT();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['community', 'post', id], queryFn: () => api.get<CommunityPostDetail>(`community/posts/${id}`) });
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<CommunityComment | null>(null);
  const [report, setReport] = useState<{ type: 'posts' | 'comments'; id: string } | null>(null);
  const setDetail = (d: CommunityPostDetail) => qc.setQueryData(['community', 'post', id], d);

  const comment = useMutation({
    mutationFn: () => api.post<CommunityPostDetail>(`community/posts/${id}/comments`, { parentId: replyTo?.id ?? null, body: text }),
    onSuccess: (d) => { setDetail(d); setText(''); setReplyTo(null); void qc.invalidateQueries({ queryKey: ['community', 'posts'] }); },
  });
  const like = useMutation({
    mutationFn: (v: { type: 'posts' | 'comments'; id: string }) => api.post(`community/${v.type}/${v.id}/like`),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['community', 'post', id] }); void qc.invalidateQueries({ queryKey: ['community', 'posts'] }); },
  });
  const delComment = useMutation({
    mutationFn: (cid: string) => api.delete(`community/comments/${cid}`),
    onSuccess: () => { void invalidate(qc); },
  });
  const delPost = useMutation({
    mutationFn: () => api.delete(`community/posts/${id}`),
    onSuccess: () => { void invalidate(qc); onClose(); },
  });

  const d = q.data;
  const err = q.error ?? comment.error ?? like.error ?? delComment.error ?? delPost.error;
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="caption" color="text.secondary" component="div">{boardName}{d && ` · ${t(categoryLabel(d.post.category))}`}</Typography>
        {d?.post.title ?? t('게시글')}
      </DialogTitle>
      <DialogContent dividers>
        {err && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage(err)}</Alert>}
        {d && (
          <>
            {d.post.hidden && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                {d.post.hidden === 'REPORTED' ? t('신고가 쌓여 다른 사람에게는 숨겨진 글입니다. 운영사가 검토 중입니다.') : t('운영 정책에 따라 숨겨진 글입니다.')}
              </Alert>
            )}
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="subtitle2">{authorLabel(d.post)}</Typography>
              {d.post.mine && <Chip size="small" label={t('내 글')} variant="outlined" sx={{ height: 20 }} />}
              <Typography variant="caption" color="text.secondary">{ago(d.post.createdAt)}</Typography>
              <Box sx={{ flex: 1 }} />
              {d.post.mine ? (
                <>
                  <Button size="small" startIcon={<EditIcon />} onClick={() => onEdit(d)}>{t('고치기')}</Button>
                  <Button size="small" color="error" startIcon={<DeleteIcon />} disabled={delPost.isPending}
                    onClick={() => { if (window.confirm(t('이 글을 지울까요?'))) delPost.mutate(); }}>{t('삭제')}</Button>
                </>
              ) : (
                <Button size="small" startIcon={<FlagIcon />} onClick={() => setReport({ type: 'posts', id })}>{t('신고')}</Button>
              )}
            </Stack>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', minHeight: 80 }}>{d.body}</Typography>
            <Box sx={{ mt: 2 }}>
              <Button variant={d.liked ? 'contained' : 'outlined'} color="error" size="small"
                startIcon={d.liked ? <FavoriteIcon /> : <FavoriteBorderIcon />} onClick={() => like.mutate({ type: 'posts', id })}>
                {t('공감 {0}', { 0: d.post.likeCount })}
              </Button>
            </Box>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" sx={{ mb: 1 }}>{t('댓글 {0}', { 0: d.post.commentCount })}</Typography>
            {d.comments.length === 0 && <Typography variant="body2" color="text.secondary">{t('첫 댓글을 남겨 보세요.')}</Typography>}
            {d.comments.map((c) => (
              <CommentItem
                key={c.id} c={c}
                onReply={c.parentId ? undefined : () => setReplyTo(c)}
                onLike={() => like.mutate({ type: 'comments', id: c.id })}
                onDelete={() => { if (window.confirm(t('이 댓글을 지울까요?'))) delComment.mutate(c.id); }}
                onReport={() => setReport({ type: 'comments', id: c.id })}
              />
            ))}
          </>
        )}
      </DialogContent>
      {d && (
        <Box sx={{ p: 2 }}>
          {replyTo && (
            <Chip size="small" sx={{ mb: 1 }} label={t('{0}에게 답글', { 0: anonLabel(replyTo.anonNo) })} onDelete={() => setReplyTo(null)} />
          )}
          <Stack direction="row" spacing={1}>
            <TextField
              fullWidth size="small" multiline maxRows={4} placeholder={t('익명으로 댓글 달기')}
              value={text} onChange={(e) => setText(e.target.value)} slotProps={{ htmlInput: { maxLength: 1000 } }}
            />
            <Button variant="contained" disabled={!text.trim() || comment.isPending} onClick={() => { if (!needRules()) comment.mutate(); }}>{t('등록')}</Button>
          </Stack>
          <Stack direction="row" justifyContent="flex-end" sx={{ mt: 1 }}>
            <Button onClick={onClose}>{t('닫기')}</Button>
          </Stack>
        </Box>
      )}
      {!d && <DialogActions><Button onClick={onClose}>{t('닫기')}</Button></DialogActions>}
      {report && <ReportDialog target={report} onClose={() => setReport(null)} />}
    </Dialog>
  );
}
