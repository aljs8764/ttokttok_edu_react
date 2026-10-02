import dayjs from 'dayjs';
import type { AttendanceStatus, Role } from './types';

export const ROLE_LABEL: Record<Role, string> = { OWNER: '원장', ADMIN: '실장', TEACHER: '교사', PARENT: '학부모' };

export const isManager = (role?: Role | null) => role === 'OWNER' || role === 'ADMIN';

type ChipColor = 'default' | 'success' | 'error' | 'warning' | 'info' | 'primary';

/** IA 상태 5종(등원/하원/결석/지각/조퇴)을 상태 4개 + 플래그 2개에서 표시용으로 */
export function attendanceLabel(status: AttendanceStatus, isLate = false, isEarlyLeave = false): { label: string; color: ChipColor } {
  switch (status) {
    case 'SCHEDULED':
      return { label: '등원 예정', color: 'default' };
    case 'ABSENT':
      return { label: '결석', color: 'error' };
    case 'IN':
      return isLate ? { label: '등원(지각)', color: 'warning' } : { label: '등원', color: 'success' };
    case 'OUT':
      if (isEarlyLeave) return { label: isLate ? '하원(지각·조퇴)' : '하원(조퇴)', color: 'warning' };
      return isLate ? { label: '하원(지각)', color: 'warning' } : { label: '하원', color: 'info' };
  }
}

export const STATUS_OPTIONS: { value: AttendanceStatus; label: string }[] = [
  { value: 'IN', label: '등원' },
  { value: 'OUT', label: '하원' },
  { value: 'ABSENT', label: '결석' },
];

export const time = (iso?: string | null) => (iso ? dayjs(iso).format('HH:mm') : '-');
export const dateTime = (iso?: string | null) => (iso ? dayjs(iso).format('M/D HH:mm') : '-');
export const percent = (v?: number | null) => (v === null || v === undefined ? '-' : `${v.toFixed(1)}%`);
