'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from './api';
import type { Session } from './types';
import { isManager } from './format';

async function fetchSession(): Promise<Session> {
  const res = await fetch('/api/auth/session', { cache: 'no-store' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ code: 'UNAUTHENTICATED', message: '로그인이 필요합니다' }));
    throw new ApiError(res.status, err.code, err.message);
  }
  return res.json();
}

export function useSession() {
  const q = useQuery({ queryKey: ['session'], queryFn: fetchSession, staleTime: 5 * 60_000 });
  const role = q.data?.institution?.role;
  return { ...q, session: q.data, role, manager: isManager(role) };
}

export function useSwitchInstitution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (institutionId: string) => {
      const res = await fetch('/api/auth/session', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ institutionId }),
      });
      if (!res.ok) throw new ApiError(res.status, 'FORBIDDEN', '기관을 바꿀 수 없습니다');
      return (await res.json()) as Session;
    },
    // 기관이 바뀌면 모든 데이터가 달라지므로 캐시 전체 초기화
    onSuccess: (s) => {
      qc.clear();
      qc.setQueryData(['session'], s);
    },
  });
}

export async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
  window.location.href = '/login';
}
