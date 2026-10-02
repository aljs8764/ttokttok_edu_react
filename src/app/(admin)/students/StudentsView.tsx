'use client';

import { useEffect, useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import InputAdornment from '@mui/material/InputAdornment';
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
import LinearProgress from '@mui/material/LinearProgress';
import SearchIcon from '@mui/icons-material/Search';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import { useSession } from '@/lib/session';
import type { Classroom, Page, Student, StudentStatus } from '@/lib/types';
import PageHeader from '@/components/PageHeader';

const STATUS: Record<StudentStatus, { label: string; color: 'success' | 'warning' | 'default' }> = {
  ACTIVE: { label: '재원', color: 'success' },
  PAUSED: { label: '휴원', color: 'warning' },
  WITHDRAWN: { label: '퇴원', color: 'default' },
};

const LINK: Record<string, { label: string; color: 'success' | 'default' | 'warning' }> = {
  LINKED: { label: '앱 연결', color: 'success' },
  PENDING: { label: '설치 대기', color: 'warning' },
  UNLINKED: { label: '연결 해제', color: 'default' },
};

/** STU-001 원생 목록 — 반·재원상태 필터, 이름/보호자 번호 뒷 4자리 검색, 20개씩 */
export default function StudentsView() {
  const { session, manager } = useSession();
  const instId = session?.institution?.institutionId;
  const [classId, setClassId] = useState('');
  const [status, setStatus] = useState<StudentStatus | ''>('ACTIVE');
  const [input, setInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(0);

  // 입력이 멈추면 검색 (0.3초)
  useEffect(() => {
    const t = setTimeout(() => {
      setKeyword(input.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [input]);

  const classes = useQuery({ queryKey: ['classes', instId], queryFn: () => api.get<Classroom[]>('classes'), enabled: !!instId });
  const classNames = useMemo(() => new Map((classes.data ?? []).map((c) => [c.id, c.name])), [classes.data]);

  const list = useQuery({
    queryKey: ['students', instId, classId, status, keyword, page],
    queryFn: () => api.get<Page<Student>>('students', { classId: classId || undefined, status: status || undefined, keyword: keyword || undefined, page, size: 20 }),
    enabled: !!instId,
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader
        title="원생 관리"
        menuId="STU-001"
        description={manager ? '등록·엑셀 업로드·가입 승인 화면은 다음 단계에서 추가됩니다.' : '담당 반 원생만 보이며, 생년월일·연락처는 마스킹됩니다.'}
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder="이름 또는 보호자 번호 뒷 4자리"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          sx={{ minWidth: 260 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        <TextField select size="small" label="반" value={classId} onChange={(e) => (setClassId(e.target.value), setPage(0))} sx={{ minWidth: 150 }}>
          <MenuItem value="">전체</MenuItem>
          {(classes.data ?? []).map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {c.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField select size="small" label="상태" value={status} onChange={(e) => (setStatus(e.target.value as StudentStatus | ''), setPage(0))} sx={{ minWidth: 120 }}>
          <MenuItem value="">전체</MenuItem>
          {(Object.keys(STATUS) as StudentStatus[]).map((s) => (
            <MenuItem key={s} value={s}>
              {STATUS[s].label}
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
                <TableCell>이름</TableCell>
                <TableCell>반</TableCell>
                <TableCell>보호자</TableCell>
                <TableCell>생년월일</TableCell>
                <TableCell>학년</TableCell>
                <TableCell>상태</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {list.data?.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    조건에 맞는 원생이 없습니다
                  </TableCell>
                </TableRow>
              )}
              {list.data?.items.map((s) => (
                <TableRow key={s.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{s.name}</TableCell>
                  <TableCell>{s.classroomIds.map((id) => classNames.get(id) ?? '-').join(', ') || '-'}</TableCell>
                  <TableCell>
                    <Stack spacing={0.5}>
                      {s.guardians.map((g) => (
                        <Stack key={g.id} direction="row" spacing={1} alignItems="center">
                          <Typography variant="body2">
                            {g.phone}
                            {g.relation ? ` (${g.relation})` : ''}
                          </Typography>
                          <Chip size="small" variant="outlined" color={LINK[g.linkStatus]?.color} label={LINK[g.linkStatus]?.label ?? g.linkStatus} />
                        </Stack>
                      ))}
                    </Stack>
                  </TableCell>
                  <TableCell>{s.birthDate ?? '••••-••-••'}</TableCell>
                  <TableCell>{s.grade ?? '-'}</TableCell>
                  <TableCell>
                    <Chip size="small" label={STATUS[s.status].label} color={STATUS[s.status].color} variant={s.status === 'WITHDRAWN' ? 'outlined' : 'filled'} />
                  </TableCell>
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
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} / 총 ${count}명`}
        />
      </Paper>
    </>
  );
}
