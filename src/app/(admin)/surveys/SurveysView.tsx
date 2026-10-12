'use client';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import type { Survey } from '@/lib/comm';
import { dateTime } from '@/lib/format';
import { useSession } from '@/lib/session';
import PageHeader from '@/components/PageHeader';
import { useT } from '@/lib/i18n';

/** NTC-010 설문 목록 */
export default function SurveysView() {
  const t = useT();
  const router = useRouter();
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
      <Paper>
        {list.isFetching && <LinearProgress />}
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('제목')}</TableCell>
              <TableCell>{t('상태')}</TableCell>
              <TableCell>{t('마감')}</TableCell>
              <TableCell sx={{ width: 180 }}>{t('응답')}</TableCell>
              <TableCell>{t('작성')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {list.data?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  {t('만든 설문이 없습니다')}
                </TableCell>
              </TableRow>
            )}
            {list.data?.map((s) => (
              <TableRow key={s.id} hover sx={{ cursor: 'pointer' }} onClick={() => router.push(`/surveys/${s.id}`)}>
                <TableCell sx={{ fontWeight: 600 }}>{s.title}</TableCell>
                <TableCell>
                  <Chip size="small" label={s.status === 'OPEN' ? t('진행 중') : t('마감')} color={s.status === 'OPEN' ? 'primary' : 'default'} />
                </TableCell>
                <TableCell>{s.closesAt ? dateTime(s.closesAt) : '-'}</TableCell>
                <TableCell>
                  <Typography variant="caption">
                    {t('{0}/{1}명 · {2}%', { 0: s.responses, 1: s.recipients, 2: s.recipients ? Math.round((s.responses / s.recipients) * 100) : 0 })}
                  </Typography>
                  <LinearProgress variant="determinate" value={s.recipients ? Math.min(100, (s.responses / s.recipients) * 100) : 0} sx={{ height: 5, borderRadius: 3 }} />
                </TableCell>
                <TableCell>{s.author.name}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </>
  );
}
