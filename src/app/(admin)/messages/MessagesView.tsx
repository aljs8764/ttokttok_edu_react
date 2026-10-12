'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AddCommentIcon from '@mui/icons-material/AddCommentOutlined';
import SendIcon from '@mui/icons-material/Send';
import NextLink from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import type { ChatMessage, Conversation } from '@/lib/comm';
import { dateTime } from '@/lib/format';
import { ownerEventDestinations, useRealtime } from '@/lib/realtime';
import { useSession } from '@/lib/session';
import type { Page, Student } from '@/lib/types';
import PageHeader from '@/components/PageHeader';
import { useT } from '@/lib/i18n';

/** NTC-007 알림장 회신 · NTC-008 학부모 1:1 채팅 — 교직원 메시지함. 교사는 담당 반 원생 대화만 보인다. */
export default function MessagesView() {
  const tr = useT();
  const qc = useQueryClient();
  const params = useSearchParams();
  const { session, manager } = useSession();
  const instId = session?.institution?.institutionId;
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selected, setSelected] = useState<string | null>(params.get('c'));
  const [newOpen, setNewOpen] = useState(false);
  const noticeId = params.get('noticeId') ?? undefined;

  const list = useQuery({
    queryKey: ['conversations', instId, unreadOnly, noticeId],
    queryFn: () => api.get<Conversation[]>('conversations', { unreadOnly, noticeId, size: 50 }),
    enabled: !!instId,
    refetchInterval: 60_000, // 소켓이 주 경로, 폴링은 안전망
  });

  useRealtime(ownerEventDestinations(manager, instId), (msg) => {
    if (msg.type === 'chat.message') {
      void qc.invalidateQueries({ queryKey: ['conversations'] });
      void qc.invalidateQueries({ queryKey: ['messages'] });
    }
  });

  const current = list.data?.find((c) => c.id === selected) ?? null;

  return (
    <>
      <PageHeader
        title={tr('메시지함')}
        menuId="NTC-008"
        description={noticeId ? tr('선택한 알림장에 달린 학부모 회신입니다.') : tr('학부모와의 1:1 대화와 알림장 회신입니다.')}
        actions={
          <Button variant="contained" startIcon={<AddCommentIcon />} onClick={() => setNewOpen(true)}>
            {tr('새 대화')}
          </Button>
        }
      />
      {list.isError && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage(list.error)}</Alert>}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '340px 1fr' }, gap: 2, alignItems: 'start' }}>
        <Paper sx={{ overflow: 'hidden' }}>
          <Box sx={{ px: 2, py: 1, borderBottom: 1, borderColor: 'divider' }}>
            <FormControlLabel control={<Switch size="small" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} />} label={tr('안 읽은 것만')} />
            {noticeId && (
              <Chip size="small" label={tr('알림장 회신만')} component={NextLink} href="/messages" clickable onDelete={() => undefined} sx={{ ml: 1 }} />
            )}
          </Box>
          <List disablePadding sx={{ maxHeight: 620, overflowY: 'auto' }}>
            {list.data?.length === 0 && (
              <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                {tr('대화가 없습니다')}
              </Typography>
            )}
            {list.data?.map((c) => (
              <ListItemButton key={c.id} selected={c.id === selected} onClick={() => setSelected(c.id)} divider>
                <ListItemText
                  primary={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2" sx={{ fontWeight: c.unread > 0 ? 700 : 500 }} noWrap>
                        {c.studentName} · {c.guardian.name}
                      </Typography>
                      {c.unread > 0 && <Badge color="error" badgeContent={c.unread} sx={{ ml: 1.5 }} />}
                    </Stack>
                  }
                  secondary={
                    <>
                      {c.notice && <Chip size="small" variant="outlined" label={tr('회신: {0}', { 0: c.notice.title })} sx={{ mr: 0.5, maxWidth: 220 }} />}
                      <Typography component="span" variant="caption" color="text.secondary">
                        {c.lastMessagePreview ?? tr('대화를 시작해 보세요')} · {dateTime(c.lastMessageAt)}
                      </Typography>
                    </>
                  }
                  secondaryTypographyProps={{ component: 'div', noWrap: true }}
                />
              </ListItemButton>
            ))}
          </List>
        </Paper>

        <Paper sx={{ minHeight: 460, display: 'flex', flexDirection: 'column' }}>
          {current ? (
            <Thread conversation={current} />
          ) : (
            <Typography color="text.secondary" align="center" sx={{ m: 'auto' }}>
              {tr('왼쪽에서 대화를 고르세요')}
            </Typography>
          )}
        </Paper>
      </Box>
      <NewChatDialog
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onOpened={(convs) => {
          setNewOpen(false);
          void qc.invalidateQueries({ queryKey: ['conversations'] });
          if (convs[0]) setSelected(convs[0].id);
        }}
      />
    </>
  );
}

function Thread({ conversation }: { conversation: Conversation }) {
  const tr = useT();
  const qc = useQueryClient();
  const { session } = useSession();
  const instId = session?.institution?.institutionId;
  const [text, setText] = useState('');
  const bottom = useRef<HTMLDivElement>(null);

  const messages = useQuery({
    queryKey: ['messages', instId, conversation.id],
    queryFn: () => api.get<ChatMessage[]>(`conversations/${conversation.id}/messages`, { limit: 100 }),
    enabled: !!instId,
  });
  const ordered = useMemo(() => [...(messages.data ?? [])].reverse(), [messages.data]); // 서버는 최신순

  const markRead = useMutation({
    mutationFn: () => api.post(`conversations/${conversation.id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversations'] }),
  });
  useEffect(() => {
    if (conversation.unread > 0) markRead.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id, conversation.unread, messages.data?.length]);
  useEffect(() => bottom.current?.scrollIntoView({ block: 'end' }), [ordered.length, conversation.id]);

  const send = useMutation({
    mutationFn: () => api.post(`conversations/${conversation.id}/messages`, { body: text.trim() }),
    onSuccess: () => {
      setText('');
      void qc.invalidateQueries({ queryKey: ['messages'] });
      void qc.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  return (
    <>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {tr('{0} 학부모 · {1}', { 0: conversation.studentName, 1: conversation.guardian.name })}
        </Typography>
        {conversation.notice && (
          <Typography variant="caption" color="text.secondary" component={NextLink} href={`/notices/${conversation.notice.id}`}>
            {tr('알림장 「{0}」에 대한 회신', { 0: conversation.notice.title })}
          </Typography>
        )}
      </Box>
      <Stack spacing={1} sx={{ p: 2, flex: 1, overflowY: 'auto', maxHeight: 460 }}>
        {ordered.map((m) => (
          <Box key={m.id} sx={{ alignSelf: m.side === 'STAFF' ? 'flex-end' : 'flex-start', maxWidth: '75%' }}>
            <Box sx={{ px: 1.5, py: 1, borderRadius: 2, bgcolor: m.side === 'STAFF' ? 'primary.main' : 'action.hover', color: m.side === 'STAFF' ? 'primary.contrastText' : 'text.primary', whiteSpace: 'pre-wrap' }}>
              {m.body}
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: m.side === 'STAFF' ? 'right' : 'left' }}>
              {m.senderName} · {dateTime(m.createdAt)}
            </Typography>
          </Box>
        ))}
        <div ref={bottom} />
      </Stack>
      {send.isError && <Alert severity="error" sx={{ mx: 2 }}>{errorMessage(send.error)}</Alert>}
      <Stack direction="row" spacing={1} sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <TextField
          fullWidth
          size="small"
          multiline
          maxRows={4}
          placeholder={tr('메시지를 입력하세요 (Ctrl+Enter 전송)')}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && text.trim() && !send.isPending) send.mutate();
          }}
          inputProps={{ maxLength: 2000 }}
        />
        <IconButton color="primary" disabled={!text.trim() || send.isPending} onClick={() => send.mutate()} aria-label={tr('보내기')}>
          <SendIcon />
        </IconButton>
      </Stack>
    </>
  );
}

/** 교직원이 먼저 말 걸기 — 원생을 고르면 앱 연결된 보호자마다 대화가 하나씩 열린다 */
function NewChatDialog({ open, onClose, onOpened }: { open: boolean; onClose: () => void; onOpened: (c: Conversation[]) => void }) {
  const tr = useT();
  const { session } = useSession();
  const instId = session?.institution?.institutionId;
  const [input, setInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [student, setStudent] = useState<Student | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setKeyword(input.trim()), 300);
    return () => clearTimeout(t);
  }, [input]);
  const students = useQuery({
    queryKey: ['students', instId, 'chat-search', keyword],
    queryFn: () => api.get<Page<Student>>('students', { keyword, status: 'ACTIVE', size: 20 }),
    enabled: !!instId && open && keyword.length > 0,
  });
  const openChat = useMutation({
    mutationFn: () => api.post<Conversation[] | Conversation>('conversations/open', { studentId: student!.id }),
    onSuccess: (r) => (setStudent(null), onOpened(Array.isArray(r) ? r : [r])),
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{tr('새 대화')}</DialogTitle>
      <DialogContent>
        <Autocomplete
          sx={{ mt: 1 }}
          options={students.data?.items ?? []}
          getOptionLabel={(s) => s.name}
          value={student}
          onChange={(_, v) => setStudent(v)}
          inputValue={input}
          onInputChange={(_, v) => setInput(v)}
          filterOptions={(o) => o}
          noOptionsText={keyword ? tr('검색 결과가 없습니다') : tr('원생 이름을 입력하세요')}
          renderInput={(p) => <TextField {...p} label={tr('원생 검색')} />}
        />
        {openChat.isError && <Alert severity="error" sx={{ mt: 2 }}>{errorMessage(openChat.error)}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{tr('닫기')}</Button>
        <Button variant="contained" disabled={!student || openChat.isPending} onClick={() => openChat.mutate()}>
          {tr('대화 열기')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
