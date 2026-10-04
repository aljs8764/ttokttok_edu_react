'use client';

import { Fragment, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
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
import ExpandIcon from '@mui/icons-material/ExpandMore';
import CollapseIcon from '@mui/icons-material/ExpandLess';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { type Dayjs } from 'dayjs';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import { useSession } from '@/lib/session';
import type { AuditLog, Page } from '@/lib/types';

/** 백엔드가 남기는 감사 액션 (AuditEntry.action) */
const ACTIONS: Record<string, string> = {
  ATTENDANCE_STATUS_CHANGE: '출결 수동 변경',
  ATTENDANCE_ABSENCE_REASON: '결석 사유 입력',
  ATTENDANCE_EVIDENCE: '결석 증빙 첨부',
  ATTENDANCE_EXPORT: '출석부 엑셀 다운로드',
  EVENT_RSVP_EXPORT: '행사 명단 다운로드',
  INSTITUTION_UPDATE: '기관 정보 변경',
};

/** SEC-002 감사 로그 (원장 전용, 최신순 50건씩). 개인정보 다운로드·출결 정정·기준 변경 이력 */
export default function AuditTab() {
  const { session } = useSession();
  const instId = session?.institution?.institutionId;
  const [action, setAction] = useState('');
  const [from, setFrom] = useState<Dayjs | null>(dayjs().subtract(30, 'day'));
  const [to, setTo] = useState<Dayjs | null>(dayjs());
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<number | null>(null);

  const logs = useQuery({
    queryKey: ['audit-logs', instId, action, from?.format('YYYY-MM-DD'), to?.format('YYYY-MM-DD'), page],
    queryFn: () =>
      api.get<Page<AuditLog>>('audit-logs', {
        action: action || undefined,
        from: from?.isValid() ? from.startOf('day').toISOString() : undefined,
        to: to?.isValid() ? to.endOf('day').toISOString() : undefined,
        page,
        size: 50,
      }),
    enabled: !!instId,
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
        <TextField select size="small" label="작업" value={action} onChange={(e) => (setAction(e.target.value), setPage(0))} sx={{ minWidth: 200 }}>
          <MenuItem value="">전체</MenuItem>
          {Object.entries(ACTIONS).map(([k, v]) => (
            <MenuItem key={k} value={k}>
              {v}
            </MenuItem>
          ))}
        </TextField>
        <DatePicker label="시작일" value={from} onChange={(v) => (setFrom(v), setPage(0))} format="YYYY-MM-DD" maxDate={to ?? undefined} slotProps={{ textField: { size: 'small' } }} />
        <DatePicker label="종료일" value={to} onChange={(v) => (setTo(v), setPage(0))} format="YYYY-MM-DD" minDate={from ?? undefined} disableFuture slotProps={{ textField: { size: 'small' } }} />
      </Stack>

      {logs.isError && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage(logs.error)}</Alert>}

      <Paper>
        {logs.isFetching && <LinearProgress />}
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell width={150}>시각</TableCell>
                <TableCell>작업</TableCell>
                <TableCell>한 사람</TableCell>
                <TableCell>대상</TableCell>
                <TableCell width={48} />
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.data?.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    기록이 없습니다
                  </TableCell>
                </TableRow>
              )}
              {logs.data?.items.map((l) => (
                <Fragment key={l.id}>
                  <TableRow hover>
                    <TableCell>{dayjs(l.at).format('YYYY-MM-DD HH:mm')}</TableCell>
                    <TableCell>{ACTIONS[l.action] ?? l.action}</TableCell>
                    <TableCell>{l.actor.name}</TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 320 }}>
                        {summarize(l.diff) || l.resource}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => setOpen(open === l.id ? null : l.id)} aria-label="자세히">
                        {open === l.id ? <CollapseIcon fontSize="small" /> : <ExpandIcon fontSize="small" />}
                      </IconButton>
                    </TableCell>
                  </TableRow>
                  {open === l.id && (
                    <TableRow>
                      <TableCell colSpan={5} sx={{ bgcolor: 'background.default' }}>
                        <Box component="pre" sx={{ m: 0, fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                          {JSON.stringify({ resource: l.resource, resourceId: l.resourceId, ...l.diff }, null, 2)}
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={logs.data?.totalElements ?? 0}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={50}
          rowsPerPageOptions={[50]}
          labelDisplayedRows={({ from: a, to: b, count }) => `${a}–${b} / 총 ${count}건`}
        />
      </Paper>
    </>
  );
}

/** diff 를 한 줄로: "status: IN → ABSENT, reason: …" */
function summarize(diff: Record<string, unknown>) {
  return Object.entries(diff)
    .slice(0, 3)
    .map(([k, v]) => {
      if (v && typeof v === 'object' && 'from' in v && 'to' in v) {
        const c = v as { from: unknown; to: unknown };
        return `${k}: ${String(c.from)} → ${String(c.to)}`;
      }
      return `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`;
    })
    .join(', ');
}
