'use client';

import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import { QUESTION_TYPE, type SurveyResults } from '@/lib/comm';
import { dateTime } from '@/lib/format';
import { useSession } from '@/lib/session';
import PageHeader from '@/components/PageHeader';
import { useT } from '@/lib/i18n';

/** NTC-010 설문 결과 — 문항별 집계, 응답자·미응답자, 미응답 재푸시(30분 쿨타임), 마감 */
export default function SurveyResultView({ id }: { id: string }) {
  const tr = useT();
  const qc = useQueryClient();
  const { session } = useSession();
  const instId = session?.institution?.institutionId;
  const [msg, setMsg] = useState('');

  const res = useQuery({ queryKey: ['surveys', instId, 'results', id], queryFn: () => api.get<SurveyResults>(`surveys/${id}/results`), enabled: !!instId, refetchInterval: 60_000 });
  const refresh = () => qc.invalidateQueries({ queryKey: ['surveys'] });
  const close = useMutation({ mutationFn: () => api.post(`surveys/${id}/close`), onSuccess: refresh });
  const remind = useMutation({
    mutationFn: () => api.post<{ pushRecipients: number }>(`surveys/${id}/remind`),
    onSuccess: (r) => setMsg(tr('미응답 보호자 {0}명에게 알림을 보냈습니다', { 0: r.pushRecipients })),
  });

  const s = res.data?.survey;
  return (
    <>
      <PageHeader
        title={s?.title ?? tr('설문 결과')}
        menuId="NTC-010"
        description={s ? `${s.author.name} · ${dateTime(s.createdAt)}${s.closesAt ? tr(' · 마감 {0}', { 0: dateTime(s.closesAt) }) : ''}` : undefined}
        actions={
          s?.status === 'OPEN' && (
            <>
              <Button variant="outlined" disabled={remind.isPending} onClick={() => (setMsg(''), remind.mutate())}>
                {tr('미응답자에게 다시 알림')}
              </Button>
              <Button
                variant="outlined"
                color="warning"
                disabled={close.isPending}
                onClick={() => {
                  if (window.confirm(tr('설문을 마감할까요? 마감 후에는 응답을 받을 수 없습니다.'))) close.mutate();
                }}
              >
                {tr('마감')}
              </Button>
            </>
          )
        }
      />
      {res.isError && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage(res.error)}</Alert>}
      {(remind.isError || close.isError) && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage(remind.error ?? close.error)}</Alert>}
      {msg && <Alert severity="success" sx={{ mb: 2 }}>{msg}</Alert>}
      {res.isFetching && <LinearProgress />}
      {s && (
        <Stack spacing={2} sx={{ maxWidth: 900 }}>
          <Paper sx={{ p: 2.5 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip size="small" label={s.status === 'OPEN' ? tr('진행 중') : tr('마감')} color={s.status === 'OPEN' ? 'primary' : 'default'} />
              <Typography variant="body2">
                {tr('응답 {0}/{1}명 ({2}%)', { 0: s.responses, 1: s.recipients, 2: s.recipients ? Math.round((s.responses / s.recipients) * 100) : 0 })}
              </Typography>
            </Stack>
            {s.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                {s.description}
              </Typography>
            )}
          </Paper>

          {res.data?.questions.map((r, i) => {
            const total = Object.values(r.counts).reduce((a, b) => a + b, 0);
            const keys = r.question.type === 'RATING' ? ['1', '2', '3', '4', '5'] : r.question.options;
            return (
              <Paper key={r.question.id} sx={{ p: 2.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Q{i + 1}. {r.question.text}
                  {r.question.required && <Typography component="span" color="error"> *</Typography>}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {tr(QUESTION_TYPE[r.question.type])}
                  {r.average !== null && tr(' · 평균 {0}점', { 0: r.average.toFixed(2) })}
                </Typography>
                {r.question.type === 'TEXT' ? (
                  <Stack spacing={0.5} sx={{ mt: 1 }}>
                    {r.texts.length === 0 && <Typography variant="body2" color="text.secondary">{tr('답변이 없습니다')}</Typography>}
                    {r.texts.map((t, k) => (
                      <Typography key={k} variant="body2">
                        <b>{t.studentName}</b> — {t.text}
                      </Typography>
                    ))}
                  </Stack>
                ) : (
                  <Stack spacing={1} sx={{ mt: 1 }}>
                    {keys.map((k) => {
                      const n = r.counts[k] ?? 0;
                      return (
                        <Box key={k}>
                          <Typography variant="body2">
                            {r.question.type === 'RATING' ? tr('{0}점', { 0: k }) : k}{' '}{tr('· {0}명{1}', { 0: n, 1: total ? ` (${Math.round((n / total) * 100)}%)` : '' })}
                          </Typography>
                          <LinearProgress variant="determinate" value={total ? (n / total) * 100 : 0} sx={{ height: 8, borderRadius: 4 }} />
                        </Box>
                      );
                    })}
                  </Stack>
                )}
              </Paper>
            );
          })}

          <Paper sx={{ p: 2.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {tr('미응답 {0}명', { 0: res.data?.nonRespondents.length ?? 0 })}
            </Typography>
            <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
              {res.data?.nonRespondents.map((n, k) => <Chip key={k} size="small" label={n} variant="outlined" />)}
            </Stack>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mt: 2 }}>
              {tr('응답자 {0}명', { 0: res.data?.respondents.length ?? 0 })}
            </Typography>
            <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
              {res.data?.respondents.map((r) => <Chip key={r.studentId} size="small" label={`${r.studentName} (${r.guardianName})`} title={dateTime(r.submittedAt)} />)}
            </Stack>
          </Paper>
        </Stack>
      )}
    </>
  );
}
