'use client';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import NextLink from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import type { Survey } from '@/lib/comm';
import { dateTime } from '@/lib/format';
import { useSession } from '@/lib/session';
import PageHeader from '@/components/PageHeader';
import { useT } from '@/lib/i18n';
import Box from '@mui/material/Box';
import StatusBadge from '@/components/ui/StatusBadge';
import ProgressBar from '@/components/ui/ProgressBar';
import EmptyState from '@/components/ui/EmptyState';
import { color } from '@/theme/tokens';

/** NTC-010 설문 목록 */
export default function SurveysView() {
  const t = useT();
  const { session } = useSession();
  const instId = session?.institution?.institutionId;
  const list = useQuery({ queryKey: ['surveys', instId], queryFn: () => api.get<Survey[]>('surveys', { size: 50 }), enabled: !!instId });

  return (
    <>
      <PageHeader
        title={t('설문')}
        menuId="NTC-010"
        description={t('학부모에게 설문을 보내고 응답을 모아 봅니다. 응답은 원생(자녀)별로 한 번씩 받습니다.')}
        actions={
          <Button variant="contained" startIcon={<AddIcon />} component={NextLink} href="/surveys/new">
            {t('설문 만들기')}
          </Button>
        }
      />
      {list.isError && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage(list.error)}</Alert>}
      {list.isFetching && !list.data && <LinearProgress />}
      {list.data?.length === 0 && (
        <Paper>
          <EmptyState title={t('만든 설문이 없습니다')} action={<Button variant="outlined" startIcon={<AddIcon />} component={NextLink} href="/surveys/new">{t('설문 만들기')}</Button>} />
        </Paper>
      )}
      <Box component="ul" aria-label={t('설문 목록')} sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 2 }}>
        {list.data?.map((s) => {
          const rate = s.recipients ? Math.min(100, (s.responses / s.recipients) * 100) : 0;
          return (
            <Box component="li" key={s.id}>
              <Paper
                component={NextLink}
                href={`/surveys/${s.id}`}
                sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, px: 2.5, py: 2, height: '100%', boxSizing: 'border-box', color: 'inherit', textDecoration: 'none', '&:hover': { borderColor: color.borderStrong }, '&:focus-visible': { outline: `2px solid ${color.primary}`, outlineOffset: 2 } }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                  <Typography sx={{ flex: 1, fontSize: 15, fontWeight: 700 }}>{s.title}</Typography>
                  <StatusBadge kind={s.status === 'OPEN' ? 'checkedIn' : 'ended'} label={s.status === 'OPEN' ? t('진행 중') : t('마감')} />
                </Box>
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                  {[s.closesAt ? t('마감 {0}', { 0: dateTime(s.closesAt) }) : null, s.author.name].filter(Boolean).join(' · ')}
                </Typography>
                <Box sx={{ mt: 'auto' }}>
                  <Typography sx={{ fontSize: 13, mb: 0.5 }}>
                    {t('{0}/{1}명 · {2}%', { 0: s.responses, 1: s.recipients, 2: Math.round(rate) })}
                  </Typography>
                  <ProgressBar value={rate} tone="info" label={t('응답률')} />
                </Box>
              </Paper>
            </Box>
          );
        })}
      </Box>
    </>
  );
}
