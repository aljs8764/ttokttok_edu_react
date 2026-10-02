'use client';

import { useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
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
import Typography from '@mui/material/Typography';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs, { type Dayjs } from 'dayjs';
import { api, errorMessage } from '@/lib/api';
import { percent, time } from '@/lib/format';
import { useRealtime } from '@/lib/realtime';
import { useSession } from '@/lib/session';
import type { Attendance, AttendanceStatus, Classroom, ClassDailySummary, DailyReport } from '@/lib/types';
import PageHeader from '@/components/PageHeader';
import StatusChip from '@/components/StatusChip';
import ChangeStatusDialog from '@/components/ChangeStatusDialog';

type Filter = 'ALL' | 'NOT_ARRIVED' | 'ABSENT' | 'LATE';

/** ATT-001 데일리 리포트 + ATT-002 상태 수동 변경 */
export default function DailyReportView() {
  const qc = useQueryClient();
  const { session, manager } = useSession();
  const instId = session?.institution?.institutionId;
  const [date, setDate] = useState<Dayjs>(dayjs());
  const [classId, setClassId] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');
  const [editing, setEditing] = useState<Attendance | null>(null);
  const day = date.format('YYYY-MM-DD');

  const classes = useQuery({ queryKey: ['classes', instId], queryFn: () => api.get<Classroom[]>('classes'), enabled: !!instId });
  const report = useQuery({
    queryKey: ['attendance', 'report', instId, day, classId],
    queryFn: () => api.get<DailyReport>('attendance/report', { date: day, classId: classId || undefined }),
    enabled: !!instId,
  });

  const topics = useMemo(() => {
    if (!instId) return [];
    if (manager) return [`/topic/inst.${instId}`];
    return (classes.data ?? []).map((c) => `/topic/class.${c.id}`);
  }, [instId, manager, classes.data]);
  const isToday = date.isSame(dayjs(), 'day');
  useRealtime(isToday ? topics : [], (msg) => {
    if (msg.type === 'attendance.updated') void qc.invalidateQueries({ queryKey: ['attendance', 'report'] });
  });

  return (
    <>
      <PageHeader
        title="데일리 리포트"
        menuId="ATT-001"
        description="날짜·반별 출결 현황. 기기 미소지·오류는 [변경]으로 바로잡고 사유를 남깁니다 (ATT-002)."
        actions={
          <>
            <DatePicker
              label="날짜"
              value={date}
              onChange={(v) => v && setDate(v)}
              format="YYYY-MM-DD (dd)"
              maxDate={dayjs()}
              slotProps={{ textField: { size: 'small', sx: { width: 190 } } }}
            />
            <TextField select size="small" label="반" value={classId} onChange={(e) => setClassId(e.target.value)} sx={{ minWidth: 160 }}>
              <MenuItem value="">{manager ? '전체 반' : '담당 반 전체'}</MenuItem>
              {(classes.data ?? []).map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
          </>
        }
      />

      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        {(
          [
            ['ALL', '전체'],
            ['NOT_ARRIVED', '미등원'],
            ['LATE', '지각'],
            ['ABSENT', '결석'],
          ] as [Filter, string][]
        ).map(([v, l]) => (
          <Chip key={v} label={l} color={filter === v ? 'primary' : 'default'} variant={filter === v ? 'filled' : 'outlined'} onClick={() => setFilter(v)} />
        ))}
      </Stack>

      {report.isError && <Alert severity="error">{errorMessage(report.error)}</Alert>}
      {report.isLoading && <Skeleton variant="rounded" height={240} />}
      {report.data?.classes.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">볼 수 있는 반이 없습니다</Typography>
        </Paper>
      )}
      <Stack spacing={2}>
        {report.data?.classes.map((c) => (
          <ClassSection key={c.classroomId} date={report.data!.date} summary={c} filter={filter} onEdit={setEditing} />
        ))}
      </Stack>

      <ChangeStatusDialog target={editing} onClose={() => setEditing(null)} />
    </>
  );
}

function matches(a: Attendance, f: Filter, notArrivedIds: Set<string>) {
  switch (f) {
    case 'ALL':
      return true;
    case 'ABSENT':
      return a.status === 'ABSENT';
    case 'LATE':
      return (a.status === 'IN' || a.status === 'OUT') && a.isLate;
    case 'NOT_ARRIVED':
      return notArrivedIds.has(a.studentId);
  }
}

function ClassSection({ date, summary, filter, onEdit }: { date: string; summary: ClassDailySummary; filter: Filter; onEdit: (a: Attendance) => void }) {
  const c = summary.counts;
  // 미등원 = 예정 상태로 수업 시작이 지난 원생 (오늘 화면 기준 근사; 정확한 기준은 대시보드 KPI)
  const started = dayjs(`${date}T${summary.startTime}`).isBefore(dayjs());
  const notArrived = new Set(summary.rows.filter((r) => r.status === 'SCHEDULED' && started).map((r) => r.studentId));
  const rows = summary.rows.filter((r) => matches(r, filter, notArrived));

  return (
    <Paper>
      <Box sx={{ p: 2, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
        <Typography variant="h4">{summary.classroomName}</Typography>
        <Typography variant="body2" color="text.secondary">
          {summary.startTime.slice(0, 5)}~{summary.endTime.slice(0, 5)}
        </Typography>
        {!summary.heldToday && <Chip size="small" label="수업 없는 날" />}
        <Box sx={{ flex: 1 }} />
        <Count label="등원율" value={percent(c.attendanceRate)} />
        <Count label="등원" value={c.present} />
        <Count label="하원" value={c.checkedOut} />
        <Count label="지각" value={c.late} />
        <Count label="결석" value={c.absent} tone="error" />
        <Count label="예정" value={c.scheduled} />
      </Box>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>이름</TableCell>
              <TableCell>상태</TableCell>
              <TableCell>등원</TableCell>
              <TableCell>하원 · 목적지</TableCell>
              <TableCell>결석 사유</TableCell>
              <TableCell align="right" />
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ color: 'text.secondary', py: 3 }}>
                  해당 원생이 없습니다
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.studentId} hover>
                <TableCell sx={{ fontWeight: 600 }}>{r.studentName}</TableCell>
                <TableCell>
                  <StatusChip status={r.status as AttendanceStatus} isLate={r.isLate} isEarlyLeave={r.isEarlyLeave} />
                </TableCell>
                <TableCell>{time(r.checkInAt)}</TableCell>
                <TableCell>
                  {time(r.checkOutAt)}
                  {r.nextDestinationName ? ` → ${r.nextDestinationName}` : ''}
                </TableCell>
                <TableCell sx={{ color: 'text.secondary', maxWidth: 240 }}>{r.absenceReason ?? ''}</TableCell>
                <TableCell align="right">
                  <Button size="small" disabled={!r.dayId} onClick={() => onEdit(r)} title={r.dayId ? '' : '출결 기록이 아직 없습니다 (수업 없는 날·배치 전)'}>
                    변경
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}

function Count({ label, value, tone }: { label: string; value: number | string; tone?: 'error' }) {
  return (
    <Box sx={{ textAlign: 'center', minWidth: 48 }}>
      <Typography variant="caption" color="text.secondary" display="block">
        {label}
      </Typography>
      <Typography variant="subtitle1" sx={{ color: tone === 'error' && value ? 'error.main' : 'text.primary' }}>
        {value}
      </Typography>
    </Box>
  );
}
