'use client';

import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import { useSession, useSwitchInstitution } from '@/lib/session';

interface SampleInfo { sample: { institutionId: string; name: string } | null }

export function useSampleInstitution() {
  return useQuery({ queryKey: ['sample-institution'], queryFn: () => api.get<SampleInfo>('sample-institution'), staleTime: 5 * 60_000 });
}

/** ONB-003 체험 기관 만들기 → 바로 전환 */
export function useStartSample() {
  const qc = useQueryClient();
  const switchInst = useSwitchInstitution();
  return useMutation({
    mutationFn: async () => {
      const r = await api.post<{ institutionId: string; name: string }>('sample-institution');
      await switchInst.mutateAsync(r.institutionId);
      return r;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['sample-institution'] });
      window.location.href = '/dashboard';
    },
  });
}

/** 대시보드 상단: 체험 기관이면 안내·종료, 실제 기관이고 아직 체험 전이면 체험 권유(원생이 없을 때만) */
export default function SampleModeBanner({ empty }: { empty: boolean }) {
  const { session } = useSession();
  const sample = useSampleInstitution();
  const start = useStartSample();
  const switchInst = useSwitchInstitution();
  const [error, setError] = useState<string | null>(null);
  const current = session?.institution?.institutionId;
  const mine = sample.data?.sample;
  const inSample = !!mine && mine.institutionId === current;
  const others = (session?.user.memberships ?? []).filter((m) => m.institutionId !== mine?.institutionId);

  async function end() {
    if (!mine || !window.confirm('체험을 마칠까요? 체험 기관과 예시 데이터에는 더 이상 들어갈 수 없습니다.')) return;
    setError(null);
    try {
      await api.delete(`sample-institution/${mine.institutionId}`);
      const back = others[0];
      if (back) {
        await fetch('/api/auth/session', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ institutionId: back.institutionId, refresh: true }) });
      }
      window.location.href = '/dashboard';
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  if (inSample) {
    return (
      <Alert
        severity="info"
        sx={{ mb: 2 }}
        action={
          <Stack direction="row" spacing={1}>
            {others[0] && <Button size="small" onClick={() => switchInst.mutate(others[0].institutionId)}>내 기관으로</Button>}
            <Button size="small" color="inherit" onClick={() => void end()}>체험 끝내기</Button>
          </Stack>
        }
      >
        체험용 샘플 기관입니다. 예시 반·원생·지난 2주 출결이 들어 있어 마음껏 눌러 봐도 실제 기관에는 영향이 없습니다. 학부모 알림은 실제로 나가지 않습니다(예시 원생에 보호자가 없음).
        {error && <><br />{error}</>}
      </Alert>
    );
  }
  if (!empty || sample.isLoading || mine) return null;
  return (
    <Alert
      severity="success"
      sx={{ mb: 2 }}
      action={<Button size="small" color="inherit" disabled={start.isPending} onClick={() => start.mutate()}>샘플로 체험하기</Button>}
    >
      아직 원생이 없네요. 실제 데이터를 넣기 전에 예시 데이터가 채워진 체험 기관에서 기능을 먼저 둘러볼 수 있습니다.
      {start.isError && <><br />{errorMessage(start.error)}</>}
    </Alert>
  );
}
