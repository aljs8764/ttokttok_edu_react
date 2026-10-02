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
import Badge from '@mui/material/Badge';
import Button from '@mui/material/Button';
import PersonAddIcon from '@mui/icons-material/PersonAddAlt1';
import UploadIcon from '@mui/icons-material/UploadFile';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import SendIcon from '@mui/icons-material/Send';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import { useSession } from '@/lib/session';
import type { Classroom, JoinRequest, Page, Student, StudentStatus } from '@/lib/types';
import { LINK_STATUS, STUDENT_STATUS } from '@/lib/student';
import RegisterStudentDialog from '@/components/students/RegisterStudentDialog';
import InviteParentDialog from '@/components/students/InviteParentDialog';
import PageHeader from '@/components/PageHeader';

/**
 * STU-001 원생 목록 — 반·재원상태 필터, 이름/보호자 번호 뒷 4자리 검색, 20개씩.
 * 원장·실장은 등록(STU-003)·엑셀 업로드(STU-002)·가입 승인(STU-004)·초대(STU-005)로 이어진다.
 */
export default function StudentsView() {
  const { session, manager } = useSession();
  const instId = session?.institution?.institutionId;
  const [classId, setClassId] = useState('');
  const [status, setStatus] = useState<StudentStatus | ''>('ACTIVE');
  const [input, setInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(0);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const router = useRouter();

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

  const pending = useQuery({
    queryKey: ['join-requests', instId, 'PENDING'],
    queryFn: () => api.get<JoinRequest[]>('join-requests', { status: 'PENDING' }),
    enabled: !!instId && manager,
  });

  return (
    <>
      <PageHeader
        title="원생 관리"
        menuId="STU-001"
        description={manager ? '행을 누르면 상세(반 이동·상태 변경·보호자 관리)로 이동합니다.' : '담당 반 원생만 보이며, 생년월일·연락처는 마스킹됩니다.'}
        actions={
          manager && (
            <>
              <Badge color="secondary" badgeContent={pending.data?.length ?? 0}>
                <Button variant="outlined" startIcon={<HowToRegIcon />} component={NextLink} href="/students/join-requests">
                  가입 승인
                </Button>
              </Badge>
              <Button variant="outlined" startIcon={<SendIcon />} onClick={() => setInviteOpen(true)}>
                학부모 초대
              </Button>
              <Button variant="outlined" startIcon={<UploadIcon />} component={NextLink} href="/students/import">
                엑셀 일괄 등록
              </Button>
              <Button variant="contained" startIcon={<PersonAddIcon />} onClick={() => setRegisterOpen(true)}>
                원생 등록
              </Button>
            </>
          )
        }
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
          {(Object.keys(STUDENT_STATUS) as StudentStatus[]).map((s) => (
            <MenuItem key={s} value={s}>
              {STUDENT_STATUS[s].label}
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
                <TableRow key={s.id} hover onClick={() => router.push(`/students/${s.id}`)} sx={{ cursor: 'pointer' }}>
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
                          <Chip size="small" variant="outlined" color={LINK_STATUS[g.linkStatus]?.color} label={LINK_STATUS[g.linkStatus]?.label ?? g.linkStatus} />
                        </Stack>
                      ))}
                    </Stack>
                  </TableCell>
                  <TableCell>{s.birthDate ?? '••••-••-••'}</TableCell>
                  <TableCell>{s.grade ?? '-'}</TableCell>
                  <TableCell>
                    <Chip size="small" label={STUDENT_STATUS[s.status].label} color={STUDENT_STATUS[s.status].color} variant={s.status === 'WITHDRAWN' ? 'outlined' : 'filled'} />
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

      <RegisterStudentDialog open={registerOpen} classes={classes.data ?? []} onClose={() => setRegisterOpen(false)} onCreated={(st) => router.push(`/students/${st.id}`)} />
      <InviteParentDialog open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </>
  );
}
