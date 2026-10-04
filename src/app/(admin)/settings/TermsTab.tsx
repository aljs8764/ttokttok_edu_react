'use client';

import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import { usePendingTerms } from '@/components/TermsGate';
import type { Terms } from '@/lib/types';

/**
 * SET-005 기관용 약관 (서비스 이용약관·개인정보 처리 위탁). 개정되면 다음 접속 때 재동의 창이 뜬다(TermsGate).
 * 학부모용 약관은 학부모 앱 가입 화면에서 동의받는다.
 */
export default function TermsTab() {
  const current = useQuery({ queryKey: ['terms', 'INSTITUTION'], queryFn: () => api.get<Terms[]>('terms', { audience: 'INSTITUTION' }) });
  const pending = usePendingTerms();
  const pendingIds = new Set((pending.data ?? []).map((t) => t.id));

  if (current.isError) return <Alert severity="error">{errorMessage(current.error)}</Alert>;
  if (!current.data) return <LinearProgress />;

  return (
    <Box sx={{ maxWidth: 900 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        현재 시행 중인 기관용 약관입니다. 학부모용 약관(서비스·개인정보·만 14세 미만 법정대리인 동의·마케팅)은 학부모 앱에서 동의받습니다.
      </Typography>
      {current.data.length === 0 && <Alert severity="info">등록된 약관이 없습니다.</Alert>}
      {current.data.map((t) => (
        <Accordion key={t.id} disableGutters>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
              <Typography variant="subtitle2">{t.title}</Typography>
              <Chip size="small" label={t.required ? '필수' : '선택'} color={t.required ? 'primary' : 'default'} variant="outlined" />
              <Typography variant="caption" color="text.secondary">
                v{t.version} · {dayjs(t.effectiveAt).format('YYYY-MM-DD')} 시행
              </Typography>
              {pendingIds.has(t.id) ? <Chip size="small" label="동의 필요" color="warning" /> : <Chip size="small" label="동의함" color="success" variant="outlined" />}
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', maxHeight: 400, overflow: 'auto' }}>
              {t.body}
            </Typography>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
}
