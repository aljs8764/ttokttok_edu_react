'use client';

import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { api, errorMessage } from '@/lib/api';
import { DAYS, DAY_LABEL } from '@/lib/format';
import { useT } from '@/lib/i18n';

type Row = { use: boolean; name: string; days: string[]; startTime: string; endTime: string; capacity: string; error?: string; done?: boolean };

const WEEKDAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
const MWF = ['MONDAY', 'WEDNESDAY', 'FRIDAY'];
const TT = ['TUESDAY', 'THURSDAY'];

const r = (name: string, days: string[], startTime: string, endTime: string, capacity: number): Row => ({ use: true, name, days, startTime, endTime, capacity: String(capacity) });

/** ONB-002 반/수업 템플릿 — 기관 유형별로 자주 쓰는 반 구성 */
const TEMPLATES: { key: string; title: string; desc: string; rows: Row[] }[] = [
  {
    key: 'afterschool', title: '초등 방과후형', desc: '하교 시간에 맞춘 학년별 1~3부 (월~금)',
    rows: [r('1부 (초1·2)', WEEKDAYS, '13:00', '14:30', 15), r('2부 (초3·4)', WEEKDAYS, '14:30', '16:00', 15), r('3부 (초5·6)', WEEKDAYS, '16:00', '17:30', 15)],
  },
  {
    key: 'academy', title: '보습·교과 학원형', desc: '초등 오후반 + 중등 저녁반, 월수금/화목',
    rows: [
      r('초등 국어·수학 A', MWF, '15:00', '16:30', 12), r('초등 영어 B', TT, '15:00', '16:30', 12),
      r('중등 수학', MWF, '18:00', '20:00', 15), r('중등 영어', TT, '18:00', '20:00', 15),
    ],
  },
  {
    key: 'sports', title: '예체능 시간대형', desc: '태권도·줄넘기 등 50분 단위 1~4부 (월~금)',
    rows: [r('1부', WEEKDAYS, '14:00', '14:50', 20), r('2부', WEEKDAYS, '15:00', '15:50', 20), r('3부', WEEKDAYS, '16:00', '16:50', 20), r('4부', WEEKDAYS, '17:00', '17:50', 20)],
  },
  {
    key: 'studyroom', title: '공부방형', desc: '소규모 오후·저녁반 (월~금)',
    rows: [r('초등 오후반', WEEKDAYS, '14:00', '17:00', 9), r('중등 저녁반', WEEKDAYS, '18:00', '21:00', 9)],
  },
  {
    key: 'daycare', title: '어린이집·유치원형', desc: '연령별 종일반 (월~금 09:00~16:00)',
    rows: [r('새싹반 (만 2세)', WEEKDAYS, '09:00', '16:00', 15), r('햇살반 (만 3세)', WEEKDAYS, '09:00', '16:00', 18), r('꿈나무반 (만 4·5세)', WEEKDAYS, '09:00', '16:00', 20)],
  },
];

export default function ClassTemplateDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const tr = useT();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [running, setRunning] = useState(false);
  const [doneCount, setDoneCount] = useState(0);

  const close = () => {
    if (running) return;
    setRows(null);
    setDoneCount(0);
    onClose();
  };
  const upd = (i: number, patch: Partial<Row>) => setRows((arr) => arr && arr.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const valid = (x: Row) => x.name.trim() && x.days.length > 0 && x.startTime < x.endTime && Number(x.capacity) >= 1;
  const targets = rows?.filter((x) => x.use && !x.done) ?? [];

  async function create() {
    if (!rows) return;
    setRunning(true);
    let ok = 0;
    const next = [...rows];
    for (let i = 0; i < next.length; i++) {
      const x = next[i];
      if (!x.use || x.done) continue;
      try {
        await api.post('classes', { name: x.name.trim(), capacity: Number(x.capacity), days: x.days, startTime: x.startTime, endTime: x.endTime, teacherIds: [] });
        next[i] = { ...x, done: true, error: undefined };
        ok++;
      } catch (e) {
        next[i] = { ...x, error: errorMessage(e) };
      }
      setRows([...next]);
    }
    setDoneCount((c) => c + ok);
    setRunning(false);
    if (ok > 0) onCreated();
  }

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="md">
      <DialogTitle>{tr('템플릿으로 반 만들기')}</DialogTitle>
      <DialogContent>
        {!rows ? (
          <Grid container spacing={1.5} sx={{ pt: 1 }}>
            {TEMPLATES.map((t) => (
              <Grid key={t.key} size={{ xs: 12, sm: 6 }}>
                <Card variant="outlined">
                  <CardActionArea onClick={() => setRows(t.rows.map((x) => ({ ...x })))}>
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight={700}>{tr(t.title)}</Typography>
                      <Typography variant="body2" color="text.secondary">{tr(t.desc)}</Typography>
                      <Typography variant="caption" color="text.secondary">{t.rows.map((x) => x.name).join(' · ')}</Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {tr('이름·요일·시간·정원을 우리 기관에 맞게 고친 뒤 만드세요. 담당 교사는 만든 뒤 반 카드에서 배정합니다.')}
            </Typography>
            {running && <LinearProgress sx={{ mb: 1 }} />}
            {doneCount > 0 && <Alert severity="success" sx={{ mb: 1 }}>{tr('{0}개 반을 만들었습니다.', { 0: doneCount })}</Alert>}
            <Table size="small">
              <TableHead>
                <TableRow><TableCell padding="checkbox" /><TableCell>{tr('반 이름')}</TableCell><TableCell>{tr('요일')}</TableCell><TableCell>{tr('시작')}</TableCell><TableCell>{tr('끝')}</TableCell><TableCell>{tr('정원')}</TableCell></TableRow>
              </TableHead>
              <TableBody>
                {rows.map((x, i) => (
                  <TableRow key={i} sx={{ opacity: x.use ? 1 : 0.5 }}>
                    <TableCell padding="checkbox"><Checkbox checked={x.use} disabled={x.done} onChange={(e) => upd(i, { use: e.target.checked })} /></TableCell>
                    <TableCell>
                      <TextField size="small" variant="standard" value={x.name} disabled={x.done} onChange={(e) => upd(i, { name: e.target.value })} error={!!x.error} helperText={x.done ? tr('만들었음') : x.error} />
                    </TableCell>
                    <TableCell>
                      <ToggleButtonGroup size="small" value={x.days} disabled={x.done} onChange={(_, v: string[]) => upd(i, { days: v })}>
                        {DAYS.map((d) => <ToggleButton key={d} value={d} sx={{ px: 0.75, py: 0.25 }}>{tr(DAY_LABEL[d])}</ToggleButton>)}
                      </ToggleButtonGroup>
                    </TableCell>
                    <TableCell><TextField size="small" variant="standard" type="time" value={x.startTime} disabled={x.done} onChange={(e) => upd(i, { startTime: e.target.value })} /></TableCell>
                    <TableCell><TextField size="small" variant="standard" type="time" value={x.endTime} disabled={x.done} onChange={(e) => upd(i, { endTime: e.target.value })} /></TableCell>
                    <TableCell><TextField size="small" variant="standard" type="number" value={x.capacity} disabled={x.done} onChange={(e) => upd(i, { capacity: e.target.value })} sx={{ width: 64 }} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </DialogContent>
      <DialogActions>
        {rows && !running && <Button onClick={() => { setRows(null); setDoneCount(0); }}>{tr('다른 템플릿')}</Button>}
        <Button onClick={close} disabled={running}>{tr('닫기')}</Button>
        {rows && (
          <Button variant="contained" disabled={running || targets.length === 0 || !targets.every(valid)} onClick={() => void create()}>
            {tr('{0}개 반 만들기', { 0: targets.length })}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
