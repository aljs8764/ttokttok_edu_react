'use client';

import { useEffect, useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import InputAdornment from '@mui/material/InputAdornment';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/EditOutlined';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import ChatIcon from '@mui/icons-material/ChatBubbleOutline';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import PageHeader from '@/components/PageHeader';
import { api, errorMessage } from '@/lib/api';
import { useT } from '@/lib/i18n';
import {
  CATEGORIES, ago, authorLabel, boardLabel, categoryLabel,
  type CommunityBoard, type CommunityMe, type CommunityPage, type CommunityPostDetail, type CommunityPostSummary,
  type MyCommunityComment, type PostCategory, type PostSort,
} from '@/lib/community';
import { PostDialog, RulesDialog, WriteDialog } from './CommunityDialogs';

const MY = '__mine__';

function PostRow({ p, onOpen, showBoard }: { p: CommunityPostSummary; onOpen: () => void; showBoard?: string }) {
  const t = useT();
  return (
    <ListItemButton onClick={onOpen} divider sx={{ alignItems: 'flex-start', py: 1.5 }}>
      <ListItemText
        primary={
          <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
            <Chip size="small" label={t(categoryLabel(p.category))} sx={{ height: 20 }} />
            <Typography variant="subtitle1" noWrap sx={{ minWidth: 0 }}>{p.title}</Typography>
            {p.hidden && <Chip size="small" color="warning" label={t('숨김')} sx={{ height: 20 }} />}
          </Stack>
        }
        secondary={
          <>
            <Typography variant="body2" color="text.secondary" noWrap component="span" sx={{ display: 'block', mt: 0.5 }}>{p.preview}</Typography>
            <Stack direction="row" spacing={1.5} alignItems="center" component="span" sx={{ mt: 0.5, color: 'text.secondary' }}>
              <Typography variant="caption" component="span">{showBoard ?? authorLabel(p)}</Typography>
              <Typography variant="caption" component="span">{ago(p.createdAt)}</Typography>
              <Stack direction="row" spacing={0.3} alignItems="center" component="span"><FavoriteBorderIcon sx={{ fontSize: 14 }} /><Typography variant="caption" component="span">{p.likeCount}</Typography></Stack>
              <Stack direction="row" spacing={0.3} alignItems="center" component="span"><ChatIcon sx={{ fontSize: 14 }} /><Typography variant="caption" component="span">{p.commentCount}</Typography></Stack>
            </Stack>
          </>
        }
        slotProps={{ primary: { component: 'div' }, secondary: { component: 'div' } }}
      />
    </ListItemButton>
  );
}

/** COM-001~009 익명 커뮤니티 (원장·실장·교사) */
export default function CommunityView() {
  const t = useT();
  const boardsQ = useQuery({ queryKey: ['community', 'boards'], queryFn: () => api.get<CommunityBoard[]>('community/boards') });
  const meQ = useQuery({ queryKey: ['community', 'me'], queryFn: () => api.get<CommunityMe>('community/me') });
  const boards = useMemo(() => boardsQ.data ?? [], [boardsQ.data]);
  const [boardKey, setBoardKey] = useState<string | null>(null);
  const [sort, setSort] = useState<PostSort>('LATEST');
  const [category, setCategory] = useState<PostCategory | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [writing, setWriting] = useState<{ editing?: CommunityPostDetail } | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [myTab, setMyTab] = useState<'posts' | 'comments'>('posts');

  useEffect(() => {
    if (boardKey == null && boards.length > 0) setBoardKey(boards[0].key);
  }, [boards, boardKey]);

  const me = meQ.data;
  const sanctioned = !!me && (me.sanctionPermanent || !!me.sanctionedUntil);
  const board = boards.find((b) => b.key === boardKey);
  const isMine = boardKey === MY;

  const postsQ = useInfiniteQuery({
    queryKey: ['community', 'posts', boardKey, sort, category, q],
    enabled: !!board,
    initialPageParam: 0,
    queryFn: ({ pageParam }) => api.get<CommunityPage>(`community/boards/${encodeURIComponent(boardKey!)}/posts`, {
      sort, category: category === 'ALL' ? undefined : category, q: q || undefined, page: pageParam,
    }),
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
  });
  const myPostsQ = useInfiniteQuery({
    queryKey: ['community', 'posts', MY],
    enabled: isMine && myTab === 'posts',
    initialPageParam: 0,
    queryFn: ({ pageParam }) => api.get<CommunityPage>('community/me/posts', { page: pageParam }),
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
  });
  const myCommentsQ = useQuery({
    queryKey: ['community', 'my-comments'],
    enabled: isMine && myTab === 'comments',
    queryFn: () => api.get<MyCommunityComment[]>('community/me/comments', { page: 0 }),
  });

  /** 규칙 미동의면 동의 창을 열고 true */
  const needRules = () => {
    if (me && !me.rulesAgreed) { setRulesOpen(true); return true; }
    return false;
  };
  const boardName = (key: string) => {
    const b = boards.find((x) => x.key === key);
    return b ? boardLabel(b) : '';
  };

  const lounges = boards.filter((b) => b.scope === 'LOUNGE');
  const insts = boards.filter((b) => b.scope === 'INSTITUTION');
  const posts = (isMine ? myPostsQ.data : postsQ.data)?.pages.flatMap((p) => p.items) ?? [];
  const activeQ = isMine ? myPostsQ : postsQ;
  const err = boardsQ.error ?? meQ.error ?? activeQ.error ?? myCommentsQ.error;

  const boardItem = (b: CommunityBoard) => (
    <ListItemButton key={b.key} selected={boardKey === b.key} onClick={() => { setBoardKey(b.key); setCategory('ALL'); setQ(''); setSearch(''); }}>
      <ListItemText primary={boardLabel(b)} />
    </ListItemButton>
  );

  return (
    <>
      <PageHeader
        title="커뮤니티" menuId="COM"
        description={t('같은 역할끼리 익명으로 고민과 정보를 나눕니다. 이름은 화면에 보이지 않습니다.')}
        actions={board && !isMine ? (
          <Button variant="contained" startIcon={<EditIcon />} disabled={sanctioned}
            onClick={() => { if (!needRules()) setWriting({}); }}>{t('글쓰기')}</Button>
        ) : undefined}
      />
      {err && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage(err)}</Alert>}
      {me && sanctioned && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {me.sanctionPermanent
            ? t('커뮤니티 이용이 영구 제한되었습니다. 사유: {0}', { 0: me.sanctionReason ?? '-' })
            : t('{0}까지 커뮤니티 글·댓글 작성이 제한됩니다. 사유: {1}', { 0: dayjs(me.sanctionedUntil).format('YYYY.M.D HH:mm'), 1: me.sanctionReason ?? '-' })}
        </Alert>
      )}
      {me && !me.rulesAgreed && boards.length > 0 && (
        <Alert severity="info" sx={{ mb: 2 }} action={<Button color="inherit" size="small" onClick={() => setRulesOpen(true)}>{t('규칙 보기')}</Button>}>
          {t('글·댓글을 쓰려면 이용 규칙에 먼저 동의해 주세요.')}
        </Alert>
      )}
      {boardsQ.isSuccess && boards.length === 0 && (
        <Alert severity="info">{t('이용할 수 있는 게시판이 없습니다. 운영 중인 기관에 원장·실장·교사로 소속되어 있어야 합니다.')}</Alert>
      )}

      {boards.length > 0 && (
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="flex-start">
          <Paper variant="outlined" sx={{ width: { xs: '100%', md: 240 }, flexShrink: 0 }}>
            <List dense disablePadding>
              {lounges.length > 0 && <ListSubheader>{t('전국 라운지')}</ListSubheader>}
              {lounges.map(boardItem)}
              {insts.length > 0 && <ListSubheader>{t('우리 기관')}</ListSubheader>}
              {insts.map(boardItem)}
              <ListSubheader>{t('내 활동')}</ListSubheader>
              <ListItemButton selected={isMine} onClick={() => setBoardKey(MY)}>
                <ListItemText primary={t('내가 쓴 글·댓글')} />
                {!!me?.newComments && <Badge color="error" badgeContent={me.newComments} sx={{ mr: 1 }} />}
              </ListItemButton>
            </List>
          </Paper>

          <Paper variant="outlined" sx={{ flex: 1, minWidth: 0, width: '100%' }}>
            {isMine ? (
              <Tabs value={myTab} onChange={(_, v: 'posts' | 'comments') => setMyTab(v)} sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Tab value="posts" label={t('내 글')} />
                <Tab value="comments" label={t('내 댓글')} />
              </Tabs>
            ) : board && (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }} alignItems={{ sm: 'center' }}>
                <ToggleButtonGroup size="small" exclusive value={sort} onChange={(_, v: PostSort | null) => v && setSort(v)}>
                  <ToggleButton value="LATEST">{t('최신')}</ToggleButton>
                  <ToggleButton value="POPULAR">{t('인기 (7일)')}</ToggleButton>
                </ToggleButtonGroup>
                <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', rowGap: 0.5 }}>
                  <Chip size="small" label={t('전체')} color={category === 'ALL' ? 'primary' : 'default'} onClick={() => setCategory('ALL')} />
                  {CATEGORIES.map((c) => (
                    <Chip key={c.id} size="small" label={t(c.label)} color={category === c.id ? 'primary' : 'default'} onClick={() => setCategory(c.id)} />
                  ))}
                </Stack>
                <Box sx={{ flex: 1 }} />
                <TextField
                  size="small" placeholder={t('제목·내용 검색')} value={search} onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') setQ(search.trim()); }}
                  slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
                  sx={{ minWidth: 200 }}
                />
              </Stack>
            )}

            {isMine && myTab === 'comments' ? (
              <List disablePadding>
                {myCommentsQ.data?.length === 0 && <Typography sx={{ p: 3 }} color="text.secondary">{t('쓴 댓글이 없습니다.')}</Typography>}
                {myCommentsQ.data?.map((c) => (
                  <ListItemButton key={c.id} divider onClick={() => setOpenId(c.postId)}>
                    <ListItemText
                      primary={c.deleted ? t('삭제된 댓글입니다') : c.body}
                      secondary={`${c.postTitle} · ${ago(c.createdAt)}`}
                      slotProps={{ primary: { color: c.deleted ? 'text.disabled' : undefined } }}
                    />
                  </ListItemButton>
                ))}
              </List>
            ) : (
              <List disablePadding>
                {activeQ.isLoading && <Box sx={{ p: 3, textAlign: 'center' }}><CircularProgress size={24} /></Box>}
                {activeQ.isSuccess && posts.length === 0 && (
                  <Typography sx={{ p: 3 }} color="text.secondary">
                    {isMine ? t('쓴 글이 없습니다.') : q ? t('검색 결과가 없습니다.') : t('아직 글이 없습니다. 첫 글을 남겨 보세요.')}
                  </Typography>
                )}
                {posts.map((p) => (
                  <PostRow key={p.id} p={p} onOpen={() => setOpenId(p.id)} showBoard={isMine ? boardName(p.boardKey) : undefined} />
                ))}
                {activeQ.hasNextPage && (
                  <Box sx={{ p: 1.5, textAlign: 'center' }}>
                    <Button onClick={() => void activeQ.fetchNextPage()} disabled={activeQ.isFetchingNextPage}>{t('더보기')}</Button>
                  </Box>
                )}
              </List>
            )}
          </Paper>
        </Stack>
      )}

      {openId && (
        <PostDialog
          id={openId}
          boardName={(() => {
            const p = posts.find((x) => x.id === openId);
            return p ? boardName(p.boardKey) : board ? boardLabel(board) : '';
          })()}
          onClose={() => setOpenId(null)}
          onEdit={(d) => { setOpenId(null); setWriting({ editing: d }); }}
          needRules={needRules}
        />
      )}
      {writing && (board || writing.editing) && (
        <WriteDialog
          boardKey={writing.editing?.post.boardKey ?? board!.key}
          editing={writing.editing}
          onClose={() => setWriting(null)}
          onSaved={(d) => { setWriting(null); setOpenId(d.post.id); }}
        />
      )}
      <RulesDialog open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </>
  );
}
