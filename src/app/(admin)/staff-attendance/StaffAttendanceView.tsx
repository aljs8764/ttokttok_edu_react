'use client';

import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import dayjs from 'dayjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import { time } from '@/lib/format';
import { hours, type StaffMonthly, type StaffRecord } from '@/lib/ops';
import { useSession } from '@/lib/session';
import PageHeader from '@/components/PageHeader';
import { useT } from '@/lib/i18n';
import Box from '@mui/material/Box';
import SectionCard from '@/components/ui/SectionCard';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import { color, font } from '@/theme/tokens';

/** STF-004 교직원 출퇴근 — 본인 출·퇴근 기록, 원장·실장은 월별 근무 집계 */
export default function StaffAttendanceView() {
  const t = useT();
  const qc = useQueryClient();
  const { session, manager } = useSession();
  const instId = session?.institution?.institutionId;
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'));

  const today = useQuery({ queryKey: ['staff-att-today', instId], queryFn: () => api.get<{ record: StaffRecord | null }>('staff-attendance/today'), enabled: !!instId });
  const monthly = useQuery({
    queryKey: ['staff-att-monthly', instId, month],
    queryFn: () => api.get<StaffMonthly[]>('staff-attendance/monthly', { month }),
    enabled: !!instId && manager,
  });
  const refresh = () => (qc.invalidateQueries({ queryKey: ['staff-att-today'] }), qc.invalidateQueries({ queryKey: ['staff-att-monthly'] }));
  const checkIn = useMutation({ mutationFn: () => api.post('staff-attendance/check-in'), onSuccess: refresh });
  const checkOut = useMutation({ mutationFn: () => api.post('staff-attendance/check-out'), onSuccess: refresh });

  const rec = today.data?.record;
  const err = checkIn.error ?? checkOut.error ?? today.error;

  return (
    <>
      <PageHeader title={t('교직원 출퇴근')} menuId="STF-004" description={t('출근·퇴근 버튼으로 오늘의 근무 시간을 기록합니다.')} />
      {err && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage(err)}</Alert>}
      <Paper component="section" aria-label={t('오늘 출퇴근')} sx={{ px: 3, py: 2.5, mb: 3, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ flex: 1, minWidth: 220 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h4" component="h2">{dayjs().format(t('M월 D일'))}</Typography>
            <StatusBadge
              kind={!rec ? 'scheduled' : rec.checkOut ? 'ended' : 'checkedIn'}
              label={!rec ? t('출근 전') : rec.checkOut ? t('퇴근') : t('근무 중')}
            />
          </Box>
          <Typography sx={{ mt: 0.5, fontSize: 14, color: 'text.secondary' }}>
            {!rec ? t('아직 출근 기록이 없습니다') : rec.checkOut ? t('출근 {0} · 퇴근 {1}{2}', { 0: time(rec.checkIn), 1: time(rec.checkOut), 2: rec.workedMinutes != null ? ` (${hours(rec.workedMinutes)})` : '' }) : t('{0} 출근 · 근무 중', { 0: time(rec.checkIn) })}
          </Typography>
        </Box>
        <Button variant="contained" disabled={!!rec || checkIn.isPending} onClick={() => checkIn.mutate()}>{t('출근')}</Button>
        <Button variant="outlined" disabled={!rec || !!rec.checkOut || checkOut.isPending} onClick={() => checkOut.mutate()}>{t('퇴근')}</Button>
      </Paper>

      {manager && (
        <SectionCard
          flush
          title={t('월별 근무 집계')}
          menuId="STF-004"
          actions={<TextField size="small" type="month" label={t('월')} value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />}
          sx={{ pb: 1 }}
        >
          {monthly.isFetching && <LinearProgress />}
          <Box sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: 640 }}>
              <TableHead>
                <TableRow><TableCell>{t('교직원')}</TableCell><TableCell align="right">{t('근무일')}</TableCell><TableCell align="right">{t('총 근무')}</TableCell><TableCell>{t('기록')}</TableCell></TableRow>
              </TableHead>
              <TableBody>
                {monthly.data?.map((m) => (
                  <TableRow key={m.userId}>
                    <TableCell sx={{ fontWeight: 600 }}>{m.userName}</TableCell>
                    <TableCell align="right">{t('{0}일', { 0: m.days })}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: font.mono, fontSize: 13 }}>{hours(m.totalMinutes)}</TableCell>
                    <TableCell>
                      {/* 근무한 날을 칸으로 — 퇴근까지 찍힌 날은 초록, 퇴근 미체크는 노랑. 글자는 툴팁·스크린리더로 */}
                      <Box
                        role="list"
                        aria-label={m.records.map((r) => t('{0}일 {1}–{2}', { 0: dayjs(r.workDate).format('D'), 1: time(r.checkIn), 2: time(r.checkOut) })).join(', ')}
                        sx={{ display: 'flex', flexWrap: 'wrap', gap: '3px', maxWidth: 360 }}
                      >
                        {m.records.map((r) => (
                          <Box
                            key={r.workDate}
                            role="listitem"
                            title={t('{0}일 {1}–{2}', { 0: dayjs(r.workDate).format('D'), 1: time(r.checkIn), 2: time(r.checkOut) })}
                            sx={{ width: 18, height: 18, borderRadius: '4px', bgcolor: r.checkOut ? color.success : color.warning, color: '#FFFFFF', fontSize: 10, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            {dayjs(r.workDate).format('D')}
                          </Box>
                        ))}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
                {monthly.data?.length === 0 && (
                  <TableRow><TableCell colSpan={4} sx={{ border: 0 }}><EmptyState dense title={t('이 달의 기록이 없습니다')} /></TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, px: 3, pt: 1.5, fontSize: 12, color: 'text.secondary', flexWrap: 'wrap' }}>
            <Box component="span" sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}><Box component="span" sx={{ width: 12, height: 12, borderRadius: '3px', bgcolor: color.success }} />{t('출퇴근 기록')}</Box>
            <Box component="span" sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}><Box component="span" sx={{ width: 12, height: 12, borderRadius: '3px', bgcolor: color.warning }} />{t('퇴근 미체크')}</Box>
          </Box>
        </SectionCard>
      )}
    </>
  );
}
