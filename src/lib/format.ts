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

export const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const;
export const DAY_LABEL: Record<string, string> = { MONDAY: '월', TUESDAY: '화', WEDNESDAY: '수', THURSDAY: '목', FRIDAY: '금', SATURDAY: '토', SUNDAY: '일' };

/** ["MONDAY","WEDNESDAY"] → "월·수" (요일 순서대로) */
export const dayList = (days: string[]) =>
  DAYS.filter((d) => days.includes(d))
    .map((d) => DAY_LABEL[d])
    .join('·');

/** 백엔드 LocalTime("14:00" 또는 "14:00:00") → "14:00" */
export const hm = (t?: string | null) => (t ? t.slice(0, 5) : '-');
