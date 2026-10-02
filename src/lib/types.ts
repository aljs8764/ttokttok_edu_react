// 백엔드 응답 타입 (ttokttok-backend README의 API 표 기준)

export type Role = 'OWNER' | 'ADMIN' | 'TEACHER' | 'PARENT';

export interface Membership {
  institutionId: string;
  institutionName: string;
  role: Role;
}

export interface SessionUser {
  id: string;
  name: string;
  mustChangePassword: boolean;
  memberships: Membership[];
}

export interface Session {
  user: SessionUser;
  institution: Membership | null;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

export interface Page<T> {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

// ───────── 출결 ─────────

export type AttendanceStatus = 'SCHEDULED' | 'IN' | 'OUT' | 'ABSENT';

export interface Attendance {
  dayId: string | null;
  studentId: string;
  studentName: string;
  classroomId: string;
  date: string;
  status: AttendanceStatus;
  isLate: boolean;
  isEarlyLeave: boolean;
  checkInAt: string | null;
  checkOutAt: string | null;
  nextDestinationId: string | null;
  nextDestinationName: string | null;
  absenceReason: string | null;
}

export interface AttendanceCounts {
  total: number;
  scheduled: number;
  present: number;
  checkedOut: number;
  absent: number;
  late: number;
  earlyLeave: number;
  attendanceRate: number | null;
}

export interface ClassDailySummary {
  classroomId: string;
  classroomName: string;
  startTime: string;
  endTime: string;
  heldToday: boolean;
  counts: AttendanceCounts;
  rows: Attendance[];
}

export interface DailyReport {
  date: string;
  classes: ClassDailySummary[];
}

export interface MonthlyCell {
  date: string;
  dayId: string;
  mark: 'O' | '△' | 'X' | '';
  isLate: boolean;
  isEarlyLeave: boolean;
  absenceReason: string | null;
  evidenceFileId: string | null;
}

export interface MonthlyRow {
  studentId: string;
  studentName: string;
  present: number;
  partial: number;
  absent: number;
  remarks: string;
  cells: MonthlyCell[];
}

export interface MonthlyAttendance {
  classroomId: string;
  classroomName: string;
  month: string;
  classDays: string[];
  rows: MonthlyRow[];
}

// ───────── 대시보드 ─────────

export interface DashboardStudentItem {
  dayId: string;
  studentId: string;
  studentName: string;
  classroomId: string;
  classroomName: string;
  status: AttendanceStatus;
  classStartTime: string;
  checkInAt: string | null;
  minutesLate: number | null;
  absenceReason: string | null;
}

export interface DashboardToday {
  date: string;
  asOf: string;
  kpi: AttendanceCounts & { excusedAbsent: number; notArrived: number; noticeReadRate: number | null };
  widgets: {
    notArrived: DashboardStudentItem[];
    late: DashboardStudentItem[];
    absent: DashboardStudentItem[];
  };
}

export interface TimelineEntry {
  eventId: string;
  studentId: string;
  studentName: string;
  classroomId: string | null;
  classroomName: string | null;
  type: 'CHECK_IN' | 'CHECK_OUT' | 'STATUS_CHANGE';
  fromStatus: AttendanceStatus;
  toStatus: AttendanceStatus;
  isLate: boolean;
  destinationName: string | null;
  reason: string | null;
  actorName: string;
  source: 'TEACHER_APP' | 'ADMIN_WEB' | 'SYSTEM';
  occurredAt: string;
}

export interface ScheduleItem {
  kind: 'EVENT' | 'RSVP_DEADLINE' | 'NOTICE_SCHEDULED';
  at: string;
  title: string;
  refId: string;
  detail: string | null;
}

// ───────── 반·원생 ─────────

export interface Classroom {
  id: string;
  name: string;
  capacity: number;
  days: string[];
  startTime: string;
  endTime: string;
  teacherIds: string[];
  headcount: number | null;
  teacherNames: string[] | null;
}

export type StudentStatus = 'ACTIVE' | 'PAUSED' | 'WITHDRAWN';

export interface Guardian {
  id: string;
  phone: string;
  relation: string | null;
  isPrimary: boolean;
  linkStatus: 'PENDING' | 'LINKED' | 'UNLINKED';
}

export interface Student {
  id: string;
  name: string;
  birthDate: string | null;
  grade: string | null;
  status: StudentStatus;
  classroomIds: string[];
  guardians: Guardian[];
}
