'use client';

import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import dayjs from 'dayjs';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import { dateTime } from '@/lib/format';
import { useRealtime } from '@/lib/realtime';
import { useSession } from '@/lib/session';
import type { Page, SchoolEvent, Tally } from '@/lib/types';
import PageHeader from '@/components/PageHeader';
import { targetSummary } from '@/components/TargetPicker';

/** EVT-001 행사 목록 — 다가오는 행사(기본) / 지난 행사. 교사는 본인이 만든 행사만 */
export default function EventsView() {
  const qc = useQueryClient();
  const router = useRouter();
  const { session, manager } = useSession();
  const instId = session?.institution?.institutionId;
  const [upcoming, setUpcoming] = useState(true);
  const [page, setPage] = useState(0);

  const list = useQuery({
    queryKey: ['events', instId, upcoming, page],
    queryFn: () => api.get<Page<SchoolEvent>>('events', { upcoming, page, size: 20 }),
    enabled: !!instId,
    placeholderData: keepPreviousData,
  });

  useRealtime(manager && instId ? [`/topic/inst.${instId}`] : [], (msg) => {
    if (msg.type === 'event.responded') void qc.invalidateQueries({ queryKey: ['events'] });
  });

  return (
    <>
      <PageHeader
        title="행사(RSVP)"
        menuId="EVT-001"
        description="참석 여부는 학부모 앱에서 받고, 마감 전 미응답자에게 자동 독촉이 갑니다."
        actions={
          <Button variant="contained" startIcon={<AddIcon />} component={NextLink} href="/events/new">
            행사 만들기
          </Button>
        }
      />

      <ToggleButtonGroup exclusive size="small" value={upcoming ? 'up' : 'past'} onChange={(_, v) => v && (setUpcoming(v === 'up'), setPage(0))} sx={{ mb: 2 }}>
        <ToggleButton value="up">다가오는 행사</ToggleButton>
        <ToggleButton value="past">전체(지난 행사 포함)</ToggleButton>
      </ToggleButtonGroup>

      {list.isError && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage(list.error)}</Alert>}

      <Paper>
        {list.isFetching && <LinearProgress />}
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>행사</TableCell>
                <TableCell>일시</TableCell>
                <TableCell>대상</TableCell>
                <TableCell>응답 마감</TableCell>
                <TableCell sx={{ width: 220 }}>응답 현황</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {list.data?.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    {upcoming ? '다가오는 행사가 없습니다' : '행사가 없습니다'}
                  </TableCell>
                </TableRow>
              )}
              {list.data?.items.map((e) => {
                const closed = e.rsvpDeadline ? dayjs(e.rsvpDeadline).isBefore(dayjs()) : false;
                return (
                  <TableRow key={e.id} hover onClick={() => router.push(`/events/${e.id}`)} sx={{ cursor: 'pointer', opacity: e.status === 'CANCELED' ? 0.5 : 1 }}>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {e.title}
                        </Typography>
                        {e.status === 'CANCELED' && <Chip size="small" label="취소" />}
                      </Stack>
                      {e.location && (
                        <Typography variant="caption" color="text.secondary">
                          {e.location}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{dateTime(e.startsAt)}</TableCell>
                    <TableCell>{targetSummary(e.targets)}</TableCell>
                    <TableCell>
                      {e.rsvpEnabled ? (
                        <Stack direction="row" spacing={1} alignItems="center">
                          <span>{dateTime(e.rsvpDeadline)}</span>
                          {closed && <Chip size="small" label="마감" variant="outlined" />}
                        </Stack>
                      ) : (
                        '안 받음'
                      )}
                    </TableCell>
                    <TableCell>{e.rsvpEnabled && e.tally ? <TallyBar tally={e.tally} /> : '-'}</TableCell>
                  </TableRow>
                );
              })}
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

/** 참석(초록)·불참(빨강)·미응답(회색) 비율 막대 */
export function TallyBar({ tally, large }: { tally: Tally; large?: boolean }) {
  const total = Math.max(1, tally.targets);
  const seg = (n: number, color: string) => <Box sx={{ width: `${(n / total) * 100}%`, bgcolor: color }} />;
  return (
    <Box>
      <Typography variant={large ? 'body2' : 'caption'}>
        참석 {tally.attend} · 불참 {tally.absent} · 미응답 {tally.pending} / {tally.targets}명
      </Typography>
      <Box sx={{ display: 'flex', height: large ? 10 : 6, borderRadius: 3, overflow: 'hidden', bgcolor: 'grey.200', mt: 0.5 }}>
        {seg(tally.attend, 'success.main')}
        {seg(tally.absent, 'error.main')}
      </Box>
    </Box>
  );
}
