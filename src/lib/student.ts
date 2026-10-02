import type { StudentStatus, WithdrawalReason } from './types';

type Color = 'success' | 'warning' | 'default' | 'error' | 'info';

export const STUDENT_STATUS: Record<StudentStatus, { label: string; color: Color }> = {
  ACTIVE: { label: '재원', color: 'success' },
  PAUSED: { label: '휴원', color: 'warning' },
  WITHDRAWN: { label: '퇴원', color: 'default' },
};

export const LINK_STATUS: Record<string, { label: string; color: Color }> = {
  LINKED: { label: '앱 연결', color: 'success' },
  PENDING: { label: '설치 대기', color: 'warning' },
  UNLINKED: { label: '연결 해제', color: 'default' },
};

export const WITHDRAWAL_REASON: Record<WithdrawalReason, string> = {
  MOVING: '이사',
  GRADES: '성적',
  OTHER_ACADEMY: '타 학원 이동',
  SCHEDULE: '시간 안 맞음',
  COST: '비용',
  GRADUATION: '졸업',
  OTHER: '기타',
};

export const RELATIONS = ['어머니', '아버지', '할머니', '할아버지', '기타'];

/** 입력 중 휴대폰 번호를 010-1234-5678 형태로 */
export function formatPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length < 4) return d;
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, d.length - 4)}-${d.slice(-4)}`;
}

export const isMobile = (v: string) => /^01[016789]\d{7,8}$/.test(v.replace(/\D/g, ''));
