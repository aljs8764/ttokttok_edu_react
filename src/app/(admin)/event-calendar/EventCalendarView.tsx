'use client';

import { useState } from 'react';
import Link from 'next/link';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ChevronLeft from '@mui/icons-material/ChevronLeft';
import ChevronRight from '@mui/icons-material/ChevronRight';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import { time } from '@/lib/format';
import { WEEKDAY, type CalendarEvent } from '@/lib/ops';
import { useSession } from '@/lib/session';
import PageHeader from '@/components/PageHeader';
import { useT } from '@/lib/i18n';

/** EVT-006 행사 달력 — 월간 보기. 행사를 누르면 상세(RSVP 현황)로 이동 */
export default function EventCalendarView() {
  const t = useT();
  const { session } = useSession();
  const instId = session?.institution?.institutionId;
  const [cursor, setCursor] = useState(dayjs().startOf('month'));
  const month = cursor.format('YYYY-MM');

  const q = useQuery({ queryKey: ['event-calendar', instId, month], queryFn: () => api.get<CalendarEvent[]>('events/calendar', { month }), enabled: !!instId });

  const lead = (cursor.day() + 6) % 7; // 월요일 시작
  const cells = Array.from({ length: Math.ceil((lead + cursor.daysInMonth()) / 7) * 7 }, (_, i) => {
    const d = i - lead + 1;
    return d >= 1 && d <= cursor.daysInMonth() ? cursor.date(d) : null;
  });
  const eventsOn = (d: dayjs.Dayjs) => (q.data ?? []).filter((e) => dayjs(e.startsAt).isSame(d, 'day'));

  return (
    <>
      <PageHeader
        title={t('행사 달력')}
        menuId="EVT-006"
        description={t('이번 달 행사를 달력으로 봅니다.')}
        actions={<Button component={Link} href="/event-templates" variant="outlined">{t('반복 행사 템플릿')}</Button>}
      />
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
        <IconButton aria-label={t('이전 달')} onClick={() => setCursor(cursor.subtract(1, 'month'))}><ChevronLeft /></IconButton>
        <Typography variant="h6" sx={{ minWidth: 120, textAlign: 'center' }}>{cursor.format(t('YYYY년 M월'))}</Typography>
        <IconButton aria-label={t('다음 달')} onClick={() => setCursor(cursor.add(1, 'month'))}><ChevronRight /></IconButton>
        <Button size="small" onClick={() => setCursor(dayjs().startOf('month'))}>{t('오늘')}</Button>
      </Stack>
      {q.isError && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage(q.error)}</Alert>}
      {q.isFetching && <LinearProgress />}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '1px', bgcolor: 'divider', border: 1, borderColor: 'divider' }}>
        {[1, 2, 3, 4, 5, 6, 7].map((d) => (
          <Box key={d} sx={{ bgcolor: 'background.default', py: 0.5, textAlign: 'center' }}>
            <Typography variant="caption" sx={{ fontWeight: 700 }}>{t(WEEKDAY[d])}</Typography>
          </Box>
        ))}
        {cells.map((d, i) => (
          <Paper key={i} square elevation={0} sx={{ minHeight: 96, p: 0.5, bgcolor: d ? 'background.paper' : 'action.hover' }}>
            {d && (
              <>
                <Typography variant="caption" sx={{ fontWeight: d.isSame(dayjs(), 'day') ? 800 : 400, color: d.isSame(dayjs(), 'day') ? 'primary.main' : 'text.secondary' }}>{d.date()}</Typography>
                <Stack spacing={0.25}>
                  {eventsOn(d).map((e) => (
                    <Box
                      key={e.id}
                      component={Link}
                      href={`/events/${e.id}`}
                      sx={{ px: 0.5, borderRadius: 0.5, bgcolor: e.status === 'CANCELED' ? 'action.disabledBackground' : 'primary.light', color: 'primary.contrastText', textDecoration: e.status === 'CANCELED' ? 'line-through' : 'none', fontSize: 12, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
                    >
                      {time(e.startsAt)} {e.title}
                    </Box>
                  ))}
                </Stack>
              </>
            )}
          </Paper>
        ))}
      </Box>
    </>
  );
}
