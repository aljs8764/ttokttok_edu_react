'use client';

import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import ArrowUpIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownIcon from '@mui/icons-material/ArrowDownward';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import { useSession } from '@/lib/session';
import type { ShuttleRider, ShuttleRoute } from '@/lib/shuttle';
import type { Page, Student } from '@/lib/types';
import ShuttleMap from '@/components/ShuttleMap';

type RouteForm = { name: string; vehicleName: string; plateNo: string; driverName: string; driverPhone: string; active: boolean };
type StopDraft = { key: string; id: string | null; name: string; lat: string; lng: string };

const EMPTY: RouteForm = { name: '', vehicleName: '', plateNo: '', driverName: '', driverPhone: '', active: true };
let seq = 0;
const nextKey = () => `n${++seq}`;

function Editor({ route, onClose }: { route: ShuttleRoute | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { session, manager } = useSession();
  const instId = session?.institution?.institutionId;
  const [routeId, setRouteId] = useState<string | null>(route?.id ?? null);
  const [form, setForm] = useState<RouteForm>(route ? {
    name: route.name, vehicleName: route.vehicleName ?? '', plateNo: route.plateNo ?? '', driverName: route.driverName ?? '', driverPhone: route.driverPhone ?? '', active: route.active,
  } : EMPTY);
  const [stops, setStops] = useState<StopDraft[]>(route?.stops.map((s) => ({ key: s.id, id: s.id, name: s.name, lat: String(s.lat), lng: String(s.lng) })) ?? []);
  const [riders, setRiders] = useState<{ studentId: string; studentName: string; stopId: string }[]>([]);
  const [pick, setPick] = useState<Student | null>(null);
  const [pickStop, setPickStop] = useState('');
  const [kw, setKw] = useState('');
  const [saved, setSaved] = useState('');

  const riderQ = useQuery({ queryKey: ['shuttle', 'riders', routeId], queryFn: () => api.get<ShuttleRider[]>(`shuttle/routes/${routeId}/riders`), enabled: !!routeId });
  useEffect(() => { if (riderQ.data) setRiders(riderQ.data.map((r) => ({ studentId: r.studentId, studentName: r.studentName, stopId: r.stopId }))); }, [riderQ.data]);
  const students = useQuery({
    queryKey: ['students', instId, 'shuttle', kw],
    queryFn: () => api.get<Page<Student>>('students', { status: 'ACTIVE', keyword: kw || undefined, size: 20, page: 0 }),
    enabled: !!instId && !!routeId && manager,
  });
  const refresh = () => { void qc.invalidateQueries({ queryKey: ['shuttle'] }); };

  const saveRoute = useMutation({
    mutationFn: () => {
      const body = { ...form, vehicleName: form.vehicleName || null, plateNo: form.plateNo || null, driverName: form.driverName || null, driverPhone: form.driverPhone || null };
      return routeId ? api.put<ShuttleRoute>(`shuttle/routes/${routeId}`, body) : api.post<ShuttleRoute>('shuttle/routes', body);
    },
    onSuccess: (r) => { setRouteId(r.id); setSaved('노선 정보를 저장했습니다'); refresh(); },
  });
  const saveStops = useMutation({
    mutationFn: () => api.put<ShuttleRoute>(`shuttle/routes/${routeId}/stops`, {
      stops: stops.map((s) => ({ id: s.id, name: s.name.trim(), lat: Number(s.lat), lng: Number(s.lng) })),
    }),
    onSuccess: (r) => {
      setStops(r.stops.map((s) => ({ key: s.id, id: s.id, name: s.name, lat: String(s.lat), lng: String(s.lng) })));
      setSaved('정류장을 저장했습니다'); refresh(); void riderQ.refetch();
    },
  });
  const saveRiders = useMutation({
    mutationFn: () => api.put<ShuttleRider[]>(`shuttle/routes/${routeId}/riders`, { riders: riders.map((r) => ({ studentId: r.studentId, stopId: r.stopId })) }),
    onSuccess: () => { setSaved('탑승 원생을 저장했습니다'); refresh(); },
  });
  const err = saveRoute.error ?? saveStops.error ?? saveRiders.error ?? riderQ.error;

  const savedStops = stops.filter((s) => s.id);
  const stopsValid = stops.every((s) => s.name.trim() && !Number.isNaN(Number(s.lat)) && !Number.isNaN(Number(s.lng)) && s.lat !== '' && s.lng !== '');
  const move = (i: number, d: number) => setStops((arr) => { const a = [...arr]; const [x] = a.splice(i, 1); a.splice(i + d, 0, x); return a; });
  const upd = (i: number, patch: Partial<StopDraft>) => setStops((arr) => arr.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>{route ? route.name : '새 노선'}</DialogTitle>
      <DialogContent>
        {err && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage(err)}</Alert>}
        {saved && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSaved('')}>{saved}</Alert>}
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="subtitle2">노선·차량</Typography>
          <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' } }}>
            <TextField size="small" label="노선 이름 (예: 2호차 하원)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} disabled={!manager} />
            <TextField size="small" label="차량" value={form.vehicleName} onChange={(e) => setForm({ ...form, vehicleName: e.target.value })} disabled={!manager} />
            <TextField size="small" label="차량 번호" value={form.plateNo} onChange={(e) => setForm({ ...form, plateNo: e.target.value })} disabled={!manager} />
            <TextField size="small" label="기사 이름" value={form.driverName} onChange={(e) => setForm({ ...form, driverName: e.target.value })} disabled={!manager} />
            <TextField size="small" label="기사 연락처 (학부모 앱에 표시)" value={form.driverPhone} onChange={(e) => setForm({ ...form, driverPhone: e.target.value })} disabled={!manager} />
            <FormControlLabel control={<Switch checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} disabled={!manager} />} label="사용 중" />
          </Box>
          {manager && <Button variant="outlined" sx={{ alignSelf: 'flex-start' }} disabled={!form.name.trim() || saveRoute.isPending} onClick={() => saveRoute.mutate()}>노선 정보 저장</Button>}

          {routeId && (
            <>
              <Divider />
              <Stack direction="row" alignItems="center">
                <Typography variant="subtitle2" sx={{ flex: 1 }}>정류장 (운행 순서대로){manager && ' — 지도를 누르면 정류장이 추가됩니다'}</Typography>
                {manager && <Button variant="outlined" size="small" disabled={!stopsValid || saveStops.isPending} onClick={() => saveStops.mutate()}>정류장 저장</Button>}
              </Stack>
              <ShuttleMap
                height={360}
                fitKey={`${routeId}-${savedStops.length}`}
                stops={stops.filter((s) => s.lat !== '' && s.lng !== '' && !Number.isNaN(Number(s.lat))).map((s, i) => ({ seq: i + 1, name: s.name || '(이름 없음)', lat: Number(s.lat), lng: Number(s.lng) }))}
                onMapClick={manager ? (p) => setStops((arr) => [...arr, { key: nextKey(), id: null, name: `정류장 ${arr.length + 1}`, lat: p.lat.toFixed(6), lng: p.lng.toFixed(6) }]) : undefined}
              />
              <Table size="small">
                <TableHead><TableRow><TableCell width={40}>#</TableCell><TableCell>이름</TableCell><TableCell>위도</TableCell><TableCell>경도</TableCell>{manager && <TableCell align="right" />}</TableRow></TableHead>
                <TableBody>
                  {stops.map((s, i) => (
                    <TableRow key={s.key}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell><TextField size="small" variant="standard" value={s.name} onChange={(e) => upd(i, { name: e.target.value })} disabled={!manager} fullWidth /></TableCell>
                      <TableCell><TextField size="small" variant="standard" value={s.lat} onChange={(e) => upd(i, { lat: e.target.value })} disabled={!manager} /></TableCell>
                      <TableCell><TextField size="small" variant="standard" value={s.lng} onChange={(e) => upd(i, { lng: e.target.value })} disabled={!manager} /></TableCell>
                      {manager && (
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                          <IconButton size="small" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUpIcon fontSize="small" /></IconButton>
                          <IconButton size="small" disabled={i === stops.length - 1} onClick={() => move(i, 1)}><ArrowDownIcon fontSize="small" /></IconButton>
                          <IconButton size="small" onClick={() => setStops((arr) => arr.filter((_, j) => j !== i))}><DeleteIcon fontSize="small" /></IconButton>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {stops.length === 0 && <TableRow><TableCell colSpan={5} align="center">정류장이 없습니다</TableCell></TableRow>}
                </TableBody>
              </Table>
              {manager && <Typography variant="caption" color="text.secondary">정류장을 지우면 그 정류장에 배정된 원생도 배정이 풀립니다. 운행 중에는 바꿀 수 없습니다.</Typography>}

              <Divider />
              <Stack direction="row" alignItems="center">
                <Typography variant="subtitle2" sx={{ flex: 1 }}>탑승 원생 ({riders.length}명)</Typography>
                {manager && <Button variant="outlined" size="small" disabled={saveRiders.isPending} onClick={() => saveRiders.mutate()}>탑승 원생 저장</Button>}
              </Stack>
              {manager && (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <Autocomplete
                    size="small" sx={{ minWidth: 240 }} options={students.data?.items ?? []} value={pick} onChange={(_, v) => setPick(v)}
                    onInputChange={(_, v) => setKw(v)} filterOptions={(x) => x}
                    getOptionLabel={(s) => s.name} isOptionEqualToValue={(a, b) => a.id === b.id}
                    renderInput={(p) => <TextField {...p} label="원생 이름 검색" />}
                  />
                  <TextField select size="small" label="정류장" value={pickStop} onChange={(e) => setPickStop(e.target.value)} sx={{ minWidth: 200 }}>
                    {savedStops.map((s) => <MenuItem key={s.id!} value={s.id!}>{s.name}</MenuItem>)}
                  </TextField>
                  <Button disabled={!pick || !pickStop} onClick={() => {
                    setRiders((arr) => [...arr.filter((r) => r.studentId !== pick!.id), { studentId: pick!.id, studentName: pick!.name, stopId: pickStop }]);
                    setPick(null);
                  }}>추가</Button>
                </Stack>
              )}
              {savedStops.length === 0 && <Alert severity="info">정류장을 먼저 저장해야 원생을 배정할 수 있습니다.</Alert>}
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
                {riders.map((r) => (
                  <Chip
                    key={r.studentId}
                    label={`${r.studentName} · ${savedStops.find((s) => s.id === r.stopId)?.name ?? '?'}`}
                    onDelete={manager ? () => setRiders((arr) => arr.filter((x) => x.studentId !== r.studentId)) : undefined}
                  />
                ))}
              </Stack>
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions><Button onClick={onClose}>닫기</Button></DialogActions>
    </Dialog>
  );
}

/** 노선·정류장·탑승 원생 관리 */
export default function RoutesTab() {
  const { session, manager } = useSession();
  const instId = session?.institution?.institutionId;
  const [editing, setEditing] = useState<ShuttleRoute | null | 'new'>(null);
  const q = useQuery({ queryKey: ['shuttle', 'routes', instId, manager], queryFn: () => api.get<ShuttleRoute[]>('shuttle/routes', { all: manager }), enabled: !!instId });
  return (
    <>
      {manager && (
        <Stack direction="row" sx={{ mb: 2 }}>
          <Button variant="contained" sx={{ ml: 'auto' }} onClick={() => setEditing('new')}>노선 추가</Button>
        </Stack>
      )}
      {q.isError && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage(q.error)}</Alert>}
      <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead><TableRow><TableCell>노선</TableCell><TableCell>차량</TableCell><TableCell>기사</TableCell><TableCell align="right">정류장</TableCell><TableCell align="right">탑승</TableCell><TableCell>상태</TableCell></TableRow></TableHead>
          <TableBody>
            {q.data?.map((r) => (
              <TableRow key={r.id} hover sx={{ cursor: 'pointer' }} onClick={() => setEditing(r)}>
                <TableCell>{r.name}</TableCell>
                <TableCell>{[r.vehicleName, r.plateNo].filter(Boolean).join(' · ') || '-'}</TableCell>
                <TableCell>{r.driverName ?? '-'}</TableCell>
                <TableCell align="right">{r.stops.length}</TableCell>
                <TableCell align="right">{r.riderCount}명</TableCell>
                <TableCell>
                  {r.runningTripId ? <Chip size="small" color="success" label="운행 중" /> : r.active ? <Chip size="small" variant="outlined" label="대기" /> : <Chip size="small" label="미사용" />}
                </TableCell>
              </TableRow>
            ))}
            {q.data?.length === 0 && <TableRow><TableCell colSpan={6} align="center">등록된 노선이 없습니다</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Paper>
      {editing && <Editor route={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </>
  );
}
