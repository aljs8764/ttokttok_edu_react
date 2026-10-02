'use client';

import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import DownloadIcon from '@mui/icons-material/FileDownloadOutlined';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs, { type Dayjs } from 'dayjs';
import { api, download, errorMessage } from '@/lib/api';
import { useSession } from '@/lib/session';
import type { Classroom, MonthlyAttendance, MonthlyCell, MonthlyRow } from '@/lib/types';
import PageHeader from '@/components/PageHeader';

const MARK_COLOR: Record<string, string> = { O: 'success.main', '△': 'warning.main', X: 'error.main' };

/** ATT-003 월간 출석부 (O/△/X, 결석 사유) + ATT-004 출석부 엑셀 */
export default function MonthlyView() {
  const { session, manager } = useSession();
  const instId = session?.institution?.institutionId;
  const [month, setMonth] = useState<Dayjs>(dayjs().startOf('month'));
  const [classId, setClassId] = useState('');
  const [reasonTarget, setReasonTarget] = useState<{ row: MonthlyRow; cell: MonthlyCell } | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const ym = month.format('YYYY-MM');

  const classes = useQuery({ queryKey: ['classes', instId], queryFn: () => api.get<Classroom[]>('classes'), enabled: !!instId });
  useEffect(() => {
    if (!classId && classes.data?.length) setClassId(classes.data[0].id);
  }, [classes.data, classId]);

  const sheet = useQuery({
    queryKey: ['attendance', 'monthly', instId, classId, ym],
    queryFn: () => api.get<MonthlyAttendance>('attendance/monthly', { month: ym, classId }),
    enabled: !!instId && !!classId,
  });

  const days = sheet.data?.classDays ?? [];

  return (
    <>
      <PageHeader
        title="월간 출석부"
        menuId="ATT-003"
        description="O 출석 · △ 지각·조퇴 · X 결석. X 를 누르면 결석 사유를 적을 수 있습니다."
        actions={
          <>
            <DatePicker
              label="월"
              views={['year', 'month']}
              value={month}
              onChange={(v) => v && setMonth(v.startOf('month'))}
              format="YYYY년 M월"
              maxDate={dayjs().endOf('month')}
              slotProps={{ textField: { size: 'small', sx: { width: 160 } } }}
            />
            <TextField select size="small" label="반" value={classId} onChange={(e) => setClassId(e.target.value)} sx={{ minWidth: 160 }}>
              {(classes.data ?? []).map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
            {manager && (
              <Button variant="outlined" startIcon={<DownloadIcon />} disabled={!classId} onClick={() => setExportOpen(true)}>
                출석부 엑셀
              </Button>
            )}
          </>
        }
      />

      {sheet.isError && <Alert severity="error">{errorMessage(sheet.error)}</Alert>}
      {(sheet.isLoading || classes.isLoading) && <Skeleton variant="rounded" height={320} />}
      {classes.data?.length === 0 && <Alert severity="info">볼 수 있는 반이 없습니다</Alert>}

      {sheet.data && (
        <Paper>
          <TableContainer sx={{ maxHeight: 'calc(100vh - 220px)' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ position: 'sticky', left: 0, zIndex: 3, minWidth: 96 }}>이름</TableCell>
                  {days.map((d) => (
                    <TableCell key={d} align="center" sx={{ px: 0.5, minWidth: 34, color: [0, 6].includes(dayjs(d).day()) ? 'error.main' : undefined }}>
                      {dayjs(d).date()}
                      <Typography variant="caption" display="block" color="text.secondary">
                        {dayjs(d).format('dd')}
                      </Typography>
                    </TableCell>
                  ))}
                  <TableCell align="center">출석</TableCell>
                  <TableCell align="center">지각·조퇴</TableCell>
                  <TableCell align="center">결석</TableCell>
                  <TableCell sx={{ minWidth: 200 }}>비고</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sheet.data.rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={days.length + 5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      이 달 출결 기록이 없습니다
                    </TableCell>
                  </TableRow>
                )}
                {sheet.data.rows.map((r) => {
                  const byDate = new Map(r.cells.map((c) => [c.date, c]));
                  return (
                    <TableRow key={r.studentId} hover>
                      <TableCell sx={{ position: 'sticky', left: 0, bgcolor: 'background.paper', fontWeight: 600, zIndex: 1 }}>{r.studentName}</TableCell>
                      {days.map((d) => {
                        const cell = byDate.get(d);
                        const mark = cell?.mark ?? '';
                        const clickable = mark === 'X';
                        return (
                          <TableCell
                            key={d}
                            align="center"
                            onClick={clickable ? () => setReasonTarget({ row: r, cell: cell! }) : undefined}
                            sx={{ px: 0.5, fontWeight: 700, color: MARK_COLOR[mark], cursor: clickable ? 'pointer' : undefined }}
                          >
                            {cell?.absenceReason || cell?.isLate || cell?.isEarlyLeave ? (
                              <Tooltip title={[cell.isLate && '지각', cell.isEarlyLeave && '조퇴', cell.absenceReason].filter(Boolean).join(' · ')}>
                                <span>
                                  {mark}
                                  {cell.evidenceFileId ? '*' : ''}
                                </span>
                              </Tooltip>
                            ) : (
                              mark
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell align="center">{r.present}</TableCell>
                      <TableCell align="center">{r.partial}</TableCell>
                      <TableCell align="center" sx={{ color: r.absent ? 'error.main' : undefined }}>
                        {r.absent}
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary', fontSize: 13 }}>{r.remarks}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ p: 1.5 }}>
            <Typography variant="caption" color="text.secondary">
              * 증빙 첨부됨 · 주말은 빨간 날짜. 수업 요일이 아닌 날의 보강 기록도 함께 표시됩니다.
            </Typography>
          </Box>
        </Paper>
      )}

      <AbsenceReasonDialog target={reasonTarget} onClose={() => setReasonTarget(null)} />
      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} classId={classId} month={ym} className={classes.data?.find((c) => c.id === classId)?.name} />
    </>
  );
}

/** 결석 사유 등록·수정 (빈 값이면 삭제) */
function AbsenceReasonDialog({ target, onClose }: { target: { row: MonthlyRow; cell: MonthlyCell } | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [reason, setReason] = useState('');
  useEffect(() => setReason(target?.cell.absenceReason ?? ''), [target]);

  const save = useMutation({
    mutationFn: () => api.patch(`attendance/${target!.cell.dayId}/absence-reason`, { reason: reason.trim() || null }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['attendance'] });
      onClose();
    },
  });

  return (
    <Dialog open={!!target} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        결석 사유 · {target?.row.studentName} {target && dayjs(target.cell.date).format('M/D')}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="사유"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="예: 병결(감기), 가족 경조사"
            multiline
            minRows={2}
            inputProps={{ maxLength: 500 }}
            helperText="사유가 있는 결석은 대시보드 등원율 계산에서 사전 연락 결석으로 빠집니다"
          />
          {save.isError && <Alert severity="error">{errorMessage(save.error)}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>취소</Button>
        <Button variant="contained" disabled={save.isPending} onClick={() => save.mutate()}>
          저장
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** ATT-004 출석부 엑셀 — 비밀번호를 주면 파일 자체가 암호화된다. 다운로드는 감사 로그에 남는다 */
function ExportDialog({ open, onClose, classId, month, className }: { open: boolean; onClose: () => void; classId: string; month: string; className?: string }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const invalid = password.length > 0 && (password.length < 4 || password.length > 64);

  async function run() {
    setPending(true);
    setError(null);
    try {
      await download('POST', 'attendance/export', { classId, month, password: password || null }, `${className ?? '출석부'}_${month}.xlsx`);
      setPassword('');
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>출석부 엑셀 다운로드</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2">
            {className} · {dayjs(`${month}-01`).format('YYYY년 M월')}
          </Typography>
          <TextField
            label="파일 비밀번호 (선택)"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={invalid}
            helperText={invalid ? '4~64자로 입력하세요' : '입력하면 엑셀을 열 때 비밀번호를 묻습니다'}
            autoComplete="new-password"
          />
          <Alert severity="info" variant="outlined">
            교육청 보고 원본 양식은 확보 후 반영 예정입니다. 지금은 표준 출석부 형식으로 내려받습니다.
          </Alert>
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>취소</Button>
        <Button variant="contained" disabled={invalid || pending} onClick={() => void run()}>
          다운로드
        </Button>
      </DialogActions>
    </Dialog>
  );
}
