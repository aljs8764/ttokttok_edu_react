import type { AttendanceStatus } from '@/lib/types';
import type { Tone } from './tokens';

/**
 * 상태 → 배지 톤 매핑 (한 곳에서 관리). 디자인 기준:
 * 등원 green · 하원 blue · 지각·조퇴·미납 amber · 결석·연체·위험 red · 미등원·탑승·종료 gray · 미응답·고정 coral
 */
export type StatusKind =
  | 'checkedIn' | 'checkedOut'
  | 'late' | 'earlyLeave' | 'unpaid' | 'caution'
  | 'absent' | 'overdue' | 'risk'
  | 'scheduled' | 'boarded' | 'ended' | 'neutral'
  | 'noResponse' | 'pinned'
  | 'done' | 'info';

export const STATUS_TONE: Record<StatusKind, Tone> = {
  checkedIn: 'green',
  done: 'green',
  checkedOut: 'blue',
  info: 'blue',
  late: 'amber',
  earlyLeave: 'amber',
  unpaid: 'amber',
  caution: 'amber',
  absent: 'red',
  overdue: 'red',
  risk: 'red',
  scheduled: 'gray',
  boarded: 'gray',
  ended: 'gray',
  neutral: 'gray',
  noResponse: 'coral',
  pinned: 'coral',
};

/** 출결 상태(상태 4 + 플래그 2) → 배지 종류 */
export function attendanceKind(status: AttendanceStatus, isLate = false, isEarlyLeave = false): StatusKind {
  switch (status) {
    case 'SCHEDULED':
      return 'scheduled';
    case 'ABSENT':
      return 'absent';
    case 'IN':
      return isLate ? 'late' : 'checkedIn';
    case 'OUT':
      return isEarlyLeave || isLate ? 'earlyLeave' : 'checkedOut';
  }
}

/** MUI 색 이름(기존 화면 코드의 color 값) → 배지 톤 */
export const MUI_COLOR_TONE: Record<string, Tone> = {
  default: 'gray',
  primary: 'blue',
  secondary: 'coral',
  success: 'green',
  info: 'blue',
  warning: 'amber',
  error: 'red',
};
