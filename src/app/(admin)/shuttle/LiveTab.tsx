'use client';

import { useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import dayjs from 'dayjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import { useSession } from '@/lib/session';
import type { TripLive } from '@/lib/shuttle';
import ShuttleMap from '@/components/ShuttleMap';
import { useT } from '@/lib/i18n';

/** 운행 중인 셔틀 — 10초마다 갱신 */
export default function LiveTab() {
  const tr = useT();
  const qc = useQueryClient();
  const { session, manager } = useSession();
  const instId = session?.institution?.institutionId;
  const [selected, setSelected] = useState<string | null>(null);
  const q = useQuery({ queryKey: ['shuttle', 'live', instId], queryFn: () => api.get<TripLive[]>('shuttle/live'), enabled: !!instId, refetchInterval: 10_000 });
  const end = useMutation({
    mutationFn: (id: string) => api.post(`shuttle/trips/${id}/end`),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['shuttle'] }); },
  });
  const trips = q.data ?? [];
  const trip = trips.find((t) => t.id === selected) ?? trips[0];
  const vehicles = useMemo(
    () => trips.filter((t) => t.position).map((t) => ({ id: t.id, lat: t.position!.lat, lng: t.position!.lng, label: t.vehicleName ?? t.routeName, stale: t.stale })),
    [trips],
  );
  const stops = useMemo(() => trip?.stops.map((s) => ({ ...s })) ?? [], [trip]);

  return (
    <Stack spacing={2}>
      {(q.isError || end.isError) && <Alert severity="error">{errorMessage(q.error ?? end.error)}</Alert>}
      {q.isSuccess && trips.length === 0 && <Alert severity="info">{tr('지금 운행 중인 셔틀이 없습니다. 기사가 교사 앱 "셔틀 운행"에서 노선을 골라 출발하면 여기에 나타납니다.')}</Alert>}
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '280px 1fr' } }}>
        <Paper variant="outlined">
          <List dense disablePadding>
            {trips.map((t) => (
              <ListItemButton key={t.id} selected={t.id === trip?.id} onClick={() => setSelected(t.id)}>
                <ListItemText
                  primary={<>{t.routeName} {t.stale && <Chip size="small" color="warning" label={tr('신호 없음')} sx={{ ml: 0.5 }} />}</>}
                  secondary={`${tr('{0} · {1} 출발', { 0: t.driverName, 1: dayjs(t.startedAt).format('HH:mm') })}${t.position ? tr(' · {0} 갱신', { 0: dayjs(t.position.at).format('HH:mm:ss') }) : tr(' · 위치 대기')}`}
                />
              </ListItemButton>
            ))}
          </List>
        </Paper>
        <ShuttleMap stops={stops} vehicles={vehicles} fitKey={trip?.id ?? 'none'} />
      </Box>
      {trip && (
        <Paper variant="outlined" sx={{ px: 3, py: 2.5 }}>
          <Stack direction="row" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="h4" component="h3" sx={{ flex: 1 }}>
              {trip.routeName} {trip.vehicleName && `· ${trip.vehicleName}`} {trip.plateNo && `(${trip.plateNo})`}
            </Typography>
            {trip.position?.speedKmh != null && <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>{Math.round(trip.position.speedKmh)} km/h</Typography>}
            {manager && <Button size="small" color="error" onClick={() => window.confirm(tr('이 운행을 종료할까요?')) && end.mutate(trip.id)}>{tr('운행 종료')}</Button>}
          </Stack>
          {trip.stale && <Alert severity="warning" sx={{ mb: 1 }}>{tr('2분 넘게 위치가 들어오지 않았습니다. 기사 폰의 앱이 꺼졌거나 통신이 끊겼을 수 있어요.')}</Alert>}
          <Table size="small">
            <TableBody>
              {trip.stops.map((s) => (
                <TableRow key={s.id}>
                  <TableCell width={40}>{s.seq}</TableCell>
                  <TableCell>{s.name}</TableCell>
                  <TableCell align="right">{s.passed ? <Chip size="small" label={tr('지남')} /> : s.etaMinutes != null ? tr('약 {0}분', { 0: s.etaMinutes }) : '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Typography variant="caption" color="text.secondary">{tr('도착 예정은 직선거리와 평균 속도로 계산한 추정치입니다.')}</Typography>
        </Paper>
      )}
    </Stack>
  );
}
