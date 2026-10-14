'use client';

import { useEffect, useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
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
import { useRouter, useSearchParams } from 'next/navigation';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import { useSession } from '@/lib/session';
import type { Classroom, JoinRequest, Page, Student, StudentStatus } from '@/lib/types';
import { LINK_STATUS, STUDENT_STATUS } from '@/lib/student';
import RegisterStudentDialog from '@/components/students/RegisterStudentDialog';
import InviteParentDialog from '@/components/students/InviteParentDialog';
import PageHeader from '@/components/PageHeader';
import { useT } from '@/lib/i18n';
import Box from '@mui/material/Box';
import SectionCard from '@/components/ui/SectionCard';
import SegmentTabs from '@/components/ui/SegmentTabs';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import MenuIdChip from '@/components/ui/MenuIdChip';
import Avatar from '@/components/ui/Avatar';
import { MUI_COLOR_TONE } from '@/theme/status';
import { font } from '@/theme/tokens';

/**
 * STU-001 원생 목록 — 반·재원상태 필터, 이름/보호자 번호 뒷 4자리 검색, 20개씩.
 * 원장·실장은 등록(STU-003)·엑셀 업로드(STU-002)·가입 승인(STU-004)·초대(STU-005)로 이어진다.
 */
export default function StudentsView() {
  const tr = useT();
  const { session, manager } = useSession();
  const instId = session?.institution?.institutionId;
  const searchParams = useSearchParams();
  const [classId, setClassId] = useState(searchParams.get('classId') ?? '');
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
        title={tr('원생 관리')}
        menuId="STU-001"
        description={manager ? tr('행을 누르면 상세(반 이동·상태 변경·보호자 관리)로 이동합니다.') : tr('담당 반 원생만 보이며, 생년월일·연락처는 마스킹됩니다.')}
        actions={
          manager && (
            <>
              <Badge color="secondary" badgeContent={pending.data?.length ?? 0}>
                <Button variant="outlined" startIcon={<HowToRegIcon />} component={NextLink} href="/students/join-requests">
                  {tr('가입 승인')}
                </Button>
              </Badge>
              <Button variant="outlined" startIcon={<SendIcon />} onClick={() => setInviteOpen(true)}>
                {tr('학부모 초대')}
              </Button>
              <Button variant="outlined" startIcon={<UploadIcon />} component={NextLink} href="/students/import">
                {tr('엑셀 일괄 등록')}
              </Button>
              <Button variant="contained" startIcon={<PersonAddIcon />} onClick={() => setRegisterOpen(true)}>
                {tr('원생 등록')}
              </Button>
            </>
          )
        }
      />

      {list.isError && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage(list.error)}</Alert>}

      <SectionCard flush sx={{ pb: 0 }}>
        <Box sx={{ px: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <SegmentTabs<StudentStatus | ''>
              value={status}
              onChange={(v) => (setStatus(v), setPage(0))}
              ariaLabel={tr('재원 상태')}
              items={[
                { value: '', label: tr('전체') },
                ...(Object.keys(STUDENT_STATUS) as StudentStatus[]).map((st) => ({ value: st, label: tr(STUDENT_STATUS[st].label) })),
              ]}
            />
            <MenuIdChip id="STU-001" />
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField select size="small" label={tr('반')} value={classId} onChange={(e) => (setClassId(e.target.value), setPage(0))} sx={{ minWidth: 160 }}>
              <MenuItem value="">{tr('전체')}</MenuItem>
              {(classes.data ?? []).map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              placeholder={tr('이름 또는 보호자 번호 뒷 4자리')}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              sx={{ flex: '1 1 260px', maxWidth: { sm: 420 } }}
              slotProps={{
                htmlInput: { 'aria-label': tr('원생 검색') },
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Stack>
        </Box>
        <Box sx={{ mt: 2, height: 4 }}>{list.isFetching && <LinearProgress sx={{ height: 4, borderRadius: 0 }} />}</Box>
        <TableContainer>
          <Table sx={{ minWidth: 760, '& .MuiTableCell-root:first-of-type': { pl: 3 }, '& .MuiTableCell-root:last-of-type': { pr: 3 } }}>
            <TableHead>
              <TableRow>
                <TableCell>{tr('이름')}</TableCell>
                <TableCell>{tr('반')}</TableCell>
                <TableCell>{tr('보호자')}</TableCell>
                <TableCell>{tr('생년월일')}</TableCell>
                <TableCell>{tr('학년')}</TableCell>
                <TableCell>{tr('상태')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {list.data?.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} sx={{ border: 0 }}>
                    <EmptyState dense title={tr('조건에 맞는 원생이 없습니다')} />
                  </TableCell>
                </TableRow>
              )}
              {list.data?.items.map((s) => (
                <TableRow
                  key={s.id}
                  hover
                  tabIndex={0}
                  onClick={() => router.push(`/students/${s.id}`)}
                  onKeyDown={(e) => e.key === 'Enter' && router.push(`/students/${s.id}`)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                      <Avatar name={s.name} />
                      <Box component="span" sx={{ fontWeight: 600 }}>{s.name}</Box>
                    </Box>
                  </TableCell>
                  <TableCell>{s.classroomIds.map((id) => classNames.get(id) ?? '-').join(', ') || '-'}</TableCell>
                  <TableCell>
                    <Stack spacing={0.5}>
                      {s.guardians.map((g) => (
                        <Stack key={g.id} direction="row" spacing={1} alignItems="center">
                          <Typography sx={{ fontFamily: font.mono, fontSize: 13 }}>
                            {g.phone}
                          </Typography>
                          {g.relation && <Typography variant="body2" color="text.secondary">({g.relation})</Typography>}
                          <StatusBadge tone={MUI_COLOR_TONE[LINK_STATUS[g.linkStatus]?.color ?? 'default']} label={tr(LINK_STATUS[g.linkStatus]?.label ?? g.linkStatus)} />
                        </Stack>
                      ))}
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ fontFamily: font.mono, fontSize: 13 }}>{s.birthDate ?? '••••-••-••'}</TableCell>
                  <TableCell>{s.grade ?? '-'}</TableCell>
                  <TableCell>
                    <StatusBadge tone={MUI_COLOR_TONE[STUDENT_STATUS[s.status].color]} label={tr(STUDENT_STATUS[s.status].label)} />
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
          labelDisplayedRows={({ from, to, count }) => tr('{0}–{1} / 총 {2}명', { 0: from, 1: to, 2: count })}
        />
      </SectionCard>

      <RegisterStudentDialog open={registerOpen} classes={classes.data ?? []} onClose={() => setRegisterOpen(false)} onCreated={(st) => router.push(`/students/${st.id}`)} />
      <InviteParentDialog open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </>
  );
}
