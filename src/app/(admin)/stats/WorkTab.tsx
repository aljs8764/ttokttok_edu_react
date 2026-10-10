'use client';

import type { ReactNode } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import { ratioText } from '@/lib/stats';

interface RankRow { id: string; name: string; notices: number; targets: number; read: number; rate: number | null; weak: boolean }
interface NoticeRanking { from: string; to: string; institutionRate: number | null; classrooms: RankRow[]; teachers: RankRow[] }
interface StaffRow {
  userId: string;
  name: string;
  role: 'OWNER' | 'ADMIN' | 'TEACHER';
  noticesSent: number;
  noticeReadRate: number | null;
  repliesSent: number;
  avgReplyMinutes: number | null;
  attendanceActions: number;
  avgCheckInOffsetMinutes: number | null;
  consultsDone: number;
}
interface StaffWork { from: string; to: string; staff: StaffRow[]; unansweredMessages: number }

const ROLE: Record<StaffRow['role'], string> = { OWNER: '원장', ADMIN: '실장', TEACHER: '교사' };

const minutesText = (m: number | null) => {
  if (m == null) return '-';
  const abs = Math.abs(m);
  const t = abs >= 60 ? `${Math.floor(abs / 60)}시간 ${Math.round(abs % 60)}분` : `${Math.round(abs)}분`;
  return t;
};
const offsetText = (m: number | null) => (m == null ? '-' : m < 0 ? `시작 ${minutesText(m)} 전` : `시작 ${minutesText(m)} 후`);

function Section({ title, menuId, children }: { title: string; menuId: string; children: ReactNode }) {
  return (
    <Paper sx={{ p: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
        <Typography variant="h4" sx={{ flex: 1 }}>{title}</Typography>
        <Chip size="small" variant="outlined" label={menuId} />
      </Box>
      {children}
    </Paper>
  );
}

function RankTable({ rows, label, avg }: { rows: RankRow[]; label: string; avg: number | null }) {
  if (rows.length === 0) return <Typography variant="body2" color="text.secondary">기간 안 발송된 알림장이 없습니다.</Typography>;
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>{label}</TableCell>
          <TableCell align="right">알림장</TableCell>
          <TableCell align="right">열람 / 대상</TableCell>
          <TableCell sx={{ width: '40%' }}>열람률</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell>
              {r.name}
              {r.weak && <Chip size="small" color="error" label="취약" sx={{ ml: 1 }} />}
            </TableCell>
            <TableCell align="right">{r.notices}</TableCell>
            <TableCell align="right">{r.read} / {r.targets}</TableCell>
            <TableCell>
              <Stack direction="row" spacing={1} alignItems="center">
                <LinearProgress
                  variant="determinate" value={(r.rate ?? 0) * 100} color={r.weak ? 'error' : 'primary'}
                  sx={{ flex: 1, height: 8, borderRadius: 4 }}
                />
                <Typography variant="body2" sx={{ width: 48, textAlign: 'right' }}>{ratioText(r.rate)}</Typography>
              </Stack>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      {avg != null && (
        <caption style={{ captionSide: 'bottom', textAlign: 'left', paddingTop: 8 }}>
          기관 평균 {ratioText(avg)} · 평균보다 10%p 넘게 낮고 대상 5명 이상이면 &lsquo;취약&rsquo;으로 표시
        </caption>
      )}
    </Table>
  );
}

/** STAT-007 알림장 열람률 랭킹 · STF-005 교사 업무 리포트 */
export default function WorkTab({ range, enabled, instId }: { range: { from: string; to: string }; enabled: boolean; instId?: string }) {
  const ranking = useQuery({ queryKey: ['stats', 'notice-ranking', instId, range], queryFn: () => api.get<NoticeRanking>('stats/notice-ranking', range), enabled });
  const work = useQuery({ queryKey: ['stats', 'staff-work', instId, range], queryFn: () => api.get<StaffWork>('stats/staff-work', range), enabled });

  return (
    <Stack spacing={2}>
      <Section title="알림장 열람률 랭킹" menuId="STAT-007">
        {ranking.isLoading ? <Skeleton variant="rounded" height={200} /> : ranking.isError ? <Alert severity="error">{errorMessage(ranking.error)}</Alert> : ranking.data && (
          <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
            <div>
              <Typography variant="subtitle2" gutterBottom>반별 (낮은 순)</Typography>
              <RankTable rows={ranking.data.classrooms} label="반" avg={ranking.data.institutionRate} />
            </div>
            <div>
              <Typography variant="subtitle2" gutterBottom>작성 교사별 (낮은 순)</Typography>
              <RankTable rows={ranking.data.teachers} label="교사" avg={ranking.data.institutionRate} />
            </div>
          </Box>
        )}
      </Section>

      <Section title="교사 업무 리포트" menuId="STF-005">
        {work.isLoading ? <Skeleton variant="rounded" height={200} /> : work.isError ? <Alert severity="error">{errorMessage(work.error)}</Alert> : work.data && (
          <>
            {work.data.unansweredMessages > 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>기간 안 학부모 메시지 중 아직 답장이 없는 메시지가 {work.data.unansweredMessages}건 있습니다.</Alert>
            )}
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>이름</TableCell>
                    <TableCell align="right">알림장 발송</TableCell>
                    <TableCell align="right">알림장 열람률</TableCell>
                    <TableCell align="right">메시지 답장</TableCell>
                    <TableCell align="right">평균 응답 시간</TableCell>
                    <TableCell align="right">출결 처리</TableCell>
                    <TableCell align="right">등원 처리 시점(평균)</TableCell>
                    <TableCell align="right">상담 완료</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {work.data.staff.map((s) => (
                    <TableRow key={s.userId}>
                      <TableCell>{s.name} <Typography component="span" variant="caption" color="text.secondary">{ROLE[s.role]}</Typography></TableCell>
                      <TableCell align="right">{s.noticesSent}</TableCell>
                      <TableCell align="right">{ratioText(s.noticeReadRate)}</TableCell>
                      <TableCell align="right">{s.repliesSent}</TableCell>
                      <TableCell align="right">{minutesText(s.avgReplyMinutes)}</TableCell>
                      <TableCell align="right">{s.attendanceActions}</TableCell>
                      <TableCell align="right">{offsetText(s.avgCheckInOffsetMinutes)}</TableCell>
                      <TableCell align="right">{s.consultsDone}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              평균 응답 시간은 학부모가 보낸 메시지에 그 대화의 첫 교직원 답장이 오기까지의 시간입니다. 등원 처리 시점은 교사 앱·관리자 웹에서 등원 처리한 시각이 수업 시작보다 얼마나 앞뒤인지의 평균입니다. 업무량 비교용 참고 지표로만 써 주세요.
            </Typography>
          </>
        )}
      </Section>
    </Stack>
  );
}
