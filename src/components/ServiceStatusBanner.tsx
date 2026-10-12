'use client';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import { useT } from '@/lib/i18n';

/** SAAS-001 승인 대기·정지 기관 안내. 이 상태에서는 업무 화면이 막히고 문의하기만 된다 */
export default function ServiceStatusBanner() {
  const t = useT();
  const { session, manager } = useSession();
  const instId = session?.institution?.institutionId;
  const q = useQuery({
    queryKey: ['service-status', instId],
    queryFn: () => api.get<{ status: 'PENDING' | 'ACTIVE' | 'SUSPENDED'; reason: string | null }>('institution/service-status'),
    enabled: !!instId,
    staleTime: 60_000,
    refetchInterval: (query) => (query.state.data?.status === 'PENDING' ? 60_000 : false),
    retry: false,
  });
  const s = q.data;
  if (!s || s.status === 'ACTIVE') return null;
  const action = manager ? <Button color="inherit" size="small" component={Link} href="/support">{t('문의하기')}</Button> : undefined;
  if (s.status === 'PENDING') {
    return (
      <Alert severity="warning" sx={{ mb: 2 }} action={action}>
        {t('가입 승인 대기 중입니다. 운영팀이 확인하면 모든 기능을 쓸 수 있고, 그동안 다른 화면은 열리지 않습니다.')}
      </Alert>
    );
  }
  return (
    <Alert severity="error" sx={{ mb: 2 }} action={action}>
      {t('서비스 이용이 정지된 기관입니다{0}. 운영팀에 문의해 주세요.', { 0: s.reason ? ` (${s.reason})` : '' })}
    </Alert>
  );
}
