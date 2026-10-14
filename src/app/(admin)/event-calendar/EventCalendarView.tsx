'use client';

import { useState } from 'react';
import Link from 'next/link';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
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
import SectionCard from '@/components/ui/SectionCard';
import { color, tone as TONES } from '@/theme/tokens';

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
      {q.isError && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage(q.error)}</Alert>}
      <SectionCard
        menuId="EVT-006"
        title={
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
            <IconButton size="small" aria-label={t('이전 달')} onClick={() => setCursor(cursor.subtract(1, 'month'))} sx={{ border: `1px solid ${color.border}`, width: 40, height: 40 }}><ChevronLeft /></IconButton>
            <Box component="span" sx={{ minWidth: 120, textAlign: 'center' }}>{cursor.format(t('YYYY년 M월'))}</Box>
            <IconButton size="small" aria-label={t('다음 달')} onClick={() => setCursor(cursor.add(1, 'month'))} sx={{ border: `1px solid ${color.border}`, width: 40, height: 40 }}><ChevronRight /></IconButton>
          </Box>
        }
        actions={<Button size="small" variant="outlined" onClick={() => setCursor(dayjs().startOf('month'))}>{t('오늘')}</Button>}
      >
        {q.isFetching && <LinearProgress sx={{ mb: 1 }} />}
        <Box sx={{ overflowX: 'auto' }}>
          <Box sx={{ minWidth: 620, display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', borderTop: `1px solid ${color.divider}`, borderLeft: `1px solid ${color.divider}` }}>
            {[1, 2, 3, 4, 5, 6, 7].map((d) => (
              <Box key={d} sx={{ p: 1, fontSize: 12, fontWeight: 600, color: 'text.secondary', bgcolor: color.bg, borderRight: `1px solid ${color.divider}`, borderBottom: `1px solid ${color.divider}` }}>
                {t(WEEKDAY[d])}
              </Box>
            ))}
            {cells.map((d, i) => {
              const today = !!d && d.isSame(dayjs(), 'day');
              return (
                <Box key={i} sx={{ minHeight: 104, p: 0.75, display: 'flex', flexDirection: 'column', gap: 0.5, bgcolor: d ? (today ? color.selected : 'background.paper') : color.bg, borderRight: `1px solid ${color.divider}`, borderBottom: `1px solid ${color.divider}` }}>
                  {d && (
                    <>
                      <Box component="span" aria-current={today ? 'date' : undefined} sx={{ fontSize: 12, fontWeight: today ? 700 : 400, color: today ? 'primary.main' : 'text.secondary' }}>{d.date()}</Box>
                      {eventsOn(d).map((e) => {
                        const tn = e.status === 'CANCELED' ? TONES.gray : TONES.blue;
                        return (
                          <Box
                            key={e.id}
                            component={Link}
                            href={`/events/${e.id}`}
                            title={`${time(e.startsAt)} ${e.title}${e.status === 'CANCELED' ? ` (${t('취소')})` : ''}`}
                            sx={{ display: 'block', px: 0.75, py: '3px', borderRadius: '4px', bgcolor: tn.bg, color: tn.fg, fontSize: 11, fontWeight: 600, textDecoration: e.status === 'CANCELED' ? 'line-through' : 'none', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
                          >
                            {time(e.startsAt)} {e.title}
                          </Box>
                        );
                      })}
                    </>
                  )}
                </Box>
              );
            })}
          </Box>
        </Box>
      </SectionCard>
    </>
  );
}
