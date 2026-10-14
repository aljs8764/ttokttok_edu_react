'use client';

import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import InputAdornment from '@mui/material/InputAdornment';
import LinearProgress from '@mui/material/LinearProgress';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import PrintIcon from '@mui/icons-material/Print';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import { dateTime } from '@/lib/format';
import { useSession } from '@/lib/session';
import type { CheckinQr, Geofence, QrScanFailure } from '@/lib/types';
import PageHeader from '@/components/PageHeader';
import QrImage from '@/components/QrImage';
import { useT } from '@/lib/i18n';
import MenuIdChip from '@/components/ui/MenuIdChip';

const REASON: Record<string, string> = {
  QR_INVALID: '재발급·삭제된 QR',
  NOT_ENROLLED: '다른 학원 QR·재원 아님',
  OUT_OF_RANGE: '학원 밖에서 스캔',
  NO_CLASS_NOW: '수업 시간 아님',
  LOCATION_REQUIRED: '위치 권한 꺼짐',
};

/** 인쇄 창 열기 — 선택한 QR 을 A4 한 장에 하나씩 */
function openPrint(ids: string[]) {
  window.open(`/print/qr?ids=${ids.join(',')}`, '_blank', 'noopener');
}

/**
 * QR-001 출석 QR 만들기·인쇄·재발급, QR-002 기관 위치(부정 출석 방지).
 * 학생은 학생앱으로 이 QR 을 찍어 스스로 등·하원한다 (스펙 7-7).
 */
export default function QrCodesView() {
  const t = useT();
  const qc = useQueryClient();
  const { session, role } = useSession();
  const instId = session?.institution?.institutionId;
  const owner = role === 'OWNER';
  const [createOpen, setCreateOpen] = useState(false);
  const [rotating, setRotating] = useState<CheckinQr | null>(null);
  const [deleting, setDeleting] = useState<CheckinQr | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  const qrs = useQuery({ queryKey: ['checkin-qrs', instId], queryFn: () => api.get<CheckinQr[]>('checkin-qrs'), enabled: !!instId });
  const fence = useQuery({
    queryKey: ['geofence', instId],
    queryFn: () => api.get<{ geofence: Geofence | null }>('institution/geofence'),
    enabled: !!instId,
  });
  const failures = useQuery({
    queryKey: ['checkin-qrs', instId, 'failures'],
    queryFn: () => api.get<QrScanFailure[]>('checkin-qrs/failures'),
    enabled: !!instId,
  });

  const refresh = () => void qc.invalidateQueries({ queryKey: ['checkin-qrs'] });
  const list = qrs.data ?? [];
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <>
      <PageHeader
        title={t('출석 QR')}
        menuId="QR-001"
        description={t('입구에 붙일 QR 을 만들어 인쇄하세요. 학생이 학생앱으로 찍으면 등원·하원이 처리되고 학부모에게 알림이 갑니다.')}
        actions={
          <>
            <Button variant="outlined" startIcon={<PrintIcon />} disabled={list.length === 0} onClick={() => openPrint(selected.length ? selected : list.map((q) => q.id))}>
              {selected.length ? t('선택 {0}개 인쇄', { 0: selected.length }) : t('모두 인쇄')}
            </Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
              {t('QR 만들기')}
            </Button>
          </>
        }
      />

      {fence.isSuccess && !fence.data.geofence && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {t('기관 위치가 설정되지 않아 학원 밖에서 찍어도 출석됩니다. 아래에서 위치를 설정하세요')}{owner ? '' : t(' (원장만 설정 가능)')}.
        </Alert>
      )}

      {qrs.isFetching && !qrs.data && <LinearProgress />}
      {qrs.isError && <Alert severity="error">{errorMessage(qrs.error)}</Alert>}
      {qrs.isSuccess && list.length === 0 && <Alert severity="info">{t('아직 QR 이 없습니다. 입구마다 하나씩 만드는 것을 권장합니다 (예: 1층 입구).')}</Alert>}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {list.map((q) => (
          <Grid key={q.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flex: 1 }}>
                <Stack direction="row" alignItems="center" sx={{ mb: 1 }}>
                  <Checkbox size="small" checked={selected.includes(q.id)} onChange={() => toggle(q.id)} sx={{ ml: -1 }} />
                  <Typography variant="subtitle1" sx={{ flex: 1 }} noWrap>
                    {q.name}
                  </Typography>
                </Stack>
                <Box sx={{ display: 'grid', placeItems: 'center', py: 1 }}>
                  <QrImage value={q.content} size={168} />
                </Box>
                <Typography variant="caption" color="text.secondary" component="div" sx={{ textAlign: 'center' }}>
                  {q.rotatedAt ? t('{0} 재발급', { 0: dateTime(q.rotatedAt) }) : t('{0} 생성', { 0: dateTime(q.createdAt) })}
                </Typography>
              </CardContent>
              <CardActions sx={{ px: 2, pb: 2 }}>
                <Button size="small" startIcon={<PrintIcon />} onClick={() => openPrint([q.id])}>
                  {t('인쇄')}
                </Button>
                <Button size="small" onClick={() => setRotating(q)}>
                  {t('재발급')}
                </Button>
                <Button size="small" color="error" sx={{ ml: 'auto !important' }} onClick={() => setDeleting(q)}>
                  {t('삭제')}
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <GeofenceCard current={fence.data?.geofence ?? null} loading={fence.isLoading} editable={owner} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ px: 3, py: 2.5 }}>
            <Typography variant="subtitle1">{t('최근 7일 스캔 실패')}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {t('같은 학생이 학원 밖에서 반복해서 찍으면 QR 사진이 공유된 것일 수 있습니다. 재발급하세요.')}
            </Typography>
            {failures.data?.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                {t('실패 기록이 없습니다')}
              </Typography>
            )}
            {(failures.data?.length ?? 0) > 0 && (
              <Box sx={{ maxHeight: 320, overflow: 'auto' }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('시각')}</TableCell>
                      <TableCell>{t('원생')}</TableCell>
                      <TableCell>{t('사유')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {failures.data!.map((f, i) => (
                      <TableRow key={i}>
                        <TableCell>{dateTime(f.at)}</TableCell>
                        <TableCell>{f.studentName}</TableCell>
                        <TableCell>
                          {t(REASON[f.reason] ?? f.reason)}
                          {f.distanceMeters != null && ` (${f.distanceMeters.toLocaleString()}m)`}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      <CreateDialog open={createOpen} onClose={() => setCreateOpen(false)} onDone={refresh} />
      <ConfirmDialog
        target={rotating}
        title={t('QR 재발급')}
        body={t('새 QR 로 바뀌고, 지금 붙어 있는 인쇄물은 바로 쓸 수 없게 됩니다. 재발급 후 다시 인쇄해서 붙여 주세요.')}
        confirm={t('재발급')}
        action={(q) => api.post(`checkin-qrs/${q.id}/rotate`)}
        onClose={() => setRotating(null)}
        onDone={(q) => (refresh(), openPrint([q.id]))}
      />
      <ConfirmDialog
        target={deleting}
        title={t('QR 삭제')}
        body={t('삭제하면 이 QR 로는 출석할 수 없습니다. 붙어 있는 인쇄물도 떼어 주세요.')}
        confirm={t('삭제')}
        danger
        action={(q) => api.delete(`checkin-qrs/${q.id}`)}
        onClose={() => setDeleting(null)}
        onDone={(q) => (refresh(), setSelected((s) => s.filter((x) => x !== q.id)))}
      />
    </>
  );
}

function CreateDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const t = useT();
  const [name, setName] = useState('');
  useEffect(() => {
    if (open) setName('');
  }, [open]);
  const create = useMutation({
    mutationFn: () => api.post<CheckinQr>('checkin-qrs', { name: name.trim() }),
    onSuccess: () => {
      onDone();
      onClose();
    },
  });
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t('출석 QR 만들기')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label={t('붙일 곳')}
            autoFocus
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('예: 1층 입구, 2층 자습실')}
            inputProps={{ maxLength: 50 }}
            onKeyDown={(e) => e.key === 'Enter' && name.trim() && !create.isPending && create.mutate()}
          />
          {create.isError && <Alert severity="error">{errorMessage(create.error)}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('취소')}</Button>
        <Button variant="contained" disabled={!name.trim() || create.isPending} onClick={() => create.mutate()}>
          {t('만들기')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ConfirmDialog({
  target,
  title,
  body,
  confirm,
  danger,
  action,
  onClose,
  onDone,
}: {
  target: CheckinQr | null;
  title: string;
  body: string;
  confirm: string;
  danger?: boolean;
  action: (q: CheckinQr) => Promise<unknown>;
  onClose: () => void;
  onDone: (q: CheckinQr) => void;
}) {
  const t = useT();
  const run = useMutation({
    mutationFn: (q: CheckinQr) => action(q),
    onSuccess: (_, q) => {
      onDone(q);
      onClose();
    },
  });
  useEffect(() => run.reset(), [target]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Dialog open={!!target} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        {title} — {target?.name}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mt: 1 }}>
          {body}
        </Typography>
        {run.isError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {errorMessage(run.error)}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('취소')}</Button>
        <Button variant="contained" color={danger ? 'error' : 'primary'} disabled={run.isPending} onClick={() => target && run.mutate(target)}>
          {confirm}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/**
 * QR-002 기관 위치. 학원 안에서 "현재 위치 가져오기"를 누르는 게 가장 정확하다.
 * 좌표는 지도 앱에서 확인할 수 있게 링크를 함께 보여 준다.
 */
function GeofenceCard({ current, loading, editable }: { current: Geofence | null; loading: boolean; editable: boolean }) {
  const t = useT();
  const qc = useQueryClient();
  const { session } = useSession();
  const instId = session?.institution?.institutionId;
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [radius, setRadius] = useState('150');
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setLat(current ? String(current.latitude) : '');
    setLng(current ? String(current.longitude) : '');
    setRadius(current ? String(current.radiusMeters) : '150');
  }, [current]);

  const save = useMutation({
    mutationFn: (body: Geofence | null) => api.put<{ geofence: Geofence | null }>('institution/geofence', body ?? undefined),
    onSuccess: (r) => {
      qc.setQueryData(['geofence', instId], r);
      setSaved(true);
    },
  });

  const locate = () => {
    setGeoError('');
    if (!navigator.geolocation) return setGeoError(t('이 브라우저는 위치를 지원하지 않습니다'));
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLat(p.coords.latitude.toFixed(6));
        setLng(p.coords.longitude.toFixed(6));
        setLocating(false);
        setSaved(false);
        if (p.coords.accuracy > 100) setGeoError(t('정확도가 낮습니다(±{0}m). 학원 안 휴대폰에서 다시 해 보세요', { 0: Math.round(p.coords.accuracy) }));
      },
      (e) => {
        setLocating(false);
        setGeoError(e.code === e.PERMISSION_DENIED ? t('브라우저 위치 권한을 허용해 주세요') : t('위치를 가져오지 못했습니다'));
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const latN = Number(lat);
  const lngN = Number(lng);
  const radN = Number(radius);
  const valid = lat !== '' && lng !== '' && latN >= -90 && latN <= 90 && lngN >= -180 && lngN <= 180 && Number.isInteger(radN) && radN >= 30 && radN <= 1000;
  const mapUrl = valid ? t('https://map.kakao.com/link/map/학원,{0},{1}', { 0: latN, 1: lngN }) : null;

  return (
    <Paper sx={{ px: 3, py: 2.5 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <Typography variant="subtitle1">{t('기관 위치')}</Typography>
        <MenuIdChip id="QR-002" />
        {current ? <Chip size="small" color="success" label={t('반경 {0}m 확인 중', { 0: current.radiusMeters })} /> : <Chip size="small" label={t('꺼짐')} />}
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t('학생 휴대폰 위치가 이 반경 안일 때만 QR 출석이 됩니다 (GPS 오차는 최대 100m 까지 봐 줍니다). 위치 좌표는 저장하지 않습니다.')}
      </Typography>
      {loading && <LinearProgress />}
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1.5}>
          <TextField label={t('위도')} size="small" fullWidth value={lat} onChange={(e) => (setLat(e.target.value), setSaved(false))} disabled={!editable} />
          <TextField label={t('경도')} size="small" fullWidth value={lng} onChange={(e) => (setLng(e.target.value), setSaved(false))} disabled={!editable} />
        </Stack>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <TextField
            label={t('반경')}
            size="small"
            value={radius}
            onChange={(e) => (setRadius(e.target.value.replace(/\D/g, '')), setSaved(false))}
            disabled={!editable}
            sx={{ width: 140 }}
            InputProps={{ endAdornment: <InputAdornment position="end">m</InputAdornment> }}
            helperText="30~1000"
          />
          {editable && (
            <Button startIcon={<MyLocationIcon />} disabled={locating} onClick={locate}>
              {locating ? t('위치 확인 중…') : t('현재 위치 가져오기')}
            </Button>
          )}
          {mapUrl && (
            <Link href={mapUrl} target="_blank" rel="noopener" variant="body2">
              {t('지도에서 확인')}
            </Link>
          )}
        </Stack>
        {geoError && <Alert severity="warning">{geoError}</Alert>}
        {save.isError && <Alert severity="error">{errorMessage(save.error)}</Alert>}
        {editable && (
          <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
            {saved && (
              <Typography variant="body2" color="success.dark">
                {t('저장했습니다')}
              </Typography>
            )}
            {current && (
              <Button color="inherit" disabled={save.isPending} onClick={() => save.mutate(null)}>
                {t('위치 확인 끄기')}
              </Button>
            )}
            <Button variant="contained" disabled={!valid || save.isPending} onClick={() => save.mutate({ latitude: latN, longitude: lngN, radiusMeters: radN })}>
              {t('저장')}
            </Button>
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}
