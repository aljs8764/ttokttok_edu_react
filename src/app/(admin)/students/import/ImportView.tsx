'use client';

import { useRef, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Stepper from '@mui/material/Stepper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/UploadFile';
import NextLink from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, download, errorMessage, upload } from '@/lib/api';
import type { ImportResult } from '@/lib/types';
import PageHeader from '@/components/PageHeader';

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * STU-002 엑셀 일괄 등록: 템플릿 → 업로드(전 행 검증) → 오류 행 확인 → 정상 행만 확정.
 * 검증 결과는 24시간 유지되고, 정원 초과는 확정 시점에 다시 판단한다.
 */
export default function ImportView() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [fileError, setFileError] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [sendGuide, setSendGuide] = useState(true);
  const [created, setCreated] = useState<number | null>(null);
  const [dlError, setDlError] = useState('');

  const validate = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return upload<ImportResult>('students/import', form);
    },
    onSuccess: (r) => {
      setResult(r);
      setCreated(null);
    },
  });

  const commit = useMutation({
    mutationFn: () => api.post<{ created: number }>(`students/import/${result!.jobId}/commit`, { sendInstallGuide: sendGuide }),
    onSuccess: (r) => {
      setCreated(r.created);
      setResult((x) => (x ? { ...x, committed: true } : x));
      void qc.invalidateQueries({ queryKey: ['students'] });
      void qc.invalidateQueries({ queryKey: ['classes'] });
    },
  });

  const onFile = (f?: File) => {
    setFileError('');
    if (!f) return;
    if (!/\.xlsx$/i.test(f.name)) return setFileError('.xlsx 파일만 올릴 수 있습니다');
    if (f.size > MAX_BYTES) return setFileError('5MB 이하 파일만 올릴 수 있습니다');
    setFileName(f.name);
    setResult(null);
    setCreated(null);
    commit.reset();
    validate.mutate(f);
  };

  const dl = (path: string, name: string) => {
    setDlError('');
    download('GET', path, undefined, name).catch((e) => setDlError(errorMessage(e)));
  };

  const step = created !== null ? 3 : result ? 2 : 1;
  const errorRows = result ? new Set(result.errors.map((e) => e.rowNumber)).size : 0;

  return (
    <>
      <PageHeader
        title="엑셀 일괄 등록"
        menuId="STU-002"
        description="오류가 있는 행은 빼고 정상 행만 등록합니다. 오류 행은 엑셀로 내려받아 고친 뒤 다시 올리세요."
        actions={
          <Button startIcon={<ArrowBackIcon />} component={NextLink} href="/students">
            원생 목록
          </Button>
        }
      />

      <Stepper activeStep={step} alternativeLabel sx={{ mb: 3 }}>
        {['템플릿 받기', '파일 올리기', '결과 확인', '등록 완료'].map((l) => (
          <Step key={l}>
            <StepLabel>{l}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Paper sx={{ p: 3, mb: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1">1. 템플릿에 원생 정보를 채워 주세요</Typography>
            <Typography variant="body2" color="text.secondary">
              필수: 이름, 생년월일(YYYY-MM-DD), 반명(반 관리의 이름과 같게), 보호자 연락처 · 선택: 보호자 관계, 학년, 메모
            </Typography>
          </Box>
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => dl('students/import/template', '똑똑_원생등록_템플릿.xlsx')}>
            템플릿 내려받기
          </Button>
        </Stack>
        {dlError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {dlError}
          </Alert>
        )}
      </Paper>

      <Paper
        sx={{ p: 3, mb: 2, border: '2px dashed', borderColor: 'divider', textAlign: 'center', cursor: 'pointer' }}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          onFile(e.dataTransfer.files?.[0]);
        }}
      >
        <input
          ref={fileRef}
          type="file"
          hidden
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(e) => {
            onFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        <UploadIcon color="primary" sx={{ fontSize: 40 }} />
        <Typography variant="subtitle1">2. 작성한 파일을 끌어 놓거나 눌러서 선택하세요</Typography>
        <Typography variant="body2" color="text.secondary">
          {fileName || '.xlsx · 5MB 이하'}
        </Typography>
        {validate.isPending && <LinearProgress sx={{ mt: 2 }} />}
      </Paper>
      {fileError && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {fileError}
        </Alert>
      )}
      {validate.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage(validate.error)}
        </Alert>
      )}

      {result && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="subtitle1" sx={{ mb: 1.5 }}>
            3. 검증 결과
          </Typography>
          <Stack direction="row" spacing={3} sx={{ mb: 2 }}>
            <Summary label="전체" value={result.totalRows} />
            <Summary label="등록 가능" value={result.validRows} color="success.main" />
            <Summary label="오류 행" value={errorRows} color={errorRows ? 'error.main' : undefined} />
          </Stack>

          {result.errors.length > 0 && (
            <>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  아래 행은 등록되지 않습니다.
                </Typography>
                <Button size="small" startIcon={<DownloadIcon />} onClick={() => dl(`students/import/${result.jobId}/errors`, '원생등록_오류행.xlsx')}>
                  오류 행 엑셀
                </Button>
              </Stack>
              <TableContainer sx={{ maxHeight: 320, mb: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell width={80}>행</TableCell>
                      <TableCell width={160}>항목</TableCell>
                      <TableCell>내용</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {result.errors.map((e, i) => (
                      <TableRow key={i}>
                        <TableCell>{e.rowNumber}</TableCell>
                        <TableCell>{e.column}</TableCell>
                        <TableCell sx={{ color: 'error.main' }}>{e.message}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}

          {created !== null ? (
            <Alert
              severity="success"
              action={
                <Button color="inherit" size="small" component={NextLink} href="/students">
                  원생 목록 보기
                </Button>
              }
            >
              {created}명을 등록했습니다.
            </Alert>
          ) : result.committed ? (
            <Alert severity="info">이미 등록이 끝난 업로드입니다.</Alert>
          ) : (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent="space-between">
              <FormControlLabel
                control={<Checkbox checked={sendGuide} onChange={(e) => setSendGuide(e.target.checked)} />}
                label="보호자에게 앱 설치 안내 알림톡 보내기"
              />
              <Button variant="contained" disabled={result.validRows === 0 || commit.isPending} onClick={() => commit.mutate()}>
                정상 {result.validRows}명 등록
              </Button>
            </Stack>
          )}
          {commit.isError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {errorMessage(commit.error)}
            </Alert>
          )}
        </Paper>
      )}
    </>
  );
}

function Summary({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h3" sx={{ color }}>
        {value}
      </Typography>
    </Box>
  );
}
