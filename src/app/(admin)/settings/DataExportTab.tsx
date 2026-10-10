'use client';

import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DownloadIcon from '@mui/icons-material/FileDownloadOutlined';
import dayjs from 'dayjs';
import { download, errorMessage } from '@/lib/api';

const SHEETS = ['원생', '보호자', '반', '반 배정', '출결(기간)', '알림장·공지(기간)', '청구·수납', '환불', '상담'];

/** SET-006 기관 데이터 내보내기 (원장 전용) */
export default function DataExportTab() {
  const [from, setFrom] = useState(dayjs().subtract(364, 'day').format('YYYY-MM-DD'));
  const [to, setTo] = useState(dayjs().format('YYYY-MM-DD'));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const run = async () => {
    setBusy(true);
    setError('');
    setDone(false);
    try {
      await download('GET', `institution/export.zip?from=${from}&to=${to}`, undefined, `똑똑에듀_데이터_${dayjs().format('YYYY-MM-DD')}.zip`);
      setDone(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 2.5, maxWidth: 720 }}>
      <Typography variant="h3" gutterBottom>데이터 내보내기</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        기관의 데이터를 엑셀 파일 묶음(ZIP)으로 내려받습니다: {SHEETS.join(' · ')}. 출결과 알림장은 아래 기간(최대 1년)만 담고, 나머지는 전체를 담습니다.
      </Typography>
      <Alert severity="warning" sx={{ mb: 2 }}>
        원생 생년월일과 보호자 전화번호가 그대로 들어 있습니다. 내려받은 기록은 감사 로그에 남습니다. 안전한 곳에 보관하고, 쓰임이 끝나면 지워 주세요.
      </Alert>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
        <TextField type="date" size="small" label="시작일" value={from} onChange={(e) => setFrom(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField type="date" size="small" label="종료일" value={to} onChange={(e) => setTo(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        <Button variant="contained" startIcon={<DownloadIcon />} disabled={busy || !from || !to} onClick={run}>
          {busy ? '만드는 중…' : 'ZIP 내려받기'}
        </Button>
      </Stack>
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      {done && <Alert severity="success" sx={{ mt: 2 }}>내려받았습니다.</Alert>}
    </Paper>
  );
}
