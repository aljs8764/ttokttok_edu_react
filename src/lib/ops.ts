import { translate } from '@/lib/i18n';
// Phase 2 ③ 원생·학급·일정 응답 타입 (STU-009~011, CLS-003·004, STF-004, EVT-002·006)

export interface Health {
  studentId: string;
  allergies: string | null;
  conditions: string | null;
  notes: string | null;
  updatedBy: string | null;
  updatedAt: string | null;
}

export interface CounselNote {
  id: string;
  studentId: string;
  studentName: string;
  author: { id: string; name: string };
  occurredOn: string;
  body: string;
  parentVisible: boolean;
  createdAt: string;
}

export interface StudentTag {
  id: string;
  name: string;
  color: string | null;
  studentCount: number;
}

export interface Slot {
  id: string;
  classroomId: string;
  classroomName: string;
  /** 1=월 … 7=일 */
  weekday: number;
  startTime: string;
  endTime: string;
  subject: string | null;
  room: string | null;
  teacher: { id: string; name: string | null } | null;
}

export type WaitlistStatus = 'WAITING' | 'ENROLLED' | 'CANCELLED';
export const WAITLIST_STATUS: Record<WaitlistStatus, { label: string; color: 'warning' | 'success' | 'default' }> = {
  WAITING: { label: '대기', color: 'warning' },
  ENROLLED: { label: '등록 완료', color: 'success' },
  CANCELLED: { label: '취소', color: 'default' },
};

export interface WaitlistEntry {
  id: string;
  classroomId: string;
  classroomName: string;
  studentName: string;
  guardianName: string | null;
  phone: string;
  memo: string | null;
  status: WaitlistStatus;
  contactedAt: string | null;
  createdAt: string;
  position: number | null;
}

export interface Vacancy {
  classroomId: string;
  classroomName: string;
  capacity: number;
  enrolled: number;
  waiting: number;
  vacancy: number;
}

export interface StaffRecord {
  id: string;
  userId: string;
  userName: string;
  workDate: string;
  checkIn: string;
  checkOut: string | null;
  workedMinutes: number | null;
}

export interface StaffMonthly {
  userId: string;
  userName: string;
  days: number;
  totalMinutes: number;
  records: StaffRecord[];
}

export interface EventTemplate {
  id: string;
  name: string;
  title: string;
  body: string | null;
  location: string | null;
  startTime: string;
  durationMinutes: number;
  targets: { scope: 'ALL' | 'CLASS' | 'STUDENT'; id: string | null }[];
  rsvpEnabled: boolean;
  rsvpDeadlineDaysBefore: number | null;
  reminderHoursBefore: number | null;
  createdBy: string;
  updatedAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  status: string;
  rsvpEnabled: boolean;
}

export const WEEKDAY = ['', '월', '화', '수', '목', '금', '토', '일'];
export const hours = (min: number) => translate('{0}시간 {1}분', { 0: Math.floor(min / 60), 1: min % 60 });
