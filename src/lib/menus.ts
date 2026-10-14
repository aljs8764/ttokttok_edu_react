'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';

export interface InstitutionMenus {
  menuGroupId: string | null;
  menuGroupName: string | null;
  /** 끈 메뉴 키 (관리자 웹 경로) */
  disabledMenus: string[];
}

const NONE = new Set<string>();

/** SAAS-008 현재 기관의 메뉴 그룹에서 끈 메뉴. 그룹이 없거나 아직 못 읽었으면 모두 켜진 것으로 본다 */
export function useDisabledMenus() {
  const { session } = useSession();
  const instId = session?.institution?.institutionId;
  const q = useQuery({
    queryKey: ['institution-menus', instId],
    queryFn: () => api.get<InstitutionMenus>('institution/menus'),
    enabled: !!instId,
    staleTime: 5 * 60_000,
    retry: false,
  });
  return { disabled: q.data ? new Set(q.data.disabledMenus) : NONE, loaded: q.isSuccess || q.isError || !instId };
}

export interface MenuGroup {
  id: string;
  name: string;
  description: string | null;
  disabledMenus: string[];
  institutions: { id: string; name: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface PlatformAdmin {
  userId: string;
  name: string;
  email: string | null;
  createdAt: string;
}
