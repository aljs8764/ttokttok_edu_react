'use client';

import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import EditIcon from '@mui/icons-material/Edit';
import PushPinIcon from '@mui/icons-material/PushPin';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import { dateTime } from '@/lib/format';
import { NOTICE_KIND, NOTICE_STATUS } from '@/lib/notice';
import { ownerEventDestinations, useRealtime } from '@/lib/realtime';
import { useSession } from '@/lib/session';
import type { Notice, NoticeKind, NoticeStatus, Page } from '@/lib/types';
import PageHeader from '@/components/PageHeader';
import { targetSummary } from '@/components/TargetPicker';

/** NTC-004 발송 이력 — 교사는 본인 작성분만. 열람률은 원생 기준 */
export default function NoticesView() {
  const qc = useQueryClient();
  const router = useRouter();
  const { session, manager } = useSession();
  const instId = session?.institution?.institutionId;
  const [kind, setKind] = useState<NoticeKind | ''>('');
  const [status, setStatus] = useState<NoticeStatus | ''>('');
  const [page, setPage] = useState(0);

  const list = useQuery({
    queryKey: ['notices', instId, kind, status, page],
    queryFn: () => api.get<Page<Notice>>('notices', { kind: kind || undefined, status: status || undefined, page, size: 20 }),
    enabled: !!instId,
    placeholderData: keepPreviousData,
    refetchInterval: manager ? false : 120_000, // 교사는 개인 큐가 주 경로, 폴링은 안전망
  });

  // 열람·발송 신호: 원장·실장은 기관 토픽, 교사는 개인 큐(본인 작성분)
  useRealtime(ownerEventDestinations(manager, instId), (msg) => {
    if (msg.type === 'notice.read' || msg.type === 'notice.sent') void qc.invalidateQueries({ queryKey: ['notices'] });
  });

  return (
    <>
      <PageHeader
        title="알림장"
        menuId="NTC-004"
        description={manager ? '보낸 알림장과 공지, 예약 건을 봅니다. 열람률은 원생 기준입니다.' : '내가 쓴 알림장만 보입니다.'}
        actions={
          <Button variant="contained" startIcon={<EditIcon />} component={NextLink} href="/notices/new">
            알림장 쓰기
          </Button>
        }
      />

      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
        <TextField select size="small" label="종류" value={kind} onChange={(e) => (setKind(e.target.value as NoticeKind | ''), setPage(0))} sx={{ minWidth: 130 }}>
          <MenuItem value="">전체</MenuItem>
          <MenuItem value="NOTE">알림장</MenuItem>
          <MenuItem value="ANNOUNCEMENT">공지</MenuItem>
        </TextField>
        <TextField select size="small" label="상태" value={status} onChange={(e) => (setStatus(e.target.value as NoticeStatus | ''), setPage(0))} sx={{ minWidth: 130 }}>
          <MenuItem value="">전체</MenuItem>
          {(Object.keys(NOTICE_STATUS) as NoticeStatus[]).map((s) => (
            <MenuItem key={s} value={s}>
              {NOTICE_STATUS[s].label}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {list.isError && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage(list.error)}</Alert>}

      <Paper>
        {list.isFetching && <LinearProgress />}
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>제목</TableCell>
                <TableCell>대상</TableCell>
                <TableCell>상태</TableCell>
                <TableCell>발송(예정)</TableCell>
                <TableCell sx={{ width: 180 }}>열람률</TableCell>
                {manager && <TableCell>작성</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {list.data?.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    알림장이 없습니다
                  </TableCell>
                </TableRow>
              )}
              {list.data?.items.map((n) => (
                <TableRow key={n.id} hover onClick={() => router.push(`/notices/${n.id}`)} sx={{ cursor: 'pointer' }}>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {n.pinned && <PushPinIcon fontSize="small" color="secondary" />}
                      <Chip size="small" label={NOTICE_KIND[n.kind]} variant="outlined" color={n.kind === 'ANNOUNCEMENT' ? 'primary' : 'default'} />
                      <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                        {n.title}
                      </Typography>
                      {n.attachments.length > 0 && (
                        <Typography variant="caption" color="text.secondary">
                          📎{n.attachments.length}
                        </Typography>
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell>{targetSummary(n.targets)}</TableCell>
                  <TableCell>
                    <Chip size="small" label={NOTICE_STATUS[n.status].label} color={NOTICE_STATUS[n.status].color} />
                  </TableCell>
                  <TableCell>{dateTime(n.sentAt ?? n.scheduledAt)}</TableCell>
                  <TableCell>
                    <ReadRate stats={n.readStats} />
                  </TableCell>
                  {manager && <TableCell>{n.author.name}</TableCell>}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={list.data?.totalElements ?? 0}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={20}
          rowsPerPageOptions={[20]}
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} / 총 ${count}건`}
        />
      </Paper>
    </>
  );
}

export function ReadRate({ stats }: { stats: Notice['readStats'] }) {
  if (!stats || stats.targetStudents === 0)
    return (
      <Typography variant="body2" color="text.secondary">
        -
      </Typography>
    );
  // 알림장별 rate 는 0~1 비율 (대시보드 KPI 는 % 값)
  const rate = (stats.rate ?? stats.readStudents / stats.targetStudents) * 100;
  return (
    <Box>
      <Typography variant="caption">
        {stats.readStudents}/{stats.targetStudents}명 · {rate.toFixed(0)}%
      </Typography>
      <LinearProgress variant="determinate" value={Math.min(100, rate)} color={rate >= 80 ? 'success' : rate >= 50 ? 'primary' : 'warning'} sx={{ height: 5, borderRadius: 3 }} />
    </Box>
  );
}
