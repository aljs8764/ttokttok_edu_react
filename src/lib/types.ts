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

export type WithdrawalReason = 'MOVING' | 'GRADES' | 'OTHER_ACADEMY' | 'SCHEDULE' | 'COST' | 'GRADUATION' | 'OTHER';

/** STU-006 원생 상세 */
export interface StudentDetail {
  student: Student;
  memo: string | null;
  classHistory: { classroomId: string; classroomName: string; fromDate: string; toDate: string | null }[];
  statusHistory: { from: StudentStatus | null; to: StudentStatus; reason: WithdrawalReason | null; effectiveDate: string; note: string | null }[];
  siblings: { studentId: string; name: string }[];
}

/** STU-002 엑셀 업로드 검증 결과 */
export interface ImportResult {
  jobId: string;
  totalRows: number;
  validRows: number;
  errors: { rowNumber: number; column: string; message: string }[];
  committed: boolean;
}

/** STU-004 가입 대기자 */
export type JoinRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface JoinRequest {
  id: string;
  childName: string;
  birthDate: string;
  guardianName: string;
  guardianPhone: string;
  relation: string | null;
  status: JoinRequestStatus;
  submittedAt: string;
}

// ───────── 교직원 ─────────

export interface StaffMember {
  userId: string;
  name: string;
  email: string;
  role: Role;
  title: string | null;
  classrooms: { id: string; name: string }[];
}

export type StaffInvitationStatus = 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';

export interface StaffInvitation {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: StaffInvitationStatus;
  expiresAt: string;
  acceptedAt: string | null;
}

export interface PublicStaffInvitation {
  institutionName: string;
  name: string;
  email: string;
  role: Role;
  existingAccount: boolean;
  expiresAt: string;
}

// ───────── 알림장·행사 공통 ─────────

export type TargetScope = 'ALL' | 'CLASS' | 'STUDENT';

/** 발송 대상. 요청은 {scope, id}, 응답은 name 까지 */
export interface Target {
  scope: TargetScope;
  id: string | null;
  name?: string;
}

export interface FileRef {
  id: string;
  name: string;
  mime: string;
  size: number;
  downloadUrl: string | null;
}

export interface ReadStats {
  targetStudents: number;
  readStudents: number;
  rate: number | null;
}

// ───────── 알림장 (NTC) ─────────

export type NoticeKind = 'NOTE' | 'ANNOUNCEMENT';
export type NoticeStatus = 'SCHEDULED' | 'SENT' | 'CANCELED';

export interface Notice {
  id: string;
  kind: NoticeKind;
  title: string;
  body: string;
  pinned: boolean;
  targets: Target[];
  status: NoticeStatus;
  scheduledAt: string | null;
  sentAt: string | null;
  lastResentAt: string | null;
  author: { id: string; name: string };
  createdAt: string;
  readStats: ReadStats | null;
  attachments: FileRef[];
}

export interface NoticeReceipts {
  noticeId: string;
  stats: ReadStats;
  canResendAt: string | null;
  students: {
    studentId: string;
    studentName: string;
    classroomNames: string[];
    read: boolean;
    firstReadAt: string | null;
    resentCount: number;
    appLinked: boolean;
    guardians: { userId: string; name: string; deliveredAt: string | null; readAt: string | null }[];
  }[];
}

// ───────── 행사 (EVT) ─────────

export interface Tally {
  targets: number;
  attend: number;
  absent: number;
  pending: number;
}

export interface SchoolEvent {
  id: string;
  title: string;
  body: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string | null;
  targets: Target[];
  rsvpEnabled: boolean;
  rsvpDeadline: string | null;
  reminderHoursBefore: number | null;
  remindedAt: string | null;
  status: 'ACTIVE' | 'CANCELED';
  authorName: string;
  createdAt: string;
  tally: Tally | null;
}

export interface EventSummary {
  event: SchoolEvent;
  tally: Tally;
  rows: {
    studentId: string;
    studentName: string;
    classroomNames: string[];
    answer: 'ATTEND' | 'ABSENT' | null;
    reason: string | null;
    respondedAt: string | null;
    respondedByName: string | null;
  }[];
}
